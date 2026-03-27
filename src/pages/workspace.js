/**
 * 工作台页面
 */
import { store } from '../state/store.js'
import { api } from '../api/tauri.js'
import { navigate } from '../router.js'
import { icon } from '../lib/icons.js'
import { createTabs } from '../lib/tabs.js'
import '../style/editor.css'
import '../style/tabs.css'

import * as basicTab from './workspace/workspace-basic.js'
import * as metaTab from './workspace/workspace-meta.js'
import * as timelineTab from './workspace/workspace-timeline.js'
import * as workflowTab from './workspace/workspace-workflow.js'

let activeTab = 'basic'
let tabsComponent = null

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  const novelId = store.currentNovelId
  let novelInfo = null

  if (novelId) {
    try {
      const [novel, settings] = await Promise.all([
        api.getNovel(novelId),
        api.getNovelSettings(novelId),
      ])
      novelInfo = novel ? { ...novel, settings: settings || {} } : null
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
      <div id="workspace-tabs-mount"></div>

      <div id="tab-content" class="workspace-content"></div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('novels', 20)}</div>
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

  // 创建 Tabs 组件
  const tabsMount = el.querySelector('#workspace-tabs-mount')
  tabsComponent = createTabs({
    containerId: 'workspace-tabs',
    tabs: [
      { key: 'basic', label: '基础', icon: icon('edit', 16), color: '#6366f1' },
      { key: 'meta', label: '元数据', icon: icon('meta', 16), color: '#8b5cf6' },
      { key: 'timeline', label: '时间线', icon: icon('timeline', 16), color: '#3b82f6' },
      { key: 'workflow', label: '流程', icon: icon('workflow', 16), color: '#f59e0b' }
    ],
    activeKey: activeTab,
    onChange: (key) => {
      activeTab = key
      renderTabContent(el, novelInfo)
    }
  })
  tabsMount.appendChild(tabsComponent.element)

  // 初始渲染内容
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
  if (tabsComponent) {
    tabsComponent.destroy()
    tabsComponent = null
  }
  basicTab.cleanup()
  metaTab.cleanup()
  timelineTab.cleanup()
  workflowTab.cleanup()
}
