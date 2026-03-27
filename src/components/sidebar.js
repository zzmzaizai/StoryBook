import { navigate, getCurrentRoute } from '../router.js'
import { toggleTheme, getTheme } from '../lib/theme.js'
import { icon } from '../lib/icons.js'
import { version as APP_VERSION } from '../../package.json'
import { store } from '../state/store.js'

const FOCUS_NOVEL_ROUTES = ['/workspace', '/chapters', '/characters']

const NAV_ITEMS_BASE = [
  {
    section: '概览',
    items: [
      { route: '/dashboard', label: '仪表盘', icon: 'home' },
    ]
  },
  {
    section: '创作',
    items: [
      { route: '/novels', label: '小说项目', icon: 'novels' },
    ]
  },
  {
    section: 'AI配置',
    items: [
      { route: '/chat', label: 'AI对话', icon: 'message' },
      { route: '/llm-config', label: 'LLM设置', icon: 'settings' },
      { route: '/agent-config', label: '代理配置', icon: 'ai' },
    ]
  },
  {
    section: '系统',
    items: [
      { route: '/security', label: '安全设置', icon: 'lock' },
      { route: '/about', label: '关于', icon: 'about' },
    ]
  }
]

const FOCUS_NOVEL_ITEMS = [
  { route: '/workspace', label: '工作台', icon: 'workspace' },
  { route: '/chapters', label: '章节', icon: 'chapters' },
  { route: '/characters', label: '角色', icon: 'characters' },
]

let _delegated = false
let _collapsed = false

export function renderSidebar(el) {
  const current = getCurrentRoute()
  const isDark = getTheme() === 'dark'
  const focusNovelId = store.currentNovelId
  const focusNovelName = store.currentNovelName

  const navItems = JSON.parse(JSON.stringify(NAV_ITEMS_BASE))
  const creationSection = navItems.find(s => s.section === '创作')

  if (focusNovelId) {
    if (creationSection) {
      creationSection.section = focusNovelName ? `正在创作"${focusNovelName}"小说` : '当前小说'
      creationSection.items = [
        { route: '/novels', label: '返回小说项目', icon: 'back' },
        ...FOCUS_NOVEL_ITEMS,
      ]
    }
  }

  let html = `
    <div class="sidebar-header">
      <div class="sidebar-logo">${_collapsed ? 'SB' : ''}</div>
      ${!_collapsed ? '<span class="sidebar-title">StoryBook</span>' : ''}
    </div>
    <nav class="sidebar-nav">
  `

  for (const section of navItems) {
    html += `<div class="nav-section">
      ${section.section && !_collapsed ? `<div class="nav-section-title">${section.section}</div>` : ''}`

    for (const item of section.items) {
      const active = current === item.route ? ' active' : ''
      html += `<div class="nav-item${active}" data-route="${item.route}" title="${item.label}">
        ${icon(item.icon) || ''}
        <span class="nav-item-label">${item.label}</span>
      </div>`
    }
    html += '</div>'
  }

  html += '</nav>'

  html += `
    <div class="sidebar-footer">
      <div class="nav-item" id="btn-theme-toggle" title="${isDark ? '日间模式' : '夜间模式'}">
        ${isDark ? icon('sun', 16) : icon('moon', 16)}
        <span class="nav-item-label">${isDark ? '日间模式' : '夜间模式'}</span>
      </div>
      ${!_collapsed ? `
        <div class="sidebar-meta">
          <span class="sidebar-version">v${APP_VERSION}</span>
        </div>
      ` : ''}
    </div>
    <button class="sidebar-collapse-btn" id="btn-sidebar-toggle" title="${_collapsed ? '展开' : '收起'}">
      ${_collapsed ? icon('chevron-right', 16) : icon('chevron-left', 16)}
    </button>
  `

  el.innerHTML = html
  el.classList.toggle('sidebar-collapsed', _collapsed)

  if (!_delegated) {
    _delegated = true
    el.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item[data-route]')
      if (navItem) {
        const route = navItem.dataset.route
        
        if (route === '/novels' && store.currentNovelId) {
          store.currentNovelId = null
          store.currentNovelName = null
          renderSidebar(el)
        }
        
        navigate(route)
        _closeMobileSidebar()
        return
      }

      if (e.target.closest('#btn-sidebar-toggle')) {
        _collapsed = !_collapsed
        renderSidebar(el)
        return
      }

      const themeBtn = e.target.closest('#btn-theme-toggle')
      if (themeBtn) {
        toggleTheme().then(() => renderSidebar(el))
        return
      }
    })
  }
}

function _closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar')
  if (sidebar) {
    sidebar.classList.remove('open')
  }
}

export function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar')
  if (sidebar) {
    sidebar.classList.add('open')
  }
}

export function isSidebarCollapsed() {
  return _collapsed
}
