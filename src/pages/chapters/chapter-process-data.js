export function buildChapterProcessModel(chapter) {
  if (!chapter) return null

  const outlineReady = Boolean(String(chapter.chapter_name || '').trim())
  const contentLength = Number((chapter.content || '').length)
  const hasDraft = contentLength > 0
  const reviewIssues = hasDraft ? 3 : 0
  const polishReady = chapter.status >= 3 || hasDraft

  const steps = [
    {
      key: 'outline',
      order: 1,
      title: '章节大纲',
      desc: '基于时间线节点生成本章剧情骨架与关键转折。',
      status: outlineReady ? 'completed' : 'running',
      input: '上一章收束点 + 当前章节目标 + 时间线事件段',
      output: outlineReady ? `已生成 5 个剧情节点，锚定第 ${chapter.chapter_number || 1} 章推进目标。` : '正在整理本章冲突与节奏分配。',
      meta: outlineReady ? '2 分钟前完成' : '刚刚启动',
      actions: ['查看结果', '重新生成'],
    },
    {
      key: 'expand',
      order: 2,
      title: '扩写正文',
      desc: '根据章节大纲扩写正文并保留章节节奏。',
      status: hasDraft ? 'running' : 'queued',
      input: '已确认大纲 + 角色关系 + 当前风格设定',
      output: hasDraft ? `当前草稿约 ${contentLength} 字，已进入中段冲突推进。` : '等待大纲确认后开始扩写正文。',
      meta: hasDraft ? '实时生成中' : '等待执行',
      progressPercent: hasDraft ? Math.min(88, Math.max(24, Math.round((contentLength / 3200) * 100))) : 0,
      actions: hasDraft ? ['暂停', '查看输出'] : ['开始扩写'],
    },
    {
      key: 'review',
      order: 3,
      title: '审核校对',
      desc: '检查逻辑、病句、角色一致性与上下文衔接。',
      status: hasDraft ? 'review' : 'queued',
      input: '扩写后的章节草稿',
      output: hasDraft ? `发现 ${reviewIssues} 条待确认建议，包含逻辑与措辞问题。` : '等待正文草稿完成后执行校对。',
      meta: hasDraft ? '待人工确认后继续' : '等待执行',
      actions: hasDraft ? ['查看建议', '重新执行'] : ['等待上一步'],
    },
    {
      key: 'polish',
      order: 4,
      title: '润色去AI味',
      desc: '降低模板感，增强自然表达、人物语气与情绪起伏。',
      status: polishReady ? 'paused' : 'queued',
      input: '已校对版本 + 风格偏好',
      output: polishReady ? '已进入语言自然化阶段，等待继续执行。' : '等待校对通过后执行润色。',
      meta: polishReady ? '暂停于表达优化 62%' : '等待执行',
      actions: polishReady ? ['继续', '查看前后对比'] : ['等待上一步'],
    },
  ]

  return {
    chapterTitle: `第 ${chapter.chapter_number || 1} 章 ${chapter.chapter_name || '未命名章节'}`,
    status: chapter.status === 44 ? 'error' : hasDraft ? 'running' : 'queued',
    currentStep: steps.find((step) => step.status === 'running') || steps.find((step) => step.status === 'review') || steps[0],
    progressText: `${steps.filter((step) => step.status === 'completed').length} / ${steps.length}`,
    updatedAt: chapter.status === 44 ? '刚刚失败' : hasDraft ? '2 分钟前' : '尚未启动',
    steps,
    logs: buildLogs(steps),
  }
}

function buildLogs(steps) {
  const logs = steps.flatMap((step, index) => {
    const base = `14:${String(index * 3 + 8).padStart(2, '0')}`
    if (step.status === 'completed') {
      return [{ time: base, type: '完成', step: step.title, message: `${step.title} 已产出可继续使用的结果。` }]
    }
    if (step.status === 'running') {
      return [{ time: base, type: '处理中', step: step.title, message: `${step.title} 正在进行，产出会持续写入流程面板。` }]
    }
    if (step.status === 'review') {
      return [{ time: base, type: '待确认', step: step.title, message: `${step.title} 已输出建议，等待人工确认。` }]
    }
    if (step.status === 'paused') {
      return [{ time: base, type: '暂停', step: step.title, message: `${step.title} 已暂停，可从当前进度继续。` }]
    }
    return []
  }).slice(0, 6)

  if (logs.length === 0) {
    logs.push({ time: '--:--', type: '待开始', step: '章节大纲', message: '当前章节还没有进入自动化处理，保存后可从章节大纲开始。' })
  }

  return logs
}
