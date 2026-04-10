export function createPipelineStage(key, title, desc, iconName, display, items) {
  const counts = summarizeItems(items)
  return {
    key,
    title,
    desc,
    iconName,
    display,
    status: resolveStageStatus(items, counts),
    counts,
    progressText: `${counts.completed} / ${items.length}`,
    progressPercent: items.length > 0 ? Math.round((counts.completed / items.length) * 100) : 0,
    currentLabel: items.find((item) => item.status === 'running')?.label || items.find((item) => item.status === 'review')?.label || items.find((item) => item.status === 'queued')?.label || '已全部完成',
    reviewItems: items.filter((item) => item.status === 'review'),
    items,
    logs: buildStageLogs(title, items),
  }
}

function summarizeItems(items) {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, { completed: 0, queued: 0, running: 0, paused: 0, review: 0, error: 0 })
}

function resolveStageStatus(items, counts) {
  if (counts.error > 0) return 'error'
  if (counts.running > 0) return 'running'
  if (counts.review > 0) return 'paused'
  if (counts.completed === items.length && items.length > 0) return 'completed'
  return 'queued'
}

function buildStageLogs(stageTitle, items) {
  const logs = []
  items.forEach((item, index) => {
    if (item.status === 'completed') logs.push({ time: `14:0${index + 1}`, type: '完成', message: `${stageTitle}已完成“${item.label}”处理。` })
    if (item.status === 'running') logs.push({ time: `14:1${index}`, type: '处理中', message: `正在处理“${item.label}”，输出会在当前阶段完成后写入。` })
    if (item.status === 'review') logs.push({ time: `14:2${index}`, type: '待确认', message: `“${item.label}”已生成候选内容，等待人工确认。` })
    if (item.status === 'paused') logs.push({ time: `14:3${index}`, type: '暂停', message: `“${item.label}”已暂停，可稍后从当前步骤继续。` })
  })
  return logs.slice(0, 6)
}
