import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { createMarkdownPreview } from './markdown-preview.js'
import { downloadMarkdownFile } from './markdown-engine.js'
import { icon } from './icons.js'

const EDITOR_INSTANCES = new Map()

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function createMarkdownEditor(container, options = {}) {
  const instanceId = container.id || `editor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const root = document.createElement('div')
  root.className = 'md-editor-root'
  container.innerHTML = ''
  container.appendChild(root)

  const toolbar = document.createElement('div')
  toolbar.className = 'md-editor-toolbar'

  const body = document.createElement('div')
  body.className = 'md-editor-body'

  const resizeHandle = document.createElement('button')
  resizeHandle.type = 'button'
  resizeHandle.className = 'md-editor-resize-handle'
  resizeHandle.setAttribute('aria-label', '调整编辑器高度')
  resizeHandle.title = '拖拽调整高度'

  const editorMount = document.createElement('div')
  editorMount.className = 'md-editor-pane md-editor-pane--edit'

  const previewMount = document.createElement('div')
  previewMount.className = 'md-editor-pane md-editor-pane--preview'
  previewMount.hidden = true

  body.appendChild(editorMount)
  body.appendChild(previewMount)
  root.appendChild(toolbar)
  root.appendChild(body)
  if (options.resizable !== false) {
    root.appendChild(resizeHandle)
  }

  applySize(root, options)

  let currentMode = 'edit'
  let isDisabled = false
  let leftCountLabel = null
  let rightCountLabel = null
  let previewToggleBtn = null
  let fullscreenToggleBtn = null
  let cleanupResize = null

  const preview = createMarkdownPreview(previewMount, {
    value: options.value || '',
    height: '100%',
    width: '100%',
  })

  const state = EditorState.create({
    doc: options.value || '',
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const value = update.state.doc.toString()
          preview.setValue(value)
          updateCharacterCount(value)
          options.onChange?.(value)
        }
      }),
      EditorView.theme(createTheme(getTheme())),
    ],
  })

  const view = new EditorView({
    state,
    parent: editorMount,
  })

  buildToolbar(toolbar, {
    onInsert: (before, after = '', placeholder = '') => wrapSelection(view, before, after, placeholder),
    onLineWrap: (prefix) => prefixLines(view, prefix),
    onPreviewToggle: () => switchMode(currentMode === 'preview' ? 'edit' : 'preview'),
    onCopy: async () => navigator.clipboard.writeText(getValue()),
    onDownload: () => downloadMarkdownFile(getValue(), options.filename || 'document.md'),
    onFullscreen: () => {
      root.classList.toggle('md-editor-root--fullscreen')
      updateToolbarState()
    },
    registerSpecialButtons: ({ previewBtn, fullscreenBtn }) => {
      previewToggleBtn = previewBtn
      fullscreenToggleBtn = fullscreenBtn
    },
    registerCountLabels: ({  rightCounter }) => {
      rightCountLabel = rightCounter
    },
  })

  if (options.resizable !== false) {
    cleanupResize = setupResizeHandle(container, root, resizeHandle, options)
  }

  function getValue() {
    return view.state.doc.toString()
  }

  function setValue(value) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value || '' },
    })
    updateCharacterCount(value || '')
  }

  function updateCharacterCount(value = getValue()) {
    const text = `字符 ${value.length}`
    if (leftCountLabel) leftCountLabel.textContent = text
    if (rightCountLabel) rightCountLabel.textContent = text
  }

  function switchMode(mode) {
    currentMode = mode === 'preview' ? 'preview' : 'edit'
    const isPreview = currentMode === 'preview'
    previewMount.hidden = !isPreview
    editorMount.hidden = isPreview
    root.classList.toggle('md-editor-root--preview', isPreview)
    if (isPreview) preview.setValue(getValue())
    updateToolbarState()
  }

  function setTheme() {
    // theme switching can be improved later; keep API compatible
  }

  function destroy() {
    cleanupResize?.()
    preview.destroy()
    view.destroy()
    root.remove()
    EDITOR_INSTANCES.delete(instanceId)
  }

  function updateToolbarState() {
    if (previewToggleBtn) {
      const isPreview = currentMode === 'preview'
      previewToggleBtn.innerHTML = isPreview ? icon('edit', 16) : icon('eye', 16)
      previewToggleBtn.setAttribute('data-tooltip', isPreview ? '切换到编辑' : '切换到预览')
      previewToggleBtn.classList.toggle('is-active', isPreview)
    }

    if (fullscreenToggleBtn) {
      const isFullscreen = root.classList.contains('md-editor-root--fullscreen')
      fullscreenToggleBtn.innerHTML = isFullscreen ? icon('minimize', 16) : icon('maximize', 16)
      fullscreenToggleBtn.setAttribute('data-tooltip', isFullscreen ? '退出全屏' : '全屏编辑')
      fullscreenToggleBtn.classList.toggle('is-active', isFullscreen)
    }
  }

  function disabled() {
    if (isDisabled) return
    isDisabled = true
    view.dispatch({ effects: EditorView.editable.of(false) })
    root.classList.add('md-editor-root--disabled')
  }

  function enable() {
    if (!isDisabled) return
    isDisabled = false
    view.dispatch({ effects: EditorView.editable.of(true) })
    root.classList.remove('md-editor-root--disabled')
  }

  const api = {
    instanceId,
    editor: view,
    getValue,
    setValue,
    getHTML: () => previewMount.innerHTML,
    focus: () => view.focus(),
    blur: () => view.contentDOM.blur(),
    disabled,
    enable,
    destroy,
    setTheme,
    switchMode,
    getCurrentMode: () => currentMode,
    insertValue: (value) => insertAtCursor(view, value),
    clearStack: () => {},
  }

  EDITOR_INSTANCES.set(instanceId, api)
  updateCharacterCount(getValue())
  updateToolbarState()
  return api
}

export function getEditorInstance(instanceId) {
  return EDITOR_INSTANCES.get(instanceId)
}

export function destroyEditor(instanceId) {
  EDITOR_INSTANCES.get(instanceId)?.destroy()
}

export function updateAllEditorsTheme() {}

export function createSimpleEditor(container, options = {}) {
  return createMarkdownEditor(container, options)
}

function applySize(root, options) {
  root.style.width = options.width ? normalizeSize(options.width) : '100%'
  root.style.height = options.height ? normalizeSize(options.height) : '100%'
  if (options.minHeight) root.style.minHeight = normalizeSize(options.minHeight)
}

function setupResizeHandle(container, root, handle, options) {
  const minHeight = parsePixelSize(options.minHeight, 220)
  const initialHeight = parsePixelSize(options.height, container.getBoundingClientRect().height || root.getBoundingClientRect().height || minHeight)

  syncHeight(initialHeight)

  let pointerId = null
  let startY = 0
  let startHeight = initialHeight

  function syncHeight(nextHeight) {
    const viewportMax = Math.max(window.innerHeight - 80, minHeight)
    const safeHeight = Math.max(minHeight, Math.min(Math.round(nextHeight), viewportMax))
    const heightValue = `${safeHeight}px`
    container.style.height = heightValue
    root.style.height = heightValue
    return safeHeight
  }

  function handlePointerMove(event) {
    if (pointerId === null || event.pointerId !== pointerId) return
    syncHeight(startHeight + (event.clientY - startY))
  }

  function stopResize(event) {
    if (pointerId === null || (event && event.pointerId !== pointerId)) return
    try {
      handle.releasePointerCapture(pointerId)
    } catch {
      // ignore release failures when pointer capture is already gone
    }
    pointerId = null
    root.classList.remove('md-editor-root--resizing')
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopResize)
    window.removeEventListener('pointercancel', stopResize)
  }

  function startResize(event) {
    if (root.classList.contains('md-editor-root--fullscreen')) return
    pointerId = event.pointerId
    startY = event.clientY
    startHeight = root.getBoundingClientRect().height || minHeight
    root.classList.add('md-editor-root--resizing')
    handle.setPointerCapture(pointerId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
    window.addEventListener('pointercancel', stopResize)
    event.preventDefault()
  }

  handle.addEventListener('pointerdown', startResize)

  return () => {
    stopResize()
    handle.removeEventListener('pointerdown', startResize)
  }
}

function normalizeSize(value) {
  return typeof value === 'number' ? `${value}px` : value
}

function parsePixelSize(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function buildToolbar(toolbar, actions) {
  const buttons = [
    { iconHtml: '<span class="md-toolbar-text">H1</span>', tooltip: '一级标题', onClick: () => actions.onLineWrap('# ') },
    { iconHtml: '<span class="md-toolbar-text">H2</span>', tooltip: '二级标题', onClick: () => actions.onLineWrap('## ') },
    { iconHtml: '<span class="md-toolbar-text">B</span>', tooltip: '粗体', onClick: () => actions.onInsert('**', '**', 'bold') },
    { iconHtml: '<span class="md-toolbar-text">I</span>', tooltip: '斜体', onClick: () => actions.onInsert('*', '*', 'italic') },
    { iconHtml: '<span class="md-toolbar-text">S</span>', tooltip: '删除线', onClick: () => actions.onInsert('~~', '~~', 'strike') },
    { iconHtml: icon('message-square', 16), tooltip: '引用', onClick: () => actions.onLineWrap('> ') },
    { iconHtml: icon('list', 16), tooltip: '无序列表', onClick: () => actions.onLineWrap('- ') },
    { iconHtml: '<span class="md-toolbar-text">1.</span>', tooltip: '有序列表', onClick: () => actions.onLineWrap('1. ') },
    { iconHtml: icon('code', 16), tooltip: '行内代码', onClick: () => actions.onInsert('`', '`', 'code') },
    { iconHtml: icon('terminal', 16), tooltip: '代码块', onClick: () => actions.onInsert('```\n', '\n```', 'code block') },
    { iconHtml: icon('grid', 16), tooltip: '插入表格', onClick: () => actions.onInsert('| Col 1 | Col 2 |\n| --- | --- |\n| A | B |') },
    { type: 'separator' },
    { iconHtml: icon('copy', 16), tooltip: '复制内容', onClick: actions.onCopy },
    { iconHtml: icon('download', 16), tooltip: '保存为 .md', onClick: actions.onDownload },
  ]

  buttons.forEach(({ type, iconHtml, tooltip, onClick }) => {
    if (type === 'separator') {
      const separator = document.createElement('span')
      separator.className = 'md-editor-toolbar-separator'
      separator.setAttribute('aria-hidden', 'true')
      toolbar.appendChild(separator)
      return
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'md-editor-toolbar-btn'
    button.innerHTML = iconHtml
    button.setAttribute('data-tooltip', tooltip)
    button.addEventListener('click', onClick)
    toolbar.appendChild(button)
  })

  const previewBtn = document.createElement('button')
  previewBtn.type = 'button'
  previewBtn.className = 'md-editor-toolbar-btn md-editor-toolbar-btn--toggle'
  previewBtn.addEventListener('click', actions.onPreviewToggle)
  toolbar.appendChild(previewBtn)

  const fullscreenBtn = document.createElement('button')
  fullscreenBtn.type = 'button'
  fullscreenBtn.className = 'md-editor-toolbar-btn md-editor-toolbar-btn--toggle'
  fullscreenBtn.addEventListener('click', actions.onFullscreen)
  toolbar.appendChild(fullscreenBtn)

  const rightCounter = document.createElement('div')
  rightCounter.className = 'md-editor-toolbar-meta md-editor-toolbar-meta--right'
  toolbar.appendChild(rightCounter)

  actions.registerSpecialButtons?.({ previewBtn, fullscreenBtn })
  actions.registerCountLabels?.({ rightCounter })
}

function insertAtCursor(view, text) {
  const range = view.state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: { anchor: range.from + text.length },
  })
  view.focus()
}

function wrapSelection(view, before, after, fallback = '') {
  const range = view.state.selection.main
  const selected = view.state.doc.sliceString(range.from, range.to) || fallback
  const text = `${before}${selected}${after}`
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: { anchor: range.from + before.length, head: range.from + before.length + selected.length },
  })
  view.focus()
}

function prefixLines(view, prefix) {
  const range = view.state.selection.main
  const text = view.state.doc.sliceString(range.from, range.to) || ''
  const target = text || view.state.doc.lineAt(range.from).text
  const prefixed = target
    .split('\n')
    .map(line => `${prefix}${line}`)
    .join('\n')

  const from = text ? range.from : view.state.doc.lineAt(range.from).from
  const to = text ? range.to : view.state.doc.lineAt(range.from).to

  view.dispatch({
    changes: { from, to, insert: prefixed },
    selection: { anchor: from, head: from + prefixed.length },
  })
  view.focus()
}

function createTheme(theme) {
  const dark = theme === 'dark'
  return {
    '&': {
      height: '100%',
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary)',
    },
    '.cm-scroller': {
      fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      lineHeight: '1.75',
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: 'var(--accent)',
    },
    '.cm-line': {
      padding: '0 16px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-tertiary)',
      borderRight: '1px solid var(--border-primary)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    '.cm-activeLine': {
      backgroundColor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--accent-alpha) !important',
    },
  }
}
