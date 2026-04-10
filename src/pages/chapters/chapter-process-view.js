import { icon } from '../../lib/icons.js'
import { openPipelineLogModal } from '../../components/pipeline-log-modal.js'

export function renderChapterProcessView(model) {
  if (!model) return ''

  return `
    <div class="chapter-process-layout">
      <section class="chapter-process-hero">
        <div>
          <div class="workspace-basic-panel__eyebrow">Chapter Pipeline</div>
          <h3 class="chapter-process-hero__title">${escapeHtml(model.chapterTitle)}</h3>
          <p class="chapter-process-hero__desc">当前步骤：${escapeHtml(model.currentStep.title)}，这是工作台章节流水线在当前章节上的拆分视图。</p>
        </div>
        <div class="chapter-process-hero__actions">
          <button type="button" class="btn btn-secondary btn-sm" data-process-action="pause">${icon('pause', 14)}<span>暂停本章</span></button>
          <button type="button" class="btn btn-secondary btn-sm" data-process-action="resume">${icon('refresh-cw', 14)}<span>继续</span></button>
          <button type="button" class="btn btn-secondary btn-sm" data-process-action="logs">${icon('list', 14)}<span>查看日志</span></button>
        </div>
      </section>

      <section class="chapter-process-summary-bar">
        <div class="chapter-process-summary-item"><span>总状态</span><strong>${getStatusLabel(model.status)}</strong></div>
        <div class="chapter-process-summary-item"><span>当前步骤</span><strong>${escapeHtml(model.currentStep.title)}</strong></div>
        <div class="chapter-process-summary-item"><span>总进度</span><strong>${escapeHtml(model.progressText)}</strong></div>
        <div class="chapter-process-summary-item"><span>最近更新</span><strong>${escapeHtml(model.updatedAt)}</strong></div>
      </section>

      ${renderProcessStateBanner(model)}

      <div class="chapter-process-step-list">
        ${model.steps.map((step) => renderStepCard(step)).join('')}
      </div>

      <section class="card workspace-basic-panel pipeline-log-panel">
        <div class="workspace-basic-panel__header workspace-basic-panel__header--compact">
          <div>
            <div class="workspace-basic-panel__eyebrow">Run Log</div>
            <h4 class="workspace-basic-panel__title">运行日志</h4>
          </div>
        </div>
        <div class="pipeline-log-list">
          ${model.logs.map((log) => `
            <div class="pipeline-log-item">
              <div class="pipeline-log-item__time">${escapeHtml(log.time)}</div>
              <div class="pipeline-log-item__body">
                <div class="pipeline-log-item__meta">
                  <span>${escapeHtml(log.step)}</span>
                  <span class="pipeline-log-item__type">${escapeHtml(log.type)}</span>
                </div>
                <div class="pipeline-log-item__message">${escapeHtml(log.message)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `
}

export function bindChapterProcessViewActions(root, model) {
  root.querySelectorAll('[data-process-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.processAction
      if (action === 'logs') {
        openPipelineLogModal({ title: `${model.chapterTitle}日志`, subtitle: '单章节流水线完整事件记录', logs: model.logs })
      }
    })
  })
}

function renderStepCard(step) {
  return `
    <article class="chapter-process-step-card chapter-process-step-card--${step.status}">
      <div class="chapter-process-step-card__rail">
        <span class="chapter-process-step-card__order">${step.order}</span>
      </div>
      <div class="chapter-process-step-card__body">
        <div class="chapter-process-step-card__top">
          <div>
            <div class="chapter-process-step-card__title">${escapeHtml(step.title)}</div>
            <p class="chapter-process-step-card__desc">${escapeHtml(step.desc)}</p>
          </div>
          <span class="pipeline-status-badge pipeline-status-badge--${step.status}">${getStatusLabel(step.status)}</span>
        </div>
        <div class="chapter-process-step-card__content">
          <div class="chapter-process-step-card__field">
            <span>输入摘要</span>
            <strong>${escapeHtml(step.input)}</strong>
          </div>
          <div class="chapter-process-step-card__field">
            <span>输出摘要</span>
            <strong>${escapeHtml(step.output)}</strong>
          </div>
          <div class="chapter-process-step-card__field">
            <span>状态说明</span>
            <strong>${escapeHtml(step.meta)}</strong>
          </div>
        </div>
        ${typeof step.progressPercent === 'number' && step.progressPercent > 0 ? `
          <div class="chapter-process-step-card__progress">
            <div class="workspace-basic-progress-bar"><span style="width:${step.progressPercent}%"></span></div>
            <span>${step.progressPercent}%</span>
          </div>
        ` : ''}
        <div class="chapter-process-step-card__actions">
          ${step.actions.map((action) => `<button type="button" class="btn btn-secondary btn-sm" data-process-action="step-action">${escapeHtml(action)}</button>`).join('')}
        </div>
      </div>
    </article>
  `
}

function getStatusLabel(status) {
  switch (status) {
    case 'completed': return '已完成'
    case 'running': return '进行中'
    case 'review': return '待确认'
    case 'paused': return '已暂停'
    case 'error': return '失败'
    default: return '待执行'
  }
}

function renderProcessStateBanner(model) {
  if (model.status === 'error') {
    return `<section class="pipeline-state-banner pipeline-state-banner--error"><strong>当前章节处理异常</strong><span>建议先查看日志定位失败步骤，再决定是否从当前步骤继续。</span></section>`
  }
  if (model.status === 'queued') {
    return `<section class="pipeline-state-banner"><strong>等待启动</strong><span>当前章节已保存，但还没有进入自动化处理流程。</span></section>`
  }
  if (model.currentStep?.status === 'review') {
    return `<section class="pipeline-state-banner pipeline-state-banner--review"><strong>等待人工确认</strong><span>审核校对已经产出建议，确认后可继续进入润色步骤。</span></section>`
  }
  return ''
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
