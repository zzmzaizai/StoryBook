import { Modal } from '../lib/modal.js'
import { ICONS } from '../lib/icons.js'
import { ENUMS, api } from '../api/tauri.js'

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
    <div class="form-group" style="margin-bottom: var(--space-lg);">
      <button id="ai-generate-btn" class="btn btn-secondary" style="width: 100%;">
        ${ICONS.sparkles}<span>AI 创建小说</span>
      </button>
      <div class="form-hint" style="margin-top: var(--space-xs);">让 AI 帮你生成小说基础信息</div>
    </div>

    <div class="divider" style="display: flex; align-items: center; margin: var(--space-lg) 0;">
      <div style="flex: 1; height: 1px; background: var(--border-primary);"></div>
      <span style="padding: 0 var(--space-md); color: var(--text-tertiary); font-size: var(--font-size-xs);">或手动填写</span>
      <div style="flex: 1; height: 1px; background: var(--border-primary);"></div>
    </div>

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
      1: '100万字以上',
      2: '30-100万字',
      3: '10-30万字',
      4: '10万字以下',
      5: '待定',
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
    const aiGenerateBtn = contentEl.querySelector('#ai-generate-btn')

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

    aiGenerateBtn.addEventListener('click', () => {
      this.showAiGenerateModal()
    })

    titleInput.focus()
  }

  showAiGenerateModal() {
    const self = this
    let aiModal = null

    const handleAiGenerate = async () => {
      const requirementInput = aiModal.contentEl.querySelector('#ai-requirement')
      const requirement = requirementInput.value.trim()

      if (!requirement) {
        requirementInput.classList.add('form-input-error')
        requirementInput.focus()
        return false
      }

      aiModal.setLoading(true)

      try {
        console.log('Calling aiGenerateNovelInfo with:', requirement)
        const result = await api.aiGenerateNovelInfo(requirement)
        console.log('AI result:', result)

        self.fillFormWithAiResult(result)
        aiModal.close()

        return true
      } catch (error) {
        console.error('AI generate error:', error)
        alert('AI 生成失败: ' + error)
        return false
      } finally {
        aiModal.setLoading(false)
      }
    }

    aiModal = new Modal({
      title: 'AI 创建小说',
      size: 'md',
      showFooter: true,
      confirmText: '生成',
      cancelText: '取消',
      showConfirm: true,
      showCancel: true,
      className: 'ai-generate-novel-modal',
      onConfirm: handleAiGenerate,
    })

    const content = document.createElement('div')
    content.className = 'ai-generate-form'
    content.innerHTML = `
      <div class="form-group">
        <label class="form-label required">描述你的小说想法</label>
        <textarea id="ai-requirement" class="form-textarea" placeholder="例如：我想写一部都市重生文，主角是一个中年程序员重生回到大学时代，利用前世记忆创业的故事..." rows="5" maxlength="500"></textarea>
        <div class="form-hint">描述越详细，AI 生成的信息越准确（最多500字）</div>
      </div>
      <div class="form-group">
        <label class="form-label">参考示例</label>
        <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--text-secondary);">
          <p style="margin: 0 0 var(--space-sm) 0;"><strong>玄幻类：</strong>一个少年意外获得上古传承，在修仙世界中一步步崛起的故事</p>
          <p style="margin: 0 0 var(--space-sm) 0;"><strong>都市类：</strong>重生回2010年的主角，利用互联网风口创业成为商业巨头</p>
          <p style="margin: 0;"><strong>言情类：</strong>职场女强人与霸道总裁的契约婚姻，逐渐发展成真爱</p>
        </div>
      </div>
    `

    aiModal.setContent(content)
    aiModal.open()
  }

  fillFormWithAiResult(result) {
    const contentEl = this.modal.contentEl

    const titleInput = contentEl.querySelector('#novel-title')
    const descInput = contentEl.querySelector('#novel-description')
    const styleSelect = contentEl.querySelector('#novel-style')
    const audienceSelect = contentEl.querySelector('#novel-audience')
    const lengthOptions = contentEl.querySelectorAll('.length-type-option')

    if (result.title) {
      titleInput.value = result.title
      this.formData.title = result.title
    }

    if (result.description) {
      descInput.value = result.description
      this.formData.description = result.description
    }

    if (result.style) {
      styleSelect.value = result.style
      this.formData.style = result.style
    }

    if (result.target_audience) {
      audienceSelect.value = result.target_audience
      this.formData.target_audience = result.target_audience
    }

    if (result.length_type) {
      lengthOptions.forEach(o => o.classList.remove('active'))
      const activeOption = contentEl.querySelector(`.length-type-option[data-value="${result.length_type}"]`)
      if (activeOption) {
        activeOption.classList.add('active')
        this.formData.length_type = result.length_type
      }
    }

    titleInput.classList.remove('form-input-error')
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