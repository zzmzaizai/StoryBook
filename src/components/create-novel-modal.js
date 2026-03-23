import { Modal } from '../lib/modal.js'
import { ICONS } from '../lib/icons.js'
import { ENUMS } from '../api/tauri.js'

export class CreateNovelModal {
  constructor(options = {}) {
    this.options = {
      onConfirm: null,
      onCancel: null,
      ...options,
    }
    this.modal = null
    this.formData = {
      title: '',
      description: '',
      style: 1,
      target_audience: 4,
      length_type: 3,
    }
  }

  show() {
    const content = this.createContent()
    
    this.modal = new Modal({
      title: '新建小说项目',
      content: content,
      size: 'md',
      showFooter: true,
      confirmText: '创建',
      cancelText: '取消',
      showConfirm: true,
      showCancel: true,
      className: 'create-novel-modal',
      onConfirm: () => this.handleConfirm(),
      onCancel: () => this.handleCancel(),
    })
    
    this.modal.open()
    this.bindEvents()
    
    return this.modal
  }

  createContent() {
    const container = document.createElement('div')
    container.className = 'create-novel-form'
    
    container.innerHTML = `
      <div class="form-group">
        <label class="form-label required">小说名称</label>
        <input type="text" id="novel-title" class="form-input" placeholder="请输入小说名称" maxlength="50" />
        <div class="form-hint">最多50个字符</div>
      </div>
      
      <div class="form-group">
        <label class="form-label">简介</label>
        <textarea id="novel-description" class="form-textarea" placeholder="请输入小说简介（可选）" rows="3" maxlength="500"></textarea>
        <div class="form-hint">最多500个字符</div>
      </div>
      
      <div class="form-row">
        <div class="form-group form-group-half">
          <label class="form-label">小说风格</label>
          <select id="novel-style" class="form-input">
            ${Object.entries(ENUMS.NovelStyle).map(([k, v]) => 
              `<option value="${k}" ${this.formData.style == k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group form-group-half">
          <label class="form-label">目标受众</label>
          <select id="novel-audience" class="form-input">
            ${Object.entries(ENUMS.TargetAudience).map(([k, v]) => 
              `<option value="${k}" ${this.formData.target_audience == k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">篇幅类型</label>
        <div class="length-type-grid">
          ${Object.entries(ENUMS.NovelLengthType).map(([k, v]) => `
            <div class="length-type-option ${this.formData.length_type == k ? 'active' : ''}" data-value="${k}">
              <div class="length-type-icon">${this.getLengthIcon(k)}</div>
              <div class="length-type-name">${v}</div>
              <div class="length-type-desc">${this.getLengthDesc(k)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    
    return container
  }

  getLengthIcon(type) {
    const icons = {
      1: ICONS['file-text'],
      2: ICONS['file-text'] + ICONS['file-text'],
      3: ICONS['file-text'] + ICONS['file-text'] + ICONS['file-text'],
    }
    return icons[type] || ICONS['file-text']
  }

  getLengthDesc(type) {
    const descs = {
      1: '1-10万字',
      2: '10-50万字',
      3: '50万字以上',
    }
    return descs[type] || ''
  }

  bindEvents() {
    const contentEl = this.modal.contentEl
    
    const titleInput = contentEl.querySelector('#novel-title')
    const descInput = contentEl.querySelector('#novel-description')
    const styleSelect = contentEl.querySelector('#novel-style')
    const audienceSelect = contentEl.querySelector('#novel-audience')
    const lengthOptions = contentEl.querySelectorAll('.length-type-option')
    
    titleInput.addEventListener('input', (e) => {
      this.formData.title = e.target.value.trim()
    })
    
    descInput.addEventListener('input', (e) => {
      this.formData.description = e.target.value.trim()
    })
    
    styleSelect.addEventListener('change', (e) => {
      this.formData.style = parseInt(e.target.value)
    })
    
    audienceSelect.addEventListener('change', (e) => {
      this.formData.target_audience = parseInt(e.target.value)
    })
    
    lengthOptions.forEach(option => {
      option.addEventListener('click', () => {
        lengthOptions.forEach(o => o.classList.remove('active'))
        option.classList.add('active')
        this.formData.length_type = parseInt(option.dataset.value)
      })
    })
    
    titleInput.focus()
  }

  handleConfirm() {
    const contentEl = this.modal.contentEl
    const titleInput = contentEl.querySelector('#novel-title')
    
    if (!this.formData.title) {
      titleInput.classList.add('form-input-error')
      titleInput.focus()
      return false
    }
    
    if (this.options.onConfirm) {
      this.options.onConfirm(this.formData)
    }
    
    return true
  }

  handleCancel() {
    if (this.options.onCancel) {
      this.options.onCancel()
    }
  }

  close() {
    if (this.modal) {
      this.modal.close()
    }
  }
}

export function showCreateNovelModal(options = {}) {
  const instance = new CreateNovelModal(options)
  return instance.show()
}
