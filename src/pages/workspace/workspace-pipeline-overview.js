import { icon } from '../../lib/icons.js'

export function renderPipelineOverview(model) {
  return `
    <section class="workspace-basic-hero pipeline-hero">
      <div class="workspace-basic-hero__glow"></div>
      <div class="workspace-basic-hero__content">
        <div class="workspace-basic-hero__eyebrow">Pipeline Monitor</div>
        <div class="pipeline-hero__headline">
          <div>
            <div class="workspace-basic-hero__title-row">
              <h2 class="workspace-basic-hero__title">${escapeHtml(model.title)}</h2>
              <span class="pipeline-status-badge pipeline-status-badge--${model.status}">${getStatusLabel(model.status)}</span>
            </div>
            <p class="workspace-basic-hero__origin pipeline-hero__desc">${escapeHtml(model.subtitle)}</p>
          </div>
          <div class="pipeline-hero__actions">
            ${model.actions.map((action) => `
              <button type="button" class="btn ${action.key === 'start' ? 'btn-primary' : 'btn-secondary'} pipeline-hero__action" data-pipeline-action="${action.key}">
                ${icon(action.icon, 16)}
                <span>${escapeHtml(action.label)}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="workspace-basic-metrics pipeline-hero__metrics">
          ${model.metrics.map((metric) => `
            <div class="workspace-basic-metric pipeline-hero__metric">
              <div class="workspace-basic-metric__label">${escapeHtml(metric.label)}</div>
              <div class="workspace-basic-metric__value">${escapeHtml(metric.value)}</div>
            </div>
          `).join('')}
        </div>
        <div class="pipeline-hero__progress">
          <div class="pipeline-hero__progress-head"><span>流水线总进度</span><strong>${escapeHtml(model.progressText)}</strong></div>
          <div class="workspace-basic-progress-bar pipeline-hero__progress-bar"><span style="width:${model.progressPercent}%"></span></div>
        </div>
      </div>
    </section>
  `
}

function getStatusLabel(status) {
  switch (status) {
    case 'completed': return '已完成'
    case 'running': return '进行中'
    case 'paused': return '已暂停'
    case 'error': return '失败'
    default: return '待开始'
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
