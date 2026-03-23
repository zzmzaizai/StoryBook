/**
 * 通用模态窗组件
 * 支持多种尺寸、拖拽、调整大小、自定义按钮等功能
 */

const MODAL_INSTANCES = new Map()
const MODAL_STACK = []
let modalIdCounter = 0

const MODAL_SIZES = {
  xs: { width: '320px', maxWidth: '90vw' },
  sm: { width: '400px', maxWidth: '90vw' },
  md: { width: '560px', maxWidth: '90vw' },
  lg: { width: '720px', maxWidth: '90vw' },
  xl: { width: '900px', maxWidth: '90vw' },
  full: { width: '95vw', height: '95vh', maxWidth: '95vw', maxHeight: '95vh' },
}

const DEFAULT_OPTIONS = {
  id: null,
  title: '',
  content: '',
  size: 'md',
  width: null,
  height: null,
  minWidth: 300,
  minHeight: 200,
  closable: true,
  maskClosable: true,
  keyboard: true,
  draggable: false,
  resizable: false,
  showFooter: true,
  footer: null,
  buttons: null,
  confirmText: '确定',
  cancelText: '取消',
  showConfirm: true,
  showCancel: true,
  confirmLoading: false,
  closeIcon: true,
  animate: true,
  center: true,
  destroyOnClose: false,
  mask: true,
  zIndex: null,
  className: '',
  headerClassName: '',
  bodyClassName: '',
  footerClassName: '',
  onOpen: null,
  onClose: null,
  onConfirm: null,
  onCancel: null,
  onDragStart: null,
  onDragEnd: null,
  onResizeStart: null,
  onResizeEnd: null,
}

function generateId() {
  return `modal-${++modalIdCounter}-${Date.now()}`
}

function getHighestZIndex() {
  let maxZ = 1000
  MODAL_INSTANCES.forEach((instance) => {
    if (instance.isOpen) {
      const z = parseInt(instance.modal.style.zIndex) || 1000
      if (z > maxZ) maxZ = z
    }
  })
  return maxZ + 10
}

function createButton(text, type = 'default', options = {}) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `modal-btn modal-btn-${type}`
  btn.textContent = text

  if (options.className) {
    btn.classList.add(options.className)
  }

  if (options.loading) {
    btn.classList.add('modal-btn-loading')
    btn.disabled = true
  }

  if (options.disabled) {
    btn.disabled = true
  }

  if (options.icon) {
    const iconSpan = document.createElement('span')
    iconSpan.className = 'modal-btn-icon'
    iconSpan.innerHTML = options.icon
    btn.prepend(iconSpan)
  }

  return btn
}

function createModalElement(options) {
  const modal = document.createElement('div')
  modal.className = `modal-wrapper ${options.className}`.trim()
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.setAttribute('aria-labelledby', `${options.id}-title`)

  if (options.zIndex) {
    modal.style.zIndex = options.zIndex
  }

  const sizeConfig = MODAL_SIZES[options.size] || MODAL_SIZES.md

  let styleStr = ''
  if (options.width) {
    styleStr += `width: ${typeof options.width === 'number' ? options.width + 'px' : options.width};`
  } else if (sizeConfig.width) {
    styleStr += `width: ${sizeConfig.width};`
  }
  if (options.height) {
    styleStr += `height: ${typeof options.height === 'number' ? options.height + 'px' : options.height};`
  } else if (sizeConfig.height) {
    styleStr += `height: ${sizeConfig.height};`
  }
  if (sizeConfig.maxWidth) {
    styleStr += `max-width: ${sizeConfig.maxWidth};`
  }
  if (sizeConfig.maxHeight) {
    styleStr += `max-height: ${sizeConfig.maxHeight};`
  }

  modal.innerHTML = `
    ${options.mask ? '<div class="modal-mask"></div>' : ''}
    <div class="modal-container ${options.center ? 'modal-center' : ''}" style="${styleStr}">
      ${options.closable && options.closeIcon ? `
        <button type="button" class="modal-close" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ` : ''}
      ${options.showHeader !== false && options.title ? `
        <div class="modal-header ${options.headerClassName}".trim()">
          <h3 class="modal-title" id="${options.id}-title">${options.title}</h3>
        </div>
      ` : ''}
      <div class="modal-body ${options.bodyClassName}".trim()">
        <div class="modal-content"></div>
      </div>
      ${options.showFooter ? `
        <div class="modal-footer ${options.footerClassName}".trim()"></div>
      ` : ''}
    </div>
  `

  return modal
}

function setupDraggable(modal, container, options) {
  const header = modal.querySelector('.modal-header')
  if (!header) return

  let isDragging = false
  let startX, startY, startLeft, startTop

  header.style.cursor = 'move'

  const onMouseDown = (e) => {
    if (e.target.closest('.modal-close')) return

    isDragging = true
    startX = e.clientX
    startY = e.clientY

    const rect = container.getBoundingClientRect()
    startLeft = rect.left
    startTop = rect.top

    container.style.position = 'fixed'
    container.style.left = startLeft + 'px'
    container.style.top = startTop + 'px'
    container.style.margin = '0'
    container.style.transform = 'none'

    document.body.style.userSelect = 'none'

    if (options.onDragStart) {
      options.onDragStart({ x: startLeft, y: startTop })
    }

    e.preventDefault()
  }

  const onMouseMove = (e) => {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const newLeft = startLeft + deltaX
    const newTop = startTop + deltaY

    container.style.left = newLeft + 'px'
    container.style.top = newTop + 'px'
  }

  const onMouseUp = () => {
    if (!isDragging) return

    isDragging = false
    document.body.style.userSelect = ''

    if (options.onDragEnd) {
      const rect = container.getBoundingClientRect()
      options.onDragEnd({ x: rect.left, y: rect.top })
    }
  }

  header.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)

  return () => {
    header.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
}

function setupResizable(modal, container, options) {
  const resizeHandle = document.createElement('div')
  resizeHandle.className = 'modal-resize-handle'
  container.appendChild(resizeHandle)

  let isResizing = false
  let startX, startY, startWidth, startHeight

  const onMouseDown = (e) => {
    isResizing = true
    startX = e.clientX
    startY = e.clientY

    const rect = container.getBoundingClientRect()
    startWidth = rect.width
    startHeight = rect.height

    document.body.style.userSelect = 'none'

    if (options.onResizeStart) {
      options.onResizeStart({ width: startWidth, height: startHeight })
    }

    e.preventDefault()
  }

  const onMouseMove = (e) => {
    if (!isResizing) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    let newWidth = startWidth + deltaX
    let newHeight = startHeight + deltaY

    newWidth = Math.max(options.minWidth, newWidth)
    newHeight = Math.max(options.minHeight, newHeight)

    container.style.width = newWidth + 'px'
    container.style.height = newHeight + 'px'
  }

  const onMouseUp = () => {
    if (!isResizing) return

    isResizing = false
    document.body.style.userSelect = ''

    if (options.onResizeEnd) {
      const rect = container.getBoundingClientRect()
      options.onResizeEnd({ width: rect.width, height: rect.height })
    }
  }

  resizeHandle.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)

  return () => {
    resizeHandle.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    resizeHandle.remove()
  }
}

export class Modal {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.id = this.options.id || generateId()
    this.options.id = this.id
    this.isOpen = false
    this.modal = null
    this.container = null
    this.cleanupFns = []
    this.resolvePromise = null

    this.init()
  }

  init() {
    this.modal = createModalElement(this.options)
    this.container = this.modal.querySelector('.modal-container')
    this.contentEl = this.modal.querySelector('.modal-content')
    this.footerEl = this.modal.querySelector('.modal-footer')

    this.setupContent()
    this.setupFooter()
    this.setupEvents()

    if (this.options.draggable) {
      const cleanup = setupDraggable(this.modal, this.container, this.options)
      this.cleanupFns.push(cleanup)
    }

    if (this.options.resizable) {
      const cleanup = setupResizable(this.modal, this.container, this.options)
      this.cleanupFns.push(cleanup)
    }

    MODAL_INSTANCES.set(this.id, this)
  }

  setupContent() {
    const { content } = this.options

    if (typeof content === 'string') {
      this.contentEl.innerHTML = content
    } else if (content instanceof HTMLElement) {
      this.contentEl.appendChild(content)
    } else if (content instanceof DocumentFragment) {
      this.contentEl.appendChild(content)
    }

    if (this.options.footer) {
      const footerContent = this.options.footer
      if (typeof footerContent === 'string') {
        this.footerEl.innerHTML = footerContent
      } else if (footerContent instanceof HTMLElement) {
        this.footerEl.appendChild(footerContent)
      }
    }
  }

  setupFooter() {
    if (!this.footerEl || this.options.footer) return

    const buttons = this.options.buttons || this.getDefaultButtons()
    buttons.forEach((btnConfig) => {
      const btn = createButton(btnConfig.text, btnConfig.type || 'default', btnConfig)

      if (btnConfig.onClick) {
        btn.addEventListener('click', (e) => {
          btnConfig.onClick(e, this)
        })
      }

      this.footerEl.appendChild(btn)
    })
  }

  getDefaultButtons() {
    const buttons = []

    if (this.options.showCancel) {
      buttons.push({
        text: this.options.cancelText,
        type: 'default',
        onClick: () => this.cancel(),
      })
    }

    if (this.options.showConfirm) {
      buttons.push({
        text: this.options.confirmText,
        type: 'primary',
        loading: this.options.confirmLoading,
        onClick: () => this.confirm(),
      })
    }

    return buttons
  }

  setupEvents() {
    const closeBtn = this.modal.querySelector('.modal-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close())
    }

    const mask = this.modal.querySelector('.modal-mask')
    if (mask && this.options.maskClosable) {
      mask.addEventListener('click', () => this.close())
    }

    if (this.options.keyboard) {
      const handleKeydown = (e) => {
        if (e.key === 'Escape' && MODAL_STACK[MODAL_STACK.length - 1] === this.id) {
          this.close()
        }
      }
      document.addEventListener('keydown', handleKeydown)
      this.cleanupFns.push(() => document.removeEventListener('keydown', handleKeydown))
    }

    this.container.addEventListener('click', (e) => e.stopPropagation())
  }

  open() {
    if (this.isOpen) return this

    document.body.appendChild(this.modal)
    document.body.style.overflow = 'hidden'

    if (!this.options.zIndex) {
      this.modal.style.zIndex = getHighestZIndex()
    }

    MODAL_STACK.push(this.id)

    requestAnimationFrame(() => {
      this.modal.classList.add('modal-open')
      this.isOpen = true

      if (this.options.onOpen) {
        this.options.onOpen(this)
      }
    })

    return new Promise((resolve) => {
      this.resolvePromise = resolve
    })
  }

  close(result) {
    if (!this.isOpen) return this

    this.modal.classList.remove('modal-open')
    this.modal.classList.add('modal-closing')

    setTimeout(() => {
      this.modal.remove()
      document.body.style.overflow = ''

      const stackIndex = MODAL_STACK.indexOf(this.id)
      if (stackIndex > -1) {
        MODAL_STACK.splice(stackIndex, 1)
      }

      this.isOpen = false

      if (this.options.destroyOnClose) {
        this.destroy()
      }

      if (this.options.onClose) {
        this.options.onClose(result, this)
      }

      if (this.resolvePromise) {
        this.resolvePromise({ action: 'close', result })
      }
    }, this.options.animate ? 300 : 0)

    return this
  }

  confirm() {
    if (this.options.onConfirm) {
      const result = this.options.onConfirm(this)
      if (result === false) return this
      if (result instanceof Promise) {
        return result.then((res) => {
          if (res !== false) {
            this.close({ action: 'confirm' })
          }
        })
      }
    }
    this.close({ action: 'confirm' })
    return this
  }

  cancel() {
    if (this.options.onCancel) {
      const result = this.options.onCancel(this)
      if (result === false) return this
    }
    this.close({ action: 'cancel' })
    return this
  }

  setContent(content) {
    this.contentEl.innerHTML = ''
    if (typeof content === 'string') {
      this.contentEl.innerHTML = content
    } else if (content instanceof HTMLElement) {
      this.contentEl.appendChild(content)
    }
    return this
  }

  setTitle(title) {
    const titleEl = this.modal.querySelector('.modal-title')
    if (titleEl) {
      titleEl.textContent = title
    }
    return this
  }

  setButtons(buttons) {
    if (!this.footerEl) return this
    this.footerEl.innerHTML = ''
    buttons.forEach((btnConfig) => {
      const btn = createButton(btnConfig.text, btnConfig.type || 'default', btnConfig)
      if (btnConfig.onClick) {
        btn.addEventListener('click', (e) => btnConfig.onClick(e, this))
      }
      this.footerEl.appendChild(btn)
    })
    return this
  }

  setLoading(loading, buttonType = 'primary') {
    const btn = this.footerEl?.querySelector(`.modal-btn-${buttonType}`)
    if (btn) {
      btn.classList.toggle('modal-btn-loading', loading)
      btn.disabled = loading
    }
    return this
  }

  destroy() {
    if (this.isOpen) {
      this.close()
    }

    this.cleanupFns.forEach((fn) => fn())
    this.cleanupFns = []

    MODAL_INSTANCES.delete(this.id)
  }

  static get(id) {
    return MODAL_INSTANCES.get(id)
  }

  static closeAll() {
    MODAL_INSTANCES.forEach((instance) => {
      if (instance.isOpen) {
        instance.close()
      }
    })
  }

  static destroyAll() {
    MODAL_INSTANCES.forEach((instance) => {
      instance.destroy()
    })
  }
}

export function createModal(options) {
  const modal = new Modal(options)
  modal.open()
  return modal
}

export function alert(content, title = '提示', options = {}) {
  const modal = new Modal({
    title,
    content,
    size: 'sm',
    showCancel: false,
    confirmText: '确定',
    ...options,
  })
  return modal.open()
}

export function confirm(content, title = '确认', options = {}) {
  const modal = new Modal({
    title,
    content,
    size: 'sm',
    confirmText: '确定',
    cancelText: '取消',
    ...options,
  })
  return modal.open()
}

export function prompt(content, title = '输入', options = {}) {
  const inputId = `prompt-input-${Date.now()}`
  const inputContainer = document.createElement('div')
  inputContainer.innerHTML = `
    <div class="modal-prompt-content">${content ? `<p>${content}</p>` : ''}</div>
    <input type="${options.inputType || 'text'}" 
           id="${inputId}" 
           class="modal-input" 
           placeholder="${options.placeholder || ''}"
           value="${options.defaultValue || ''}"
           ${options.maxLength ? `maxlength="${options.maxLength}"` : ''}
    />
  `

  const modal = new Modal({
    title,
    content: inputContainer,
    size: 'sm',
    confirmText: '确定',
    cancelText: '取消',
    ...options,
    onConfirm: (instance) => {
      const input = instance.contentEl.querySelector(`#${inputId}`)
      if (input) {
        if (options.validate) {
          const error = options.validate(input.value)
          if (error) {
            input.classList.add('modal-input-error')
            return false
          }
        }
        instance.inputValue = input.value
      }
    },
  })

  modal.open()

  setTimeout(() => {
    const input = modal.contentEl.querySelector(`#${inputId}`)
    if (input) {
      input.focus()
      input.select()
    }
  }, 100)

  return modal
}

export function success(content, title = '成功', options = {}) {
  const contentWithIcon = `
    <div class="modal-result">
      <div class="modal-result-icon modal-result-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="modal-result-text">${content}</div>
    </div>
  `
  return alert(contentWithIcon, title, { showFooter: false, ...options })
}

export function error(content, title = '错误', options = {}) {
  const contentWithIcon = `
    <div class="modal-result">
      <div class="modal-result-icon modal-result-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      </div>
      <div class="modal-result-text">${content}</div>
    </div>
  `
  return alert(contentWithIcon, title, { showFooter: false, ...options })
}

export function warning(content, title = '警告', options = {}) {
  const contentWithIcon = `
    <div class="modal-result">
      <div class="modal-result-icon modal-result-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <div class="modal-result-text">${content}</div>
    </div>
  `
  return alert(contentWithIcon, title, { showFooter: false, ...options })
}

export function info(content, title = '信息', options = {}) {
  const contentWithIcon = `
    <div class="modal-result">
      <div class="modal-result-icon modal-result-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <div class="modal-result-text">${content}</div>
    </div>
  `
  return alert(contentWithIcon, title, { showFooter: false, ...options })
}

export { MODAL_SIZES }
