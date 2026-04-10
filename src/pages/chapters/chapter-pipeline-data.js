export function getChapterPipelineStatus(chapter) {
  if (!chapter) return 'queued'
  if (chapter.status === 44) return 'error'
  if (chapter.status >= 10) return 'completed'
  if (chapter.status >= 7) return 'paused'
  if (chapter.status >= 3) return 'review'
  const wordCount = Number(chapter.word_count || chapter.content?.length || 0)
  if (wordCount > 0) return 'running'
  return 'queued'
}

export function getChapterPipelineStatusLabel(chapter) {
  switch (getChapterPipelineStatus(chapter)) {
    case 'completed': return '流程完成'
    case 'running': return '流水线进行中'
    case 'review': return '待校对确认'
    case 'paused': return '润色暂停'
    case 'error': return '处理异常'
    default: return '未启动流程'
  }
}

export function buildChapterPipelineEntries(chapters) {
  return (chapters || []).map((chapter) => {
    const status = getChapterPipelineStatus(chapter)
    const currentStep = getCurrentStep(status)
    const progress = getProgress(status)
    return {
      chapterId: chapter.id,
      label: `第 ${chapter.chapter_number || '--'} 章 ${chapter.chapter_name || '未命名章节'}`,
      summary: buildSummary(chapter, status),
      source: `${formatWordCount(chapter.word_count || 0)} | ${currentStep}`,
      status,
      currentStep,
      progressText: progress.text,
      progressPercent: progress.percent,
      updatedAt: getUpdatedAt(status),
      tags: buildTags(status),
    }
  })
}

function buildSummary(chapter, status) {
  if (status === 'completed') return '正文、校对与润色均已完成，可直接进入确认或导出。'
  if (status === 'paused') return '已进入润色去 AI 味阶段，当前暂停等待继续执行。'
  if (status === 'review') return '正文已生成，等待执行审核校对与人工确认。'
  if (status === 'running') return '正在根据章节大纲扩写正文，并同步推进章节结构。'
  if (status === 'error') return '当前章节处理出现异常，建议查看日志后重试。'
  return '尚未进入自动化处理流程，可从章节大纲开始。'
}

function getCurrentStep(status) {
  switch (status) {
    case 'completed': return '已完成确认'
    case 'paused': return '润色去AI味'
    case 'review': return '审核校对'
    case 'running': return '扩写正文'
    case 'error': return '异常处理'
    default: return '章节大纲'
  }
}

function getProgress(status) {
  switch (status) {
    case 'completed': return { percent: 100, text: '4 / 4' }
    case 'paused': return { percent: 84, text: '3 / 4' }
    case 'review': return { percent: 72, text: '2 / 4' }
    case 'running': return { percent: 46, text: '1 / 4' }
    case 'error': return { percent: 56, text: '2 / 4' }
    default: return { percent: 0, text: '0 / 4' }
  }
}

function buildTags(status) {
  if (status === 'completed') return ['正文完成', '可确认']
  if (status === 'paused') return ['润色', '暂停中']
  if (status === 'review') return ['校对', '待确认']
  if (status === 'running') return ['扩写', '进行中']
  if (status === 'error') return ['异常', '需重试']
  return ['大纲', '待启动']
}

function getUpdatedAt(status) {
  switch (status) {
    case 'completed': return '12 分钟前'
    case 'paused': return '刚刚暂停'
    case 'review': return '3 分钟前'
    case 'running': return '实时处理中'
    case 'error': return '刚刚失败'
    default: return '未开始'
  }
}

function formatWordCount(count) {
  const numeric = Number(count || 0)
  if (numeric >= 10000) {
    return `${(numeric / 10000).toFixed(1)}万字`
  }
  return `${numeric}字`
}
