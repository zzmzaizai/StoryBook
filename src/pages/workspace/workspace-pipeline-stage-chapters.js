import { buildChapterPipelineEntries } from '../chapters/chapter-pipeline-data.js'
import { createPipelineStage } from './workspace-pipeline-stage-utils.js'

export function buildChaptersPipelineStage(chapters) {
  return createPipelineStage('chapters', '小说章节流水线', '统一监控所有章节的大纲、扩写、校对与润色进度。', 'chapters', 'pipeline', buildChapterPipelineEntries(chapters))
}

export function renderChaptersPipelineStage(items) {
  if (items.length === 0) return renderEmpty()
  return `
    <div class="pipeline-task-list">
      ${items.map((item) => `
        <div class="pipeline-task-row pipeline-task-row--pipeline">
          <div class="pipeline-task-row__main">
            <div class="pipeline-task-row__title-wrap">
              <span class="pipeline-status-dot pipeline-status-dot--${item.status}"></span>
              <strong>${escapeHtml(item.label)}</strong>
              <span class="pipeline-source-chip">${escapeHtml(item.currentStep || '章节大纲')}</span>
            </div>
            <p>${escapeHtml(item.summary || '')}</p>
            <div class="pipeline-tag-row">${(item.tags || []).map((tag) => `<span class="pipeline-tag">${escapeHtml(tag)}</span>`).join('')}</div>
          </div>
          <div class="pipeline-task-row__side">
            <span class="pipeline-status-badge pipeline-status-badge--${item.status}">${getStatusLabel(item.status)}</span>
            <div class="pipeline-pipeline-meta">
              <span>${escapeHtml(item.progressText || '--')}</span>
              <span>${escapeHtml(item.updatedAt || '未开始')}</span>
            </div>
            <div class="pipeline-task-row__actions">
              <button type="button" class="btn btn-secondary btn-sm" data-stage-action="view-chapter" data-chapter-id="${item.chapterId}">查看章节</button>
              <button type="button" class="btn btn-secondary btn-sm" data-stage-action="retry">从当前步骤继续</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `
}

function renderEmpty() {
  return `<div class="empty-state pipeline-empty-state"><div class="empty-state-title">还没有章节进入流水线</div><div class="empty-state-desc">请先创建章节并保存正文，章节流水线才会开始显示状态与日志。</div></div>`
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
