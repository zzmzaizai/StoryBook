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
      estimated_chapter_count: null,
      estimated_total_word_count: null,
      estimated_words_per_chapter: null,
    }
  }

  show() {
    const content = this.createContent()

    this.modal = new Modal({
      title: '新建小说项目',
      content: content,
      size: 'lg',
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
    <section class="novel-create-hero">
      <div class="novel-create-hero__glow"></div>
      <div class="novel-create-hero__content">
        <div class="novel-create-hero__eyebrow">Story Forge</div>
        <h2 class="novel-create-hero__title">从一个念头，长出一部长篇故事</h2>
        <p class="novel-create-hero__desc">你可以直接手动填写，也可以让 AI 先生成标题、简介、风格与篇幅建议，再继续细化设定。</p>
        <div class="novel-create-hero__chips">
          <span class="novel-create-chip">世界观雏形</span>
          <span class="novel-create-chip">角色定位</span>
          <span class="novel-create-chip">篇幅预估</span>
        </div>
      </div>
    </section>

    <div class="novel-create-shell">
    <section class="novel-create-panel novel-create-panel--primary">
      <div class="novel-create-panel__header">
        <div>
          <div class="novel-create-panel__label">基础信息</div>
          <div class="novel-create-panel__hint">先定义故事名字、气质与目标读者</div>
        </div>
        <button id="ai-generate-btn" class="novel-create-ai-trigger" type="button">
          ${ICONS.sparkles}<span>AI 灵感生成</span>
        </button>
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
    </section>

    <aside class="novel-create-panel novel-create-panel--aside">
      <div class="novel-create-panel__label">篇幅预估</div>
      <div class="novel-create-panel__hint">这些参数会在新项目创建后直接写入小说基础资料，AI 生成时也会自动填充。</div>

      <div class="form-group">
        <label class="form-label">预估章节数</label>
        <input type="number" id="estimated-chapter-count" class="form-input" min="1" max="9999" placeholder="例如 80" />
      </div>

      <div class="form-group">
        <label class="form-label">预估总字数</label>
        <input type="number" id="estimated-total-word-count" class="form-input" min="1000" max="99999999" step="1000" placeholder="例如 240000" />
      </div>

      <div class="form-group">
        <label class="form-label">每章预估字数</label>
        <input type="number" id="estimated-words-per-chapter" class="form-input" min="500" max="50000" step="100" placeholder="例如 3000" />
      </div>

      <div class="novel-create-metric-note">
        <div class="novel-create-metric-note__title">填写建议</div>
        <div class="novel-create-metric-note__text">如果你暂时不确定，也可以先留空；使用 AI 创建时，系统会优先帮你生成合理的章节规模与字数区间。</div>
      </div>
    </aside>
    </div>
    `

    return container
  }

  getLengthIcon(type) {
    const icons = {
      1: ICONS.book,
      2: ICONS.book,
      3: ICONS.book,
      4: ICONS['file-text'],
      5: ICONS.clock,
    }
    return icons[type] || ICONS.book
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
    const chapterCountInput = contentEl.querySelector('#estimated-chapter-count')
    const totalWordCountInput = contentEl.querySelector('#estimated-total-word-count')
    const wordsPerChapterInput = contentEl.querySelector('#estimated-words-per-chapter')
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

    chapterCountInput.addEventListener('input', (e) => {
      this.formData.estimated_chapter_count = parseOptionalInt(e.target.value)
    })

    totalWordCountInput.addEventListener('input', (e) => {
      this.formData.estimated_total_word_count = parseOptionalInt(e.target.value)
    })

    wordsPerChapterInput.addEventListener('input', (e) => {
      this.formData.estimated_words_per_chapter = parseOptionalInt(e.target.value)
    })

    this.setupFooterActions()

    titleInput.focus()
  }

  setupFooterActions() {
    if (!this.modal?.footerEl) return

    const footerEl = this.modal.footerEl
    footerEl.classList.add('create-novel-footer')

    const existingAiBtn = footerEl.querySelector('#footer-ai-generate-btn')
    if (existingAiBtn) return

    const aiBtn = document.createElement('button')
    aiBtn.type = 'button'
    aiBtn.id = 'footer-ai-generate-btn'
    aiBtn.className = 'novel-create-footer-ai'
    aiBtn.innerHTML = `${ICONS.sparkles}<span>AI 创建小说</span>`
    aiBtn.addEventListener('click', () => this.showAiGenerateModal())

    const rightGroup = document.createElement('div')
    rightGroup.className = 'create-novel-footer__actions'

    Array.from(footerEl.children).forEach((child) => {
      rightGroup.appendChild(child)
    })

    footerEl.innerHTML = ''
    footerEl.appendChild(aiBtn)
    footerEl.appendChild(rightGroup)
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
        const message = typeof error === 'string'
          ? error
          : error?.message || JSON.stringify(error)
        alert('AI 生成失败: ' + message)
        return false
      } finally {
        aiModal.setLoading(false)
      }
    }

    aiModal = new Modal({
      title: 'AI 创建小说',
      size: 'lg',
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
      <section class="ai-generate-stage">
        <div class="ai-generate-stage__hero">
          <div class="ai-generate-stage__eyebrow">Creative Engine</div>
          <h2 class="ai-generate-stage__title">给我一个故事火种，我帮你铺开整片星图</h2>
          <p class="ai-generate-stage__desc">输入一句核心设想，AI 将为你生成标题、简介、风格、受众与篇幅建议，作为开篇创作的第一版蓝图。</p>
        </div>

        <div class="ai-generate-stage__layout">
          <div class="ai-generate-stage__main">
            <div class="form-group">
              <label class="form-label required">描述你的小说想法</label>
              <textarea id="ai-requirement" class="form-textarea ai-generate-stage__textarea" placeholder="例如：我想写一部都市重生文，主角是一个中年程序员重生回到大学时代，利用前世记忆创业的故事..." rows="6" maxlength="500"></textarea>
              <div class="form-hint">建议写出题材、主角、冲突和独特卖点，越具体越容易生成高质量设定</div>
            </div>
          </div>

          <aside class="ai-generate-stage__aside">
            <div class="ai-generate-stage__card">
              <div class="ai-generate-stage__card-title">灵感参考</div>
              <div class="ai-generate-stage__example"><strong>玄幻：</strong>一个少年意外获得上古传承，在修仙世界中一步步崛起的故事</div>
              <div class="ai-generate-stage__example"><strong>都市：</strong>重生回2010年的主角，利用互联网风口创业成为商业巨头</div>
              <div class="ai-generate-stage__example"><strong>言情：</strong>职场女强人与霸道总裁的契约婚姻，逐渐发展成真爱</div>
            </div>
          </aside>
        </div>
      </section>
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
    const chapterCountInput = contentEl.querySelector('#estimated-chapter-count')
    const totalWordCountInput = contentEl.querySelector('#estimated-total-word-count')
    const wordsPerChapterInput = contentEl.querySelector('#estimated-words-per-chapter')

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

    if (result.estimated_chapter_count && chapterCountInput) {
      chapterCountInput.value = result.estimated_chapter_count
      this.formData.estimated_chapter_count = result.estimated_chapter_count
    }

    if (result.estimated_total_word_count && totalWordCountInput) {
      totalWordCountInput.value = result.estimated_total_word_count
      this.formData.estimated_total_word_count = result.estimated_total_word_count
    }

    if (result.estimated_words_per_chapter && wordsPerChapterInput) {
      wordsPerChapterInput.value = result.estimated_words_per_chapter
      this.formData.estimated_words_per_chapter = result.estimated_words_per_chapter
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

function parseOptionalInt(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null

  const parsed = parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const style = document.createElement('style')
style.textContent = `
.create-novel-modal .modal-container,
.ai-generate-novel-modal .modal-container {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top left, rgba(255, 188, 92, 0.16), transparent 34%),
    radial-gradient(circle at top right, rgba(105, 164, 255, 0.14), transparent 36%),
    linear-gradient(180deg, rgba(16, 22, 36, 0.98), rgba(11, 16, 28, 0.98));
  box-shadow: 0 36px 120px rgba(0, 0, 0, 0.42);
  overflow: hidden;
}

.create-novel-modal .modal-container {
  width: min(1120px, 92vw) !important;
  max-width: min(1120px, 92vw) !important;
}

.ai-generate-novel-modal .modal-container {
  width: min(980px, 92vw) !important;
  max-width: min(980px, 92vw) !important;
}

.create-novel-modal .modal-header,
.ai-generate-novel-modal .modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
}

.create-novel-form,
.ai-generate-form {
  color: rgba(245, 247, 252, 0.96);
}

.create-novel-modal .modal-body,
.ai-generate-novel-modal .modal-body {
  max-height: min(78vh, 860px);
  overflow: auto;
}

.novel-create-hero,
.ai-generate-stage__hero {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 18px 20px;
  margin-bottom: 14px;
  background: linear-gradient(135deg, rgba(255, 184, 107, 0.12), rgba(83, 135, 255, 0.08) 52%, rgba(255, 255, 255, 0.03));
}

.novel-create-hero__glow {
  position: absolute;
  inset: auto -12% -35% auto;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 188, 92, 0.24), transparent 68%);
  pointer-events: none;
}

.novel-create-hero__content,
.ai-generate-stage__hero {
  position: relative;
  z-index: 1;
}

.novel-create-hero__eyebrow,
.ai-generate-stage__eyebrow,
.novel-create-panel__label {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 11px;
  color: rgba(255, 214, 154, 0.84);
  margin-bottom: 6px;
}

.novel-create-hero__title,
.ai-generate-stage__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 700;
  color: #fff7eb;
}

.novel-create-hero__desc,
.ai-generate-stage__desc,
.novel-create-panel__hint {
  margin: 8px 0 0;
  color: rgba(235, 239, 248, 0.72);
  line-height: 1.7;
}

.novel-create-hero__chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.novel-create-chip {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(245, 247, 252, 0.84);
  font-size: 12px;
}

.novel-create-panel,
.ai-generate-stage__layout {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.03);
  padding: 22px;
}

.novel-create-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(240px, 0.68fr);
  gap: 16px;
}

.novel-create-panel--primary {
  min-width: 0;
}

.novel-create-panel--aside {
  min-width: 0;
}

.length-type-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.length-type-option {
  padding: 8px 6px;
  min-height: 82px;
  border-radius: 14px;
}

.length-type-icon {
  transform: scale(0.72);
  transform-origin: center;
  margin-bottom: 2px;
}

.length-type-option[data-value="1"] .length-type-icon {
  color: rgba(255, 183, 94, 0.95);
}

.length-type-option[data-value="2"] .length-type-icon {
  color: rgba(255, 210, 132, 0.95);
}

.length-type-option[data-value="3"] .length-type-icon {
  color: rgba(155, 196, 255, 0.95);
}

.length-type-option[data-value="4"] .length-type-icon {
  color: rgba(168, 242, 216, 0.95);
}

.length-type-option[data-value="5"] .length-type-icon {
  color: rgba(214, 191, 255, 0.95);
}

.length-type-name {
  font-size: 12px;
  line-height: 1.25;
}

.length-type-desc {
  font-size: 10px;
  line-height: 1.25;
}

.novel-create-panel__header,
.ai-generate-stage__layout {
  display: flex;
  gap: 20px;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.novel-create-ai-trigger,
.novel-create-footer-ai {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 206, 134, 0.3);
  border-radius: 999px;
  padding: 11px 16px;
  background: linear-gradient(135deg, rgba(255, 180, 88, 0.18), rgba(103, 151, 255, 0.14));
  color: #fff3df;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.novel-create-ai-trigger svg,
.novel-create-footer-ai svg {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}

.novel-create-ai-trigger:hover,
.novel-create-footer-ai:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 214, 154, 0.5);
  box-shadow: 0 12px 30px rgba(255, 184, 107, 0.12);
}

.create-novel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.create-novel-footer__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-generate-stage__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(260px, 0.9fr);
  margin-bottom: 0;
}

.ai-generate-stage__main,
.ai-generate-stage__aside {
  min-width: 0;
}

.ai-generate-stage__textarea {
  min-height: 240px;
  resize: vertical;
}

.ai-generate-stage__card {
  height: 100%;
  border-radius: 20px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
}

.novel-create-metric-note {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
}

.novel-create-metric-note__title {
  font-size: 13px;
  font-weight: 600;
  color: #fff2dc;
  margin-bottom: 8px;
}

.novel-create-metric-note__text {
  color: rgba(235, 239, 248, 0.72);
  line-height: 1.65;
  font-size: 13px;
}

.ai-generate-stage__card-title {
  margin-bottom: 14px;
  color: #fff2dc;
  font-size: 14px;
  font-weight: 600;
}

.ai-generate-stage__example {
  padding: 12px 0;
  color: rgba(235, 239, 248, 0.78);
  line-height: 1.65;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.ai-generate-stage__example:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.create-novel-modal .form-input,
.create-novel-modal .form-textarea,
.ai-generate-novel-modal .form-textarea,
.create-novel-modal select {
  background: rgba(8, 12, 20, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(245, 247, 252, 0.96);
}

.create-novel-modal .form-input:focus,
.create-novel-modal .form-textarea:focus,
.ai-generate-novel-modal .form-textarea:focus,
.create-novel-modal select:focus {
  border-color: rgba(255, 197, 118, 0.54);
  box-shadow: 0 0 0 4px rgba(255, 188, 92, 0.1);
}

@media (max-width: 720px) {
  .novel-create-shell,
  .novel-create-panel__header,
  .ai-generate-stage__layout,
  .create-novel-footer {
    display: flex;
    flex-direction: column;
  }

  .create-novel-footer__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .novel-create-ai-trigger,
  .novel-create-footer-ai {
    width: 100%;
    justify-content: center;
  }

  .novel-create-hero__title,
  .ai-generate-stage__title {
    font-size: 22px;
  }

  .length-type-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`

if (!document.head.querySelector('style[data-create-novel-modal-style="true"]')) {
  style.setAttribute('data-create-novel-modal-style', 'true')
  document.head.appendChild(style)
}
