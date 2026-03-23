/**
 * 工作台页面
 */
import { store } from '../state/store.js'
import { api } from '../api/tauri.js'
import { navigate } from '../router.js'
import { ICONS } from '../lib/icons.js'
import '../style/editor.css'

import * as basicTab from './workspace/workspace-basic.js'
import * as metaTab from './workspace/workspace-meta.js'
import * as timelineTab from './workspace/workspace-timeline.js'
import * as workflowTab from './workspace/workspace-workflow.js'

let activeTab = 'basic'

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  const novelId = store.currentNovelId
  let novelInfo = null
  
  if (novelId) {
    try {
      novelInfo = await api.getNovel(novelId)
      await metaTab.loadMeta(novelId)
      await timelineTab.loadTimelines(novelId)
    } catch (e) {
      console.error('加载小说信息失败:', e)
      novelInfo = null
    }
  }

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">工作台</h1>
      <p class="page-subtitle">正在管理"${novelInfo ? novelInfo.title : '未知'}"小说</p>
    </div>
    
    ${novelInfo ? `
      <div class="workspace-tabs">
        <button class="workspace-tab ${activeTab === 'basic' ? 'active' : ''}" data-tab="basic">
          ${ICONS.edit}<span>基础</span>
        </button>
        <button class="workspace-tab ${activeTab === 'meta' ? 'active' : ''}" data-tab="meta">
          ${ICONS.meta}<span>元数据</span>
        </button>
        <button class="workspace-tab ${activeTab === 'timeline' ? 'active' : ''}" data-tab="timeline">
          ${ICONS.timeline}<span>时间线</span>
        </button>
        <button class="workspace-tab ${activeTab === 'workflow' ? 'active' : ''}" data-tab="workflow">
          ${ICONS.workflow}<span>流程</span>
        </button>
      </div>
      
      <div id="tab-content" class="workspace-content"></div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.novels}</div>
        <div class="empty-state-title">未选择小说</div>
        <div class="empty-state-desc">请先从小说列表选择一部小说</div>
        <button class="btn btn-primary mt-lg" id="go-novels">选择小说</button>
      </div>
    `}
  `

  if (!novelInfo) {
    el.querySelector('#go-novels')?.addEventListener('click', () => {
      navigate('/novels')
    })
    return el
  }

  el.querySelectorAll('.workspace-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab
      el.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      renderTabContent(el, novelInfo)
    })
  })

  renderTabContent(el, novelInfo)

  return el
}

function renderTabContent(el, novelInfo) {
  const content = el.querySelector('#tab-content')
  
  switch (activeTab) {
    case 'basic':
      basicTab.render(content, novelInfo)
      break
    case 'meta':
      metaTab.render(content, novelInfo)
      break
    case 'timeline':
      timelineTab.render(content, novelInfo)
      break
    case 'workflow':
      workflowTab.render(content, novelInfo)
      break
  }
}

export function cleanup() {
  activeTab = 'basic'
  basicTab.cleanup()
  metaTab.cleanup()
  timelineTab.cleanup()
  workflowTab.cleanup()
}
