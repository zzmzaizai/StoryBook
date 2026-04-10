import { ENUMS } from '../../api/tauri.js'
import { createPipelineStage } from './workspace-pipeline-stage-utils.js'

const META_FIELDS = [
  { key: 'title', label: '作品标题', getValue: (novelInfo) => novelInfo.title },
  { key: 'description', label: '作品简介', getValue: (novelInfo) => novelInfo.description || novelInfo.original_description },
  { key: 'style', label: '题材风格', getValue: (novelInfo) => ENUMS.NovelStyle[novelInfo.style] },
  { key: 'audience', label: '目标读者', getValue: (novelInfo) => ENUMS.TargetAudience[novelInfo.target_audience] },
  { key: 'length', label: '篇幅规划', getValue: (novelInfo) => ENUMS.NovelLengthType[novelInfo.length_type] },
  { key: 'theme', label: '主题思想', getValue: (novelInfo) => novelInfo.settings?.theme },
  { key: 'conflict', label: '核心冲突', getValue: (novelInfo) => novelInfo.settings?.conflict },
  { key: 'perspective', label: '叙事视角', getValue: (novelInfo) => novelInfo.settings?.perspective },
]

export function buildMetadataPipelineStage(novelInfo) {
  const items = META_FIELDS.map((field) => {
    const rawValue = field.getValue(novelInfo)
    return {
      key: field.key,
      label: field.label,
      summary: rawValue ? String(rawValue) : '等待流水线补全',
      source: rawValue ? '已确认' : '待生成',
      status: rawValue ? 'completed' : 'queued',
    }
  })
  const firstQueued = items.find((task) => task.status === 'queued')
  if (firstQueued) {
    firstQueued.status = 'running'
    firstQueued.source = 'AI 补全中'
  }
  const secondQueued = items.find((task) => task.status === 'queued')
  if (secondQueued) {
    secondQueued.status = 'review'
    secondQueued.source = '待人工确认'
  }
  return createPipelineStage('metadata', '小说元数据', '自动补全已选元数据字段，并标记待人工确认项。', 'meta', 'table', items)
}

export function renderMetadataPipelineStage(items) {
  return renderTableLike(items)
}

function renderTableLike(items) {
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
