/**
 * Markdown 预览组件
 * 纯预览模式，不显示编辑器，高度跟随内容，可指定最大高度
 */
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const PREVIEW_INSTANCES = new Map()

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'classic'
}

/**
 * 创建 Markdown 预览组件
 * @param {HTMLElement} container - 容器元素
 * @param {Object} options - 配置选项
 * @param {string} options.value - Markdown 内容
 * @param {string} options.maxHeight - 最大高度（如 '500px'）
 * @param {boolean} options.showOutline - 是否显示大纲
 * @param {Function} options.onClick - 点击事件回调
 * @returns {Object} 预览实例
 */
export function createMarkdownPreview(container, options = {}) {
  const theme = getTheme()
  const contentTheme = theme === 'dark' ? 'dark' : 'light'
  const codeTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  container.className = 'markdown-preview-container'
  if (options.maxHeight) {
    container.style.maxHeight = options.maxHeight
    container.style.overflow = 'auto'
  }

  const previewId = `preview-${Date.now()}`
  const previewEl = document.createElement('div')
  previewEl.id = previewId
  previewEl.className = 'markdown-preview-content'
  container.appendChild(previewEl)

  const renderContent = () => {
    const content = options.value || ''
    Vditor.preview(previewEl, content, {
      mode: contentTheme,
      theme: {
        current: contentTheme,
        path: '',
      },
      hljs: {
        enable: true,
        lineNumber: true,
        style: codeTheme,
      },
      markdown: {
        toc: options.showOutline !== false,
        mark: true,
        footnotes: true,
        autoSpace: true,
      },
      speech: {
        enable: false,
      },
      anchor: 0,
      after: () => {
        if (options.onClick) {
          previewEl.addEventListener('click', options.onClick)
        }
      },
    })
  }

  renderContent()

  const instanceId = previewId
  PREVIEW_INSTANCES.set(instanceId, { container, previewEl, options })

  return {
    instanceId,
    setValue: (value) => {
      options.value = value
      renderContent()
    },
    getValue: () => options.value || '',
    setTheme: (themeName) => {
      const newContentTheme = themeName === 'dark' ? 'dark' : 'light'
      const newCodeTheme = themeName === 'dark' ? 'github-dark' : 'github-light'
      Vditor.preview(previewEl, options.value || '', {
        mode: newContentTheme,
        theme: {
          current: newContentTheme,
          path: '',
        },
        hljs: {
          enable: true,
          lineNumber: true,
          style: newCodeTheme,
        },
        markdown: {
          toc: options.showOutline !== false,
          mark: true,
          footnotes: true,
          autoSpace: true,
        },
        speech: {
          enable: false,
        },
        anchor: 0,
      })
    },
    destroy: () => {
      if (options.onClick) {
        previewEl.removeEventListener('click', options.onClick)
      }
      previewEl.remove()
      PREVIEW_INSTANCES.delete(instanceId)
    },
  }
}

/**
 * 渲染 Markdown 内容为 HTML（静态方法）
 * @param {string} content - Markdown 内容
 * @param {Object} options - 配置选项
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(content, options = {}) {
  const theme = getTheme()
  const contentTheme = theme === 'dark' ? 'dark' : 'light'
  const codeTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  const tempDiv = document.createElement('div')
  tempDiv.style.display = 'none'
  document.body.appendChild(tempDiv)

  let result = ''

  Vditor.preview(tempDiv, content || '', {
    mode: contentTheme,
    theme: {
      current: contentTheme,
      path: '',
    },
    hljs: {
      enable: true,
      lineNumber: true,
      style: codeTheme,
    },
    markdown: {
      toc: false,
      mark: true,
      footnotes: true,
      autoSpace: true,
    },
    speech: {
      enable: false,
    },
    anchor: 0,
    after: () => {
      result = tempDiv.innerHTML
      tempDiv.remove()
    },
  })

  return result
}

export function getPreviewInstance(instanceId) {
  return PREVIEW_INSTANCES.get(instanceId)
}

export function destroyPreview(instanceId) {
  const instance = PREVIEW_INSTANCES.get(instanceId)
  if (instance) {
    instance.previewEl.remove()
    PREVIEW_INSTANCES.delete(instanceId)
  }
}

export function updateAllPreviewsTheme() {
  const theme = getTheme()
  const contentTheme = theme === 'dark' ? 'dark' : 'light'
  const codeTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  PREVIEW_INSTANCES.forEach(({ container, options }) => {
    const previewEl = container.querySelector('.markdown-preview-content')
    if (previewEl) {
      Vditor.preview(previewEl, options.value || '', {
        mode: contentTheme,
        theme: {
          current: contentTheme,
          path: '',
        },
        hljs: {
          enable: true,
          lineNumber: true,
          style: codeTheme,
        },
        markdown: {
          toc: options.showOutline !== false,
          mark: true,
          footnotes: true,
          autoSpace: true,
        },
        speech: {
          enable: false,
        },
        anchor: 0,
      })
    }
  })
}

export { Vditor }
