import { ENUMS } from '../../api/tauri.js'
import { createPipelineStage } from './workspace-pipeline-stage-utils.js'

export function buildRolesPipelineStage(novelInfo, metadataStage) {
  const metadataReady = metadataStage.items.filter((task) => task.status === 'completed').length >= 4
  const styleName = ENUMS.NovelStyle[novelInfo.style] || '当前题材'
  const audienceName = ENUMS.TargetAudience[novelInfo.target_audience] || '目标读者'
  const items = [
    { key: 'lead', label: '主角档案补全', changeType: '更新', summary: `统一主角动机、成长目标与缺陷，贴合${styleName}基调。`, source: '角色引擎', status: metadataReady ? 'completed' : 'queued' },
    { key: 'foil', label: '对手角色关系修正', changeType: '更新', summary: '补足主角与对手之间的外部冲突与利益牵扯。', source: metadataReady ? '待人工确认' : '等待元数据', status: metadataReady ? 'review' : 'queued' },
    { key: 'support', label: '关键配角池扩充', changeType: '新增', summary: `面向${audienceName}补充推动剧情的辅助角色与短期功能角色。`, source: metadataReady ? 'AI 生成中' : '等待元数据', status: metadataReady ? 'running' : 'queued' },
  ]
  return createPipelineStage('roles', '小说角色', '根据小说定位补充角色池与关系改动建议。', 'characters', 'cards', items)
}

export function renderRolesPipelineStage(items) {
  if (items.length === 0) return renderEmpty()
  return `
    <div class="pipeline-role-grid">
      ${items.map((item) => `
        <article class="pipeline-role-card">
          <div class="pipeline-role-card__top">
            <div>
              <div class="pipeline-role-card__title">${escapeHtml(item.label)}</div>
              <div class="pipeline-role-card__type">${escapeHtml(item.changeType || '更新')}</div>
            </div>
            <span class="pipeline-status-badge pipeline-status-badge--${item.status}">${getStatusLabel(item.status)}</span>
          </div>
          <p class="pipeline-role-card__summary">${escapeHtml(item.summary)}</p>
          <div class="pipeline-role-card__footer">
            <span class="pipeline-source-chip">${escapeHtml(item.source || '角色引擎')}</span>
            <div class="pipeline-task-row__actions">
              <button type="button" class="btn btn-secondary btn-sm" data-stage-action="diff">查看差异</button>
              <button type="button" class="btn btn-secondary btn-sm" data-stage-action="confirm">确认写入</button>
            </div>
          </div>
        </article>
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
