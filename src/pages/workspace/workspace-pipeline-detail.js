import { icon } from '../../lib/icons.js'
import { renderMetadataPipelineStage } from './workspace-pipeline-stage-meta.js'
import { renderRolesPipelineStage } from './workspace-pipeline-stage-roles.js'
import { renderTimelinePipelineStage } from './workspace-pipeline-stage-timeline.js'
import { renderChaptersPipelineStage } from './workspace-pipeline-stage-chapters.js'

export function renderPipelineStageNav(stages, activeStageKey) {
  return `
    <div class="pipeline-stage-nav">
      ${stages.map((stage) => `
        <button type="button" class="pipeline-stage-card${stage.key === activeStageKey ? ' active' : ''}" data-stage-key="${stage.key}">
          <div class="pipeline-stage-card__icon">${icon(stage.iconName, 16)}</div>
          <div class="pipeline-stage-card__body">
            <div class="pipeline-stage-card__top">
              <strong>${escapeHtml(stage.title)}</strong>
              <span class="pipeline-status-badge pipeline-status-badge--${stage.status}">${getStatusLabel(stage.status)}</span>
            </div>
            <p>${escapeHtml(stage.desc)}</p>
            <div class="pipeline-stage-card__meta">
              <span>${escapeHtml(stage.progressText)}</span>
              <span>当前: ${escapeHtml(stage.currentLabel)}</span>
            </div>
          </div>
        </button>
      `).join('')}
    </div>
  `
}

export function renderPipelineStageDetail(stage, filters) {
  const filteredItems = getFilteredItems(stage, filters)
  const reviewItems = stage.reviewItems || []
  return `
    <section class="card workspace-basic-panel pipeline-stage-detail">
      <div class="workspace-basic-panel__header workspace-basic-panel__header--compact pipeline-stage-detail__header">
        <div>
          <div class="workspace-basic-panel__eyebrow">Pipeline Stage</div>
          <h3 class="workspace-basic-panel__title">${escapeHtml(stage.title)}</h3>
          <p class="workspace-basic-panel__hint">${escapeHtml(stage.desc)}</p>
        </div>
        <div class="pipeline-stage-detail__summary">
          <span class="pipeline-status-badge pipeline-status-badge--${stage.status}">${getStatusLabel(stage.status)}</span>
          <strong>${escapeHtml(stage.progressText)}</strong>
        </div>
      </div>
      <div class="pipeline-stage-detail__metrics">
        <div class="pipeline-mini-metric"><span>已完成</span><strong>${stage.counts.completed}</strong></div>
        <div class="pipeline-mini-metric"><span>进行中</span><strong>${stage.counts.running}</strong></div>
        <div class="pipeline-mini-metric"><span>待确认</span><strong>${stage.counts.review}</strong></div>
        <div class="pipeline-mini-metric"><span>待执行</span><strong>${stage.counts.queued}</strong></div>
      </div>
      <div class="pipeline-stage-filter-bar">
        <div class="pipeline-filter-group">
          ${renderFilterButton('all', '全部', filters.statusFilter === 'all')}
          ${renderFilterButton('running', '进行中', filters.statusFilter === 'running')}
          ${renderFilterButton('review', '待确认', filters.statusFilter === 'review')}
          ${renderFilterButton('completed', '已完成', filters.statusFilter === 'completed')}
        </div>
        <label class="pipeline-toggle-review${filters.reviewOnly ? ' active' : ''}"><input type="checkbox" data-review-only ${filters.reviewOnly ? 'checked' : ''} /><span>只看待确认</span></label>
      </div>
      ${reviewItems.length > 0 ? `<div class="pipeline-review-strip"><div class="pipeline-review-strip__title">待确认视图</div><div class="pipeline-review-strip__list">${reviewItems.map((item) => `<button type="button" class="pipeline-review-chip" data-stage-action="review-item">${escapeHtml(item.label)}</button>`).join('')}</div></div>` : ''}
      <div class="pipeline-stage-detail__content">${renderStageItems(stage, filteredItems)}</div>
    </section>
    <section class="card workspace-basic-panel pipeline-log-panel">
      <div class="workspace-basic-panel__header workspace-basic-panel__header--compact"><div><div class="workspace-basic-panel__eyebrow">Run Log</div><h3 class="workspace-basic-panel__title">运行日志</h3></div><button type="button" class="btn btn-secondary btn-sm" data-stage-action="logs">${icon('list', 14)}<span>查看完整日志</span></button></div>
      <div class="pipeline-log-list">${stage.logs.map((log) => `<div class="pipeline-log-item"><div class="pipeline-log-item__time">${escapeHtml(log.time)}</div><div class="pipeline-log-item__body"><div class="pipeline-log-item__meta"><span class="pipeline-log-item__type">${escapeHtml(log.type)}</span></div><div class="pipeline-log-item__message">${escapeHtml(log.message)}</div></div></div>`).join('')}</div>
    </section>
  `
}

function renderStageItems(stage, items) {
  switch (stage.key) {
    case 'metadata': return renderMetadataPipelineStage(items)
    case 'roles': return renderRolesPipelineStage(items)
    case 'timeline': return renderTimelinePipelineStage(items)
    case 'chapters': return renderChaptersPipelineStage(items)
    default: return ''
  }
}

function renderFilterButton(value, label, active) {
  return `<button type="button" class="pipeline-filter-chip${active ? ' active' : ''}" data-stage-filter="${value}">${escapeHtml(label)}</button>`
}

function getFilteredItems(stage, filters) {
  let items = stage.items
  if (filters.reviewOnly) items = items.filter((item) => item.status === 'review')
  if (filters.statusFilter !== 'all') items = items.filter((item) => item.status === filters.statusFilter)
  return items
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
