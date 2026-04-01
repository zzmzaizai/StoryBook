/**
 * StoryBook 入口
 */
import { registerRoute, initRouter, navigate, setDefaultRoute } from './router.js'
import { renderSidebar, openMobileSidebar } from './components/sidebar.js'
import { initTheme, registerEditorThemeUpdater } from './lib/theme.js'
import { updateAllEditorsTheme } from './lib/markdown-editor.js'
import { checkSecurityAccess } from './pages/security.js'
import * as securityPage from './pages/security.js'

import './style/variables.css'
import './style/reset.css'
import './style/layout.css'
import './style/components.css'
import './style/pages.css'
import './style/modal.css'
import './style/security.css'

registerEditorThemeUpdater((theme) => {
  updateAllEditorsTheme()
})

// 注册路由
registerRoute('/dashboard', () => import('./pages/dashboard.js'))
registerRoute('/novels', () => import('./pages/novels.js'))
registerRoute('/workspace', () => import('./pages/workspace.js'))
registerRoute('/chapters', () => import('./pages/chapters.js'))
registerRoute('/characters', () => import('./pages/characters.js'))
registerRoute('/llm-config', () => import('./pages/llm-config.js'))
registerRoute('/agent-config', () => import('./pages/agent-config.js'))
registerRoute('/security', async () => securityPage)
registerRoute('/about', () => import('./pages/about.js'))

setDefaultRoute('/dashboard')

// 隐藏启动屏
function hideSplash() {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.classList.add('hide')
    setTimeout(() => splash.remove(), 500)
  }
}

// 初始化应用
async function init() {
  // 先初始化主题（在安全验证之前，确保 UI 显示正确）
  await initTheme()
  
  // 检查安全访问
  const hasAccess = await checkSecurityAccess()
  if (!hasAccess) {
    // 用户取消验证，退出应用
    const appEl = document.getElementById('app')
    if (appEl) {
      appEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:var(--text-secondary)">
          <div style="font-size:48px;margin-bottom:16px">🔒</div>
          <div style="font-size:18px;margin-bottom:8px">需要验证密码</div>
          <div style="font-size:14px">请重新启动应用</div>
        </div>
      `
    }
    return
  }

  hideSplash()

  const appEl = document.getElementById('app')
  if (!appEl) return

  // 创建布局结构
  appEl.innerHTML = `
    <aside id="sidebar"></aside>
    <div id="main-col">
      <main id="content"></main>
    </div>
  `

  // 渲染侧边栏
  const sidebarEl = document.getElementById('sidebar')
  await renderSidebar(sidebarEl)

  // 初始化路由
  const contentEl = document.getElementById('content')
  initRouter(contentEl)
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 移动端菜单按钮
window.openMobileSidebar = openMobileSidebar
