/**
 * 主题管理（日间/夜间模式）
 */
import { getSetting, setSetting } from './store.js'

const THEME_KEY = 'app.theme'
const THEME_LOCAL_KEY = 'storybook_theme'
const THEME_CHANGE_LISTENERS = []

export async function getThemeSetting() {
  return await getSetting(THEME_KEY, null)
}

export async function setThemeSetting(theme) {
  return await setSetting(THEME_KEY, theme)
}

export async function initTheme() {
  let theme = null
  
  try {
    theme = await getThemeSetting()
  } catch (e) {
    console.warn('从 store 获取主题失败，使用本地存储:', e)
  }
  
  if (!theme) {
    theme = localStorage.getItem(THEME_LOCAL_KEY) || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }
  
  applyTheme(theme, false)
}

export async function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'light'
  const next = current === 'dark' ? 'light' : 'dark'
  await applyTheme(next)
  return next
}

export function getTheme() {
  return document.documentElement.dataset.theme || 'light'
}

export async function setTheme(theme) {
  await applyTheme(theme)
}

async function applyTheme(theme, saveToStore = true) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(THEME_LOCAL_KEY, theme)
  
  if (saveToStore) {
    try {
      await setThemeSetting(theme)
    } catch (e) {
      console.warn('保存主题到 store 失败:', e)
    }
  }
  
  THEME_CHANGE_LISTENERS.forEach(fn => { try { fn(theme) } catch {} })
}

export function registerEditorThemeUpdater(fn) {
  THEME_CHANGE_LISTENERS.push(fn)
  return () => {
    const index = THEME_CHANGE_LISTENERS.indexOf(fn)
    if (index > -1) THEME_CHANGE_LISTENERS.splice(index, 1)
  }
}

export function onThemeChange(fn) {
  THEME_CHANGE_LISTENERS.push(fn)
  return () => {
    const index = THEME_CHANGE_LISTENERS.indexOf(fn)
    if (index > -1) THEME_CHANGE_LISTENERS.splice(index, 1)
  }
}
