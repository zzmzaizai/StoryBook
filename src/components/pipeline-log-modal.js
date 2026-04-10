import { Modal } from '../lib/modal.js'

export function openPipelineLogModal({ title = '流水线日志', subtitle = '', logs = [] } = {}) {
  const content = document.createElement('div')
  content.className = 'pipeline-log-modal-content'
  content.innerHTML = `
    ${subtitle ? `<div class="pipeline-log-modal-subtitle">${escapeHtml(subtitle)}</div>` : ''}
    <div class="pipeline-log-modal-list">
      ${logs.length > 0 ? logs.map((log) => `
        <div class="pipeline-log-item">
          <div class="pipeline-log-item__time">${escapeHtml(log.time || '--:--')}</div>
          <div class="pipeline-log-item__body">
            <div class="pipeline-log-item__meta">
              ${log.step ? `<span>${escapeHtml(log.step)}</span>` : ''}
              <span class="pipeline-log-item__type">${escapeHtml(log.type || '事件')}</span>
            </div>
            <div class="pipeline-log-item__message">${escapeHtml(log.message || '暂无日志内容')}</div>
          </div>
        </div>
      `).join('') : `
        <div class="empty-state pipeline-empty-state pipeline-empty-state--modal">
          <div class="empty-state-title">当前没有可展示的日志</div>
          <div class="empty-state-desc">流水线开始执行后，这里会显示完整的步骤事件记录。</div>
        </div>
      `}
    </div>
  `

  const modal = new Modal({
    title,
    content,
    size: 'lg',
    className: 'pipeline-log-modal',
    showFooter: false,
  })

  modal.open()
  return modal
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
