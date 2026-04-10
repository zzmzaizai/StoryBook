import { api } from '../api/tauri.js'
import { icon } from '../lib/icons.js'
import { navigate } from '../router.js'
import { store } from '../state/store.js'

export async function loadCurrentNovelInfo() {
  const novelId = store.currentNovelId
  if (!novelId) return null

  try {
    const [novel, settings] = await Promise.all([
      api.getNovel(novelId),
      api.getNovelSettings(novelId),
    ])
    return novel ? { ...novel, settings: settings || {} } : null
  } catch (error) {
    console.error('加载小说信息失败:', error)
    return null
  }
}

export function createNovelPageShell(title, subtitle) {
  const el = document.createElement('div')
  el.className = 'page'
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${title}</h1>
      <p class="page-subtitle">${subtitle}</p>
    </div>
    <div id="novel-page-content" class="novel-page-content"></div>
  `

  return {
    el,
    content: el.querySelector('#novel-page-content'),
  }
}

export function renderNovelSelectionState(el, options) {
  const {
    title,
    subtitle,
    iconName,
    emptyTitle = '未选择小说',
    emptyDesc = '请先从小说列表选择一部小说',
  } = options

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${title}</h1>
      <p class="page-subtitle">${subtitle}</p>
    </div>
    <div class="empty-state">
      <div class="empty-state-icon">${icon(iconName, 20)}</div>
      <div class="empty-state-title">${emptyTitle}</div>
      <div class="empty-state-desc">${emptyDesc}</div>
      <button class="btn btn-primary mt-lg" id="go-novels">选择小说</button>
    </div>
  `

  el.querySelector('#go-novels')?.addEventListener('click', () => {
    navigate('/novels')
  })

  return el
}
