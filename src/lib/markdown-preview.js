import { renderMarkdown } from './markdown-engine.js'

export function createMarkdownPreview(container, options = {}) {
  const root = document.createElement('div')
  root.className = 'md-preview-root'
  applySize(root, options)
  container.innerHTML = ''
  container.appendChild(root)

  const api = {
    setValue(value) {
      root.innerHTML = renderMarkdown(value || '')
    },
    setTheme() {},
    destroy() {
      root.remove()
    },
  }

  api.setValue(options.value || '')
  return api
}

function applySize(el, options) {
  el.style.width = options.width ? normalizeSize(options.width) : '100%'
  el.style.height = options.height ? normalizeSize(options.height) : '100%'
  if (options.minHeight) el.style.minHeight = normalizeSize(options.minHeight)
}

function normalizeSize(value) {
  return typeof value === 'number' ? `${value}px` : value
}
