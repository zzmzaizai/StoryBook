/**
 * 主题管理（跟随系统 / 浅色 / 深色）
 */
import { setTheme as setNativeTheme } from '@tauri-apps/api/app'
import { getSetting, setSetting } from './store.js'

const THEME_KEY = 'app.theme'
const THEME_LOCAL_KEY = 'storybook_theme'
const THEME_CHANGE_LISTENERS = []
const THEME_MODES = ['auto', 'light', 'dark']

let mediaQuery = null
let mediaQueryHandler = null
let currentThemeMode = 'auto'
let currentResolvedTheme = 'light'

export async function getThemeSetting() {
  return await getSetting(THEME_KEY, null)
}

export async function setThemeSetting(theme) {
  return await setSetting(THEME_KEY, theme)
}

export async function initTheme() {
  let themeMode = null

  try {
    themeMode = await getThemeSetting()
  } catch (e) {
    console.warn('从 store 获取主题失败，使用本地存储:', e)
  }

  if (!isValidThemeMode(themeMode)) {
    const localTheme = localStorage.getItem(THEME_LOCAL_KEY)
    themeMode = isValidThemeMode(localTheme) ? localTheme : 'auto'
  }

  await applyThemeMode(themeMode, false)
}

export async function toggleTheme() {
  const currentIndex = THEME_MODES.indexOf(currentThemeMode)
  const next = THEME_MODES[(currentIndex + 1) % THEME_MODES.length]
  await applyThemeMode(next)
  return next
}

export function getTheme() {
  return currentResolvedTheme
}

export function getThemeMode() {
  return currentThemeMode
}

export async function setTheme(themeMode) {
  await applyThemeMode(themeMode)
}

export function getThemeDisplayLabel() {
  switch (currentThemeMode) {
    case 'auto':
      return '跟随系统'
    case 'dark':
      return '深色模式'
    case 'light':
    default:
      return '浅色模式'
  }
}

export function getThemeToggleIcon() {
  switch (currentThemeMode) {
    case 'auto':
      return 'monitor'
    case 'dark':
      return 'moon'
    case 'light':
    default:
      return 'sun'
  }
}

async function applyThemeMode(themeMode, saveToStore = true) {
  const normalizedMode = isValidThemeMode(themeMode) ? themeMode : 'auto'
  currentThemeMode = normalizedMode

  const resolvedTheme = resolveTheme(normalizedMode)
  currentResolvedTheme = resolvedTheme

  applyResolvedTheme(resolvedTheme)
  setupSystemThemeListener()
  await applyNativeTheme(normalizedMode, resolvedTheme)

  localStorage.setItem(THEME_LOCAL_KEY, normalizedMode)

  if (saveToStore) {
    try {
      await setThemeSetting(normalizedMode)
    } catch (e) {
      console.warn('保存主题到 store 失败:', e)
    }
  }

  THEME_CHANGE_LISTENERS.forEach(fn => {
    try {
      fn(resolvedTheme, normalizedMode)
    } catch {}
  })
}

function applyResolvedTheme(theme) {
  document.documentElement.dataset.theme = theme
}

function resolveTheme(themeMode) {
  if (themeMode === 'dark') return 'dark'
  if (themeMode === 'light') return 'light'
  return isSystemDark() ? 'dark' : 'light'
}

function setupSystemThemeListener() {
  if (!mediaQuery) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  }

  if (mediaQueryHandler) {
    mediaQuery.removeEventListener('change', mediaQueryHandler)
    mediaQueryHandler = null
  }

  if (currentThemeMode !== 'auto') return

  mediaQueryHandler = () => {
    const resolvedTheme = resolveTheme('auto')
    currentResolvedTheme = resolvedTheme
    applyResolvedTheme(resolvedTheme)
    applyNativeTheme('auto', resolvedTheme)
    THEME_CHANGE_LISTENERS.forEach(fn => {
      try {
        fn(resolvedTheme, currentThemeMode)
      } catch {}
    })
  }

  mediaQuery.addEventListener('change', mediaQueryHandler)
}

async function applyNativeTheme(themeMode, resolvedTheme = currentResolvedTheme) {
  try {
    await setNativeTheme(themeMode === 'auto' ? resolvedTheme : themeMode)
  } catch (e) {
    console.warn('设置原生窗口主题失败:', e)
  }
}

function isSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function isValidThemeMode(value) {
  return THEME_MODES.includes(value)
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
