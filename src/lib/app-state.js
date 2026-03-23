/**
 * 全局应用状态管理
 * 管理应用级别的状态，供各组件查询和订阅
 */

// 当前激活的小说
let _activeNovel = null
let _novelListeners = []

// 当前激活的章节
let _activeChapter = null
let _chapterListeners = []

// 编辑器状态
let _editorDirty = false
let _editorDirtyListeners = []

// 侧边栏状态
let _sidebarCollapsed = false
let _sidebarListeners = []

// 全局加载状态
let _globalLoading = false
let _loadingListeners = []

// ==================== 小说状态 ====================

export function getActiveNovel() {
  return _activeNovel
}

export function setActiveNovel(novel) {
  const changed = _activeNovel?.id !== novel?.id
  _activeNovel = novel
  if (changed) {
    _novelListeners.forEach(fn => { try { fn(novel) } catch {} })
  }
}

export function onNovelChange(fn) {
  _novelListeners.push(fn)
  return () => { _novelListeners = _novelListeners.filter(cb => cb !== fn) }
}

// ==================== 章节状态 ====================

export function getActiveChapter() {
  return _activeChapter
}

export function setActiveChapter(chapter) {
  const changed = _activeChapter?.id !== chapter?.id
  _activeChapter = chapter
  if (changed) {
    _chapterListeners.forEach(fn => { try { fn(chapter) } catch {} })
  }
}

export function onChapterChange(fn) {
  _chapterListeners.push(fn)
  return () => { _chapterListeners = _chapterListeners.filter(cb => cb !== fn) }
}

// ==================== 编辑器状态 ====================

export function isEditorDirty() {
  return _editorDirty
}

export function setEditorDirty(dirty) {
  const changed = _editorDirty !== dirty
  _editorDirty = dirty
  if (changed) {
    _editorDirtyListeners.forEach(fn => { try { fn(dirty) } catch {} })
  }
}

export function onEditorDirtyChange(fn) {
  _editorDirtyListeners.push(fn)
  return () => { _editorDirtyListeners = _editorDirtyListeners.filter(cb => cb !== fn) }
}

// ==================== 侧边栏状态 ====================

export function isSidebarCollapsed() {
  return _sidebarCollapsed
}

export function setSidebarCollapsed(collapsed) {
  const changed = _sidebarCollapsed !== collapsed
  _sidebarCollapsed = collapsed
  if (changed) {
    _sidebarListeners.forEach(fn => { try { fn(collapsed) } catch {} })
  }
}

export function toggleSidebar() {
  _sidebarCollapsed = !_sidebarCollapsed
  _sidebarListeners.forEach(fn => { try { fn(_sidebarCollapsed) } catch {} })
  return _sidebarCollapsed
}

export function onSidebarChange(fn) {
  _sidebarListeners.push(fn)
  return () => { _sidebarListeners = _sidebarListeners.filter(cb => cb !== fn) }
}

// ==================== 全局加载状态 ====================

export function isGlobalLoading() {
  return _globalLoading
}

export function setGlobalLoading(loading) {
  const changed = _globalLoading !== loading
  _globalLoading = loading
  if (changed) {
    _loadingListeners.forEach(fn => { try { fn(loading) } catch {} })
  }
}

export function onLoadingChange(fn) {
  _loadingListeners.push(fn)
  return () => { _loadingListeners = _loadingListeners.filter(cb => cb !== fn) }
}

// ==================== 工具函数 ====================

/**
 * 清除所有状态
 */
export function clearAllState() {
  _activeNovel = null
  _activeChapter = null
  _editorDirty = false
  _sidebarCollapsed = false
  _globalLoading = false
}

/**
 * 重置所有监听器
 */
export function resetAllListeners() {
  _novelListeners = []
  _chapterListeners = []
  _editorDirtyListeners = []
  _sidebarListeners = []
  _loadingListeners = []
}
