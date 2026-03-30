import { Modal } from '../lib/modal.js'

export function openAiGenerateModal(options) {
  const {
    title,
    currentContent = '',
    currentContextTitle = '',
    currentContextDesc = '',
    modeLabel = '操作类型',
    modes = [],
    defaultMode,
    requirementLabel = '补充要求（可选）',
    requirementPlaceholder = '',
    getConfirmText = () => '生成',
    onSubmit,
  } = options

  const resolvedDefaultMode = defaultMode || modes[0]?.value || 'generate'

  const body = document.createElement('div')
  body.innerHTML = `
    <div class="meta-preview-note" style="margin-top: 0; margin-bottom: var(--space-md);">
      <div>
        <div class="meta-preview-note__title">${currentContent.trim() ? '将基于当前内容继续处理' : '当前内容为空，可直接生成'}</div>
        <div class="meta-preview-note__desc">${currentContextTitle || '你可以生成、优化、重写、扩展或精简当前内容。'}${currentContextDesc ? ` ${currentContextDesc}` : ''}</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${modeLabel}</label>
      <div class="meta-ai-actions">
        ${modes.map(mode => `
          <label class="meta-ai-action-option">
            <input type="radio" name="ai-generate-mode" value="${mode.value}" ${mode.value === resolvedDefaultMode ? 'checked' : ''}>
            <span>${mode.label}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">${requirementLabel}</label>
      <textarea id="ai-generate-requirement" class="form-input" rows="6" placeholder="${requirementPlaceholder}"></textarea>
    </div>
  `

  const modal = new Modal({
    title,
    content: body,
    size: 'md',
    confirmText: getConfirmText(resolvedDefaultMode),
    cancelText: '取消',
    onConfirm: async (instance) => {
      const mode = instance.contentEl.querySelector('input[name="ai-generate-mode"]:checked')?.value || resolvedDefaultMode
      const requirement = instance.contentEl.querySelector('#ai-generate-requirement')?.value?.trim() || ''
      instance.setLoading(true)
      instance.close({ action: 'confirm' })

      try {
        await onSubmit?.({ mode, requirement, modal: instance })
      } catch (err) {
        throw err
      }

      return false
    }
  })

  const syncConfirmText = () => {
    const mode = modal.contentEl.querySelector('input[name="ai-generate-mode"]:checked')?.value || resolvedDefaultMode
    modal.setButtons([
      { text: '取消', type: 'default', onClick: () => modal.cancel() },
      { text: getConfirmText(mode), type: 'primary', onClick: () => modal.confirm() },
    ])
  }

  modal.open()

  setTimeout(() => {
    modal.contentEl.querySelectorAll('input[name="ai-generate-mode"]').forEach(input => {
      input.addEventListener('change', syncConfirmText)
    })
  }, 0)

  return modal
}
