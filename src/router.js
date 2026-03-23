/**
 * 极简 hash 路由系统
 * 支持懒加载、模块缓存、错误重试
 */
const routes = {}
const _moduleCache = {}
let _contentEl = null
let _loadId = 0
let _currentCleanup = null
let _initialized = false

let _defaultRoute = '/novels'

export function registerRoute(path, loader) {
  routes[path] = loader
}

export function setDefaultRoute(path) {
  _defaultRoute = path
}

export function navigate(path) {
  window.location.hash = path
}

export function initRouter(contentEl) {
  _contentEl = contentEl
  if (!_initialized) {
    window.addEventListener('hashchange', () => loadRoute())
    _initialized = true
  }
  loadRoute()
}

async function loadRoute() {
  const hash = window.location.hash.slice(1) || _defaultRoute
  const loader = routes[hash]
  if (!loader || !_contentEl) return

  const thisLoad = ++_loadId

  if (_currentCleanup) {
    try { _currentCleanup() } catch (_) {}
    _currentCleanup = null
  }

  _contentEl.innerHTML = ''

  let mod = _moduleCache[hash]
  if (!mod) {
    _contentEl.innerHTML = ''
    const spinnerEl = document.createElement('div')
    spinnerEl.className = 'page-loader'
    spinnerEl.innerHTML = `
      <div class="page-loader-spinner"></div>
      <div class="page-loader-text">加载中...</div>
    `
    _contentEl.appendChild(spinnerEl)

    try {
      mod = await retryLoad(loader, 3, 500)
    } catch (e) {
      console.error('[router] 模块加载失败:', hash, e)
      if (thisLoad === _loadId) showLoadError(_contentEl, hash, e)
      return
    }
    _moduleCache[hash] = mod
  } else {
    _contentEl.innerHTML = ''
  }

  if (thisLoad !== _loadId) return

  let page
  try {
    const renderFn = mod.render || mod.default
    page = renderFn ? await withTimeout(renderFn(), 15000, '页面渲染超时') : mod
  } catch (e) {
    console.error('[router] 页面渲染失败:', hash, e)
    delete _moduleCache[hash]
    if (thisLoad === _loadId) showLoadError(_contentEl, hash, e)
    return
  }
  if (thisLoad !== _loadId) return

  _contentEl.innerHTML = ''
  if (typeof page === 'string') {
    _contentEl.innerHTML = page
  } else if (page instanceof HTMLElement) {
    _contentEl.appendChild(page)
  }

  _currentCleanup = mod.cleanup || null

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === hash)
  })
}

async function retryLoad(loader, maxRetries, delayMs) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await withTimeout(loader(), 15000, '模块加载超时')
    } catch (e) {
      const isNetworkError = /fetch|network|connection|ERR_/i.test(String(e?.message || e))
      if (i < maxRetries && isNetworkError) {
        console.warn(`[router] 模块加载失败，${delayMs}ms 后重试 (${i + 1}/${maxRetries})...`)
        await new Promise(r => setTimeout(r, delayMs))
        continue
      }
      throw e
    }
  }
}

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
  ])
}

function showLoadError(container, hash, error) {
  const name = hash.replace('/', '') || 'unknown'
  container.innerHTML = `
    <div class="page-loader">
      <div style="color:var(--error,#ef4444);margin-bottom:12px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <div class="page-loader-text" style="color:var(--text-primary)">页面加载失败</div>
      <div style="color:var(--text-tertiary);font-size:12px;margin:8px 0 16px;max-width:400px;word-break:break-all">${escHtml(String(error?.message || error))}</div>
      <button onclick="location.hash='${hash}';location.reload()" style="padding:6px 20px;border-radius:6px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);cursor:pointer;font-size:13px">重新加载</button>
    </div>
  `
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function getCurrentRoute() {
  return window.location.hash.slice(1) || _defaultRoute
}
