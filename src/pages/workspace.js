import { icon } from '../lib/icons.js'
import { createTabs } from '../lib/tabs.js'
import { createNovelPageShell, loadCurrentNovelInfo, renderNovelSelectionState } from './novel-page.js'
import '../style/editor.css'
import '../style/tabs.css'

import * as basicTab from './workspace/workspace-basic.js'
import * as workflowTab from './workspace/workspace-workflow.js'

let activeTab = 'basic'
let tabsComponent = null

export async function render() {
  const novelInfo = await loadCurrentNovelInfo()

  if (!novelInfo) {
    const el = document.createElement('div')
    el.className = 'page'
    return renderNovelSelectionState(el, {
      title: '工作台',
      subtitle: '管理小说基础设定与创作流程',
      iconName: 'workspace',
    })
  }

  const { el, content } = createNovelPageShell('工作台', `正在管理"${novelInfo.title}"小说`)
  content.innerHTML = `
    <div id="workspace-tabs-mount"></div>
    <div id="tab-content" class="workspace-content"></div>
  `

  const tabsMount = content.querySelector('#workspace-tabs-mount')
  tabsComponent = createTabs({
    containerId: 'workspace-tabs',
    tabs: [
      { key: 'basic', label: '基础', icon: icon('edit', 16), color: '#6366f1' },
      { key: 'workflow', label: '流程', icon: icon('workflow', 16), color: '#f59e0b' }
    ],
    activeKey: activeTab,
    onChange: (key) => {
      activeTab = key
      renderTabContent(el, novelInfo)
    }
  })
  tabsMount.appendChild(tabsComponent.element)

  renderTabContent(el, novelInfo)

  return el
}

function renderTabContent(el, novelInfo) {
  const content = el.querySelector('#tab-content')

  switch (activeTab) {
    case 'basic':
      basicTab.render(content, novelInfo)
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
  workflowTab.cleanup()
}
