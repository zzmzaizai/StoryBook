/**
 * Markdown 编辑器组件
 * 基于 Vditor 封装，支持行号、工具栏、编辑/预览模式切换
 */
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const EDITOR_INSTANCES = new Map()

const THEMES = {
  classic: 'classic',
  dark: 'dark',
}

const MODES = {
  wysiwyg: 'wysiwyg',
  ir: 'ir',
  sv: 'sv',
}

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'classic'
}

function updateEditorTheme(editor) {
  if (!editor) return
  const theme = getTheme()
  const contentTheme = theme === 'dark' ? 'dark' : 'light'
  const codeTheme = theme === 'dark' ? 'github-dark' : 'github-light'

  editor.setTheme(theme, contentTheme, codeTheme)
}

export function createMarkdownEditor(container, options = {}) {
  const theme = getTheme()
  let currentMode = 'wysiwyg'
  let editorInstance = null

  const vditorOptions = {
    mode: options.mode || 'wysiwyg',
    theme: theme,
    icon: 'ant',
    lang: 'zh_CN',
    minHeight: options.minHeight || 300,
    height: options.height || 'auto',
    placeholder: options.placeholder || '请输入内容...',
    value: options.value || '',

    toolbar: options.toolbar !== false ? [
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'list',
      'ordered-list',
      'check',
      '|',
      'quote',
      'code',
      'inline-code',
      '|',
      'table',
      '|',
      'undo',
      'redo',
      '|',
      'fullscreen',
      {
        name: 'preview-toggle',
        tip: '预览',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        click: () => {
          if (!editorInstance) return

          const vditor = editorInstance.vditor
          if (!vditor) return

          const isPreview = currentMode === 'preview'
          const wysiwygEl = vditor.element.querySelector('.vditor-wysiwyg')
          const previewEl = vditor.element.querySelector('.vditor-preview')
          const contentEl = vditor.element.querySelector('.vditor-content')
          const content = editorInstance.getValue()
          const toolbarBtn = vditor.element.querySelector('[data-name="preview-toggle"]')

          if (isPreview) {
            currentMode = 'wysiwyg'
            vditor.currentMode = 'wysiwyg'
            vditor.element.classList.remove('vditor--preview')
            vditor.element.classList.add('vditor--wysiwyg')

            if (wysiwygEl) wysiwygEl.style.display = 'block'
            if (previewEl) previewEl.style.display = 'none'
            if (contentEl) contentEl.style.display = 'block'
            if (toolbarBtn) toolbarBtn.classList.remove('vditor-toolbar__item--active')
          } else {
            currentMode = 'preview'
            vditor.currentMode = 'preview'
            vditor.element.classList.remove('vditor--wysiwyg', 'vditor--sv', 'vditor--ir')
            vditor.element.classList.add('vditor--preview')

            if (previewEl) {
              try {
                if (vditor.preview && vditor.preview.element) {
                  vditor.preview.element.innerHTML = vditor.lute ? vditor.lute.MarkdownStr('', content) : content.replace(/\n/g, '<br>')
                  vditor.preview.element.style.display = 'block'
                } else {
                  previewEl.innerHTML = vditor.lute ? vditor.lute.MarkdownStr('', content) : content.replace(/\n/g, '<br>')
                  previewEl.style.display = 'block'
                }
              } catch (e) {
                previewEl.innerHTML = content.replace(/\n/g, '<br>')
                previewEl.style.display = 'block'
              }
            }

            if (wysiwygEl) wysiwygEl.style.display = 'none'
            if (contentEl) contentEl.style.display = 'block'
            if (toolbarBtn) toolbarBtn.classList.add('vditor-toolbar__item--active')
          }
        }
      },
      
    ] : false,

    toolbarConfig: {
      hide: false,
      pin: true,
    },

    cache: {
      enable: false,
    },

    preview: {
      delay: 500,
      maxWidth: 800,
      mode: theme === 'dark' ? 'dark' : 'light',
      hljs: {
        enable: true,
        lineNumber: true,
        style: theme === 'dark' ? 'github-dark' : 'github-light',
      },
      markdown: {
        toc: true,
        mark: true,
        footnotes: true,
        autoSpace: true,
      },
    },

    hljs: {
      enable: true,
      lineNumber: true,
      style: theme === 'dark' ? 'github-dark' : 'github-light',
    },

    markdown: {
      toc: true,
      mark: true,
      footnotes: true,
      autoSpace: true,
    },

    outline: {
      enable: false,
      position: 'left',
    },

    counter: {
      enable: true,
      type: 'markdown',
    },

    resize: {
      enable: true,
      position: 'bottom',
    },

    hint: {
      parse: false,
      emoji: {
        '+1': '👍',
        '-1': '👎',
        'confused': '😕',
        'eyes': '👀',
        'heart': '❤️',
        'rocket': '🚀',
        'smile': '😄',
        'tada': '🎉',
      },
    },

    undoDelay: 0,

    fullscreen: {
      index: 9999,
    },
  }

  if (options.onChange) {
    vditorOptions.input = (value) => options.onChange(value)
  }

  if (options.onFocus) vditorOptions.focus = options.onFocus
  if (options.onBlur) vditorOptions.blur = options.onBlur

  editorInstance = new Vditor(container, vditorOptions)

  if (options.value && options.value.trim()) {
    setTimeout(() => {
      if (editorInstance && typeof editorInstance.setValue === 'function') {
        editorInstance.setValue(options.value)
      }
    }, 100)
  }

  const instanceId = container.id || `editor-${Date.now()}`
  EDITOR_INSTANCES.set(instanceId, { editor: editorInstance, container, options: vditorOptions })

  return {
    editor: editorInstance,
    instanceId,
    getValue: () => editorInstance.getValue(),
    setValue: (value) => editorInstance.setValue(value),
    getHTML: () => editorInstance.getHTML(),
    focus: () => editorInstance.focus(),
    blur: () => editorInstance.blur(),
    disabled: () => editorInstance.disabled(),
    enable: () => editorInstance.enable(),
    destroy: () => {
      editorInstance.destroy()
      EDITOR_INSTANCES.delete(instanceId)
    },
    setTheme: (themeName) => {
      const contentTheme = themeName === 'dark' ? 'dark' : 'light'
      const codeTheme = themeName === 'dark' ? 'github-dark' : 'github-light'
      editorInstance.setTheme(themeName, contentTheme, codeTheme)
    },
    switchMode: (mode) => {
      const vditor = editorInstance.vditor
      if (!vditor) return

      const wysiwygEl = vditor.element.querySelector('.vditor-wysiwyg')
      const previewEl = vditor.element.querySelector('.vditor-preview')
      const contentEl = vditor.element.querySelector('.vditor-content')
      const toolbarBtn = vditor.element.querySelector('[data-name="preview-toggle"]')
      const content = editorInstance.getValue()

      if (mode === 'preview') {
        currentMode = 'preview'
        vditor.currentMode = 'preview'
        vditor.element.classList.remove('vditor--wysiwyg', 'vditor--sv', 'vditor--ir')
        vditor.element.classList.add('vditor--preview')

        if (wysiwygEl) wysiwygEl.style.display = 'none'

        if (previewEl) {
          try {
            if (vditor.preview && vditor.preview.element) {
              vditor.preview.element.innerHTML = vditor.lute ? vditor.lute.MarkdownStr('', content) : content.replace(/\n/g, '<br>')
              vditor.preview.element.style.display = 'block'
            } else {
              previewEl.innerHTML = vditor.lute ? vditor.lute.MarkdownStr('', content) : content.replace(/\n/g, '<br>')
              previewEl.style.display = 'block'
            }
          } catch (e) {
            previewEl.innerHTML = content.replace(/\n/g, '<br>')
            previewEl.style.display = 'block'
          }
        }

        if (contentEl) contentEl.style.display = 'block'
        if (toolbarBtn) toolbarBtn.classList.add('vditor-toolbar__item--active')
      } else {
        currentMode = 'wysiwyg'
        vditor.currentMode = 'wysiwyg'
        vditor.element.classList.remove('vditor--preview')
        vditor.element.classList.add('vditor--wysiwyg')

        if (wysiwygEl) wysiwygEl.style.display = 'block'
        if (previewEl) previewEl.style.display = 'none'
        if (contentEl) contentEl.style.display = 'block'
        if (toolbarBtn) toolbarBtn.classList.remove('vditor-toolbar__item--active')
      }
    },
    getCurrentMode: () => currentMode,
    insertValue: (value) => editorInstance.insertValue(value),
    clearStack: () => editorInstance.clearStack(),
  }
}

export function getEditorInstance(instanceId) {
  return EDITOR_INSTANCES.get(instanceId)
}

export function destroyEditor(instanceId) {
  const instance = EDITOR_INSTANCES.get(instanceId)
  if (instance) {
    instance.editor.destroy()
    EDITOR_INSTANCES.delete(instanceId)
  }
}

export function updateAllEditorsTheme() {
  const theme = getTheme()
  EDITOR_INSTANCES.forEach(({ editor }) => {
    updateEditorTheme(editor)
  })
}

export function createSimpleEditor(container, options = {}) {
  const simpleOptions = {
    ...options,
    toolbar: [
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'list',
      'ordered-list',
      '|',
      'quote',
      'code',
      'inline-code',
      '|',
      'undo',
      'redo',
    ],
  }
  return createMarkdownEditor(container, simpleOptions)
}

export { THEMES, MODES, Vditor }
