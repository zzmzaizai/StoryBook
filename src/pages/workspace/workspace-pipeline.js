import { toastInfo } from '../../lib/toast.js'
import { api } from '../../api/tauri.js'
import { store } from '../../state/store.js'
import { navigate } from '../../router.js'
import { buildPipelineViewModel } from './workspace-pipeline-data.js'
import { renderPipelineOverview } from './workspace-pipeline-overview.js'
import { renderPipelineStageNav, renderPipelineStageDetail } from './workspace-pipeline-detail.js'
import { openPipelineLogModal } from '../../components/pipeline-log-modal.js'

let activeStageKey = 'metadata'
let stageStatusFilter = 'all'
let reviewOnly = false

export async function render(content, novelInfo) {
  const chaptersResult = await api.listChapters(store.currentNovelId, 0, 100)
  const chapters = Array.isArray(chaptersResult?.items) ? chaptersResult.items : []
  const model = buildPipelineViewModel(novelInfo, chapters)
  if (!model.stages.some((stage) => stage.key === activeStageKey)) activeStageKey = model.stages[0]?.key || 'metadata'
  const activeStage = model.stages.find((stage) => stage.key === activeStageKey) || model.stages[0]
  content.innerHTML = `<div class="pipeline-layout">${renderPipelineOverview(model)}<div class="pipeline-body"><aside class="pipeline-sidebar">${renderPipelineStageNav(model.stages, activeStage.key)}</aside><div class="pipeline-main">${renderPipelineStageDetail(activeStage, { statusFilter: stageStatusFilter, reviewOnly })}</div></div></div>`
  bindEvents(content, novelInfo)
}

export function cleanup() {
  activeStageKey = 'metadata'
  stageStatusFilter = 'all'
  reviewOnly = false
}

function bindEvents(content, novelInfo) {
  content.querySelectorAll('[data-stage-key]').forEach((button) => button.addEventListener('click', () => {
    activeStageKey = button.dataset.stageKey || activeStageKey
    stageStatusFilter = 'all'
    reviewOnly = false
    render(content, novelInfo).catch((error) => console.error('刷新工作台流水线失败:', error))
  }))
  content.querySelectorAll('[data-stage-filter]').forEach((button) => button.addEventListener('click', () => {
    stageStatusFilter = button.dataset.stageFilter || 'all'
    render(content, novelInfo).catch((error) => console.error('刷新工作台流水线失败:', error))
  }))
  content.querySelector('[data-review-only]')?.addEventListener('change', (event) => {
    reviewOnly = Boolean(event.target.checked)
    render(content, novelInfo).catch((error) => console.error('刷新工作台流水线失败:', error))
  })
  content.querySelectorAll('[data-pipeline-action], [data-stage-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.stageAction || button.dataset.pipelineAction
    if (action === 'logs') {
      api.listChapters(store.currentNovelId, 0, 100).then((chaptersResult) => {
        const chapters = Array.isArray(chaptersResult?.items) ? chaptersResult.items : []
        const model = buildPipelineViewModel(novelInfo, chapters)
        const stage = model.stages.find((item) => item.key === activeStageKey) || model.stages[0]
        openPipelineLogModal({ title: `${stage.title}日志`, subtitle: stage.desc, logs: stage.logs })
      }).catch((error) => console.error('打开流水线日志失败:', error))
      return
    }
    if (action === 'view-chapter') {
      const chapterId = Number(button.dataset.chapterId || 0)
      if (chapterId) {
        store.currentChapterId = chapterId
        store.currentChapterDetailTab = 'process'
        navigate('/chapters')
      }
      return
    }
    const label = button.textContent?.trim() || '当前操作'
    toastInfo(`${label} 的真实管线控制尚未接入，当前先展示 UI 监控形态。`)
  }))
}
