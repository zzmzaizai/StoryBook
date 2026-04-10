import { createPipelineStage } from './workspace-pipeline-stage-utils.js'

export function buildTimelinePipelineStage(novelInfo, rolesStage) {
  const chapterCount = Number(novelInfo.estimated_chapter_count || 0)
  const chunkSize = chapterCount > 24 ? 6 : 5
  const segmentCount = chapterCount > 0 ? Math.max(1, Math.ceil(chapterCount / chunkSize)) : 3
  const roleReady = rolesStage.items.some((task) => task.status === 'running' || task.status === 'review' || task.status === 'completed')
  const items = Array.from({ length: segmentCount }, (_, index) => {
    const start = chapterCount > 0 ? index * chunkSize + 1 : index * 4 + 1
    const end = chapterCount > 0 ? Math.min(chapterCount, start + chunkSize - 1) : start + 3
    let status = 'queued'
    let source = chapterCount > 0 ? '等待生成' : '缺少目标章节数'
    if (roleReady && chapterCount > 0) {
      status = index === 0 ? 'completed' : index === 1 ? 'running' : 'queued'
      source = status === 'completed' ? '已写入时间线' : status === 'running' ? 'AI 生成中' : '待执行'
    }
    return {
      key: `timeline-${index + 1}`,
      label: `第 ${start} - ${end} 章`,
      summary: index === 0 ? '建立主冲突与核心人物位置，完成故事起势。' : index === 1 ? '加速冲突升级，安排关键反转与关系重排。' : '为后续阶段预留高潮节点、回收线索与结局落点。',
      source,
      status,
      tags: index === 0 ? ['铺垫', '立势'] : index === 1 ? ['冲突升级', '反转'] : ['高潮', '回收'],
    }
  })
  return createPipelineStage('timeline', '小说时间线', '按目标章节数拆分剧情推进节奏与事件段。', 'timeline', 'timeline', items)
}

export function renderTimelinePipelineStage(items) {
  if (items.length === 0) return renderEmpty()
  return `
    <div class="pipeline-task-list">
      ${items.map((item) => `
        <div class="pipeline-task-row">
          <div class="pipeline-task-row__main">
            <div class="pipeline-task-row__title-wrap">
              <span class="pipeline-status-dot pipeline-status-dot--${item.status}"></span>
              <strong>${escapeHtml(item.label)}</strong>
              <span class="pipeline-source-chip">${escapeHtml(item.source || '自动处理')}</span>
            </div>
            <p>${escapeHtml(item.summary || '')}</p>
            ${item.tags?.length ? `<div class="pipeline-tag-row">${item.tags.map((tag) => `<span class="pipeline-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          </div>
          <div class="pipeline-task-row__side">
            <span class="pipeline-status-badge pipeline-status-badge--${item.status}">${getStatusLabel(item.status)}</span>
            <div class="pipeline-task-row__actions">
              <button type="button" class="btn btn-secondary btn-sm" data-stage-action="view">查看</button>
              <button type="button" class="btn btn-secondary btn-sm" data-stage-action="retry">重跑</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `
}

function renderEmpty() {
  return `<div class="empty-state pipeline-empty-state"><div class="empty-state-title">当前筛选下没有结果</div><div class="empty-state-desc">切换筛选条件，或关闭“只看待确认”查看全部步骤。</div></div>`
}

function getStatusLabel(status) {
  switch (status) {
    case 'completed': return '已完成'
    case 'running': return '进行中'
    case 'paused': return '已暂停'
    case 'review': return '待确认'
    case 'error': return '失败'
    default: return '待执行'
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
