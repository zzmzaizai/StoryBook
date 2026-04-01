import { Modal } from '../lib/modal.js'
import { getAiToolDescription, getAiToolTitle } from '../lib/ai-execution-labels.js'

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
    completionDelayMs = 10000,
    onSubmit,
  } = options

  const resolvedDefaultMode = defaultMode || modes[0]?.value || 'generate'
  let autoCloseTimer = null

  const executionState = {
    phases: [],
    finalResult: {
      status: 'idle',
      message: '等待开始',
    },
  }

  const body = document.createElement('div')
  body.innerHTML = `
    <div class="ai-generate-layout">
      <div class="ai-generate-main">
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
      </div>
      <div class="ai-generate-execution">
        <div class="ai-generate-execution__header">执行状态</div>
        <div class="ai-generate-execution__body" data-role="execution-body"></div>
      </div>
    </div>
  `

  const executionBody = body.querySelector('[data-role="execution-body"]')

  const renderExecutionState = () => {
    const fragments = []

    if (executionState.phases.length === 0) {
      fragments.push(`
        <div class="ai-generate-empty">等待 AI 调用...</div>
      `)
    } else {
      executionState.phases.forEach(phase => {
        const eventsHtml = (phase.events || []).map((event) => `
          <div class="ai-generate-log-row ai-generate-log-row--${event.status || 'idle'}">
            <div class="ai-generate-log-row__title">${formatEventTitle(event)}</div>
            <div class="ai-generate-log-row__desc">${formatEventDescription(event)}</div>
            ${Number.isFinite(event.durationMs) ? `<div class="ai-generate-log-row__meta">${event.durationMs}ms</div>` : ''}
          </div>
        `).join('')

        fragments.push(`
          <section class="ai-generate-phase-section ai-generate-phase-section--${phase.status || 'pending'}">
            <div class="ai-generate-phase-card__title">${phase.label || phase.name}</div>
            ${phase.message ? `<div class="ai-generate-phase-card__desc">${phase.message}</div>` : ''}
            <div class="ai-generate-phase-card__events">${eventsHtml}</div>
          </section>
        `)
      })
    }

    if (executionState.finalResult.status !== 'idle') {
      fragments.push(`
        <div class="ai-generate-result-card ai-generate-result-card--${executionState.finalResult.status}">
          <div class="ai-generate-result-card__title">${executionState.finalResult.status === 'success' ? '生成完成' : executionState.finalResult.status === 'error' ? '生成失败' : '执行中'}</div>
          <div class="ai-generate-result-card__desc">${executionState.finalResult.message || ''}</div>
        </div>
      `)
    }

    executionBody.innerHTML = fragments.join('')
    executionBody.scrollTop = executionBody.scrollHeight
  }

  const clearAutoClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = null
    }
  }

  const scheduleAutoClose = (instance) => {
    clearAutoClose()
    autoCloseTimer = window.setTimeout(() => {
      if (instance.isOpen) {
        instance.close({ action: 'auto-close' })
      }
    }, completionDelayMs)
  }

  const modal = new Modal({
    title,
    content: body,
    size: 'xl',
    className: 'ai-generate-modal',
    confirmText: getConfirmText(resolvedDefaultMode),
    cancelText: '取消',
    onConfirm: async (instance) => {
      const mode = instance.contentEl.querySelector('input[name="ai-generate-mode"]:checked')?.value || resolvedDefaultMode
      const requirement = instance.contentEl.querySelector('#ai-generate-requirement')?.value?.trim() || ''
      clearAutoClose()
      instance.setLoading(true)
      executionState.finalResult = {
        status: 'running',
        message: 'AI 正在执行中...',
      }
      renderExecutionState()

      try {
        await onSubmit?.({ mode, requirement, modal: instance })
      } catch (err) {
        throw err
      }

      return false
    }
  })

  const syncConfirmText = () => {
    clearAutoClose()
    const mode = modal.contentEl.querySelector('input[name="ai-generate-mode"]:checked')?.value || resolvedDefaultMode
    modal.setButtons([
      { text: '取消', type: 'default', onClick: () => modal.cancel() },
      { text: getConfirmText(mode), type: 'primary', onClick: () => modal.confirm() },
    ])
  }

  modal.updateExecutionState = (updater) => {
    const nextState = typeof updater === 'function' ? updater(structuredClone(executionState)) : updater
    executionState.phases = nextState.phases || []
    executionState.finalResult = nextState.finalResult || executionState.finalResult
    renderExecutionState()
    return modal
  }

  modal.startExecution = () => {
    clearAutoClose()
    executionState.phases = []
    executionState.finalResult = {
      status: 'running',
      message: 'AI 正在执行中...',
    }
    renderExecutionState()
    return modal
  }

  modal.finishExecution = (status, message) => {
    if (executionState.finalResult.status === status && executionState.finalResult.message === message) {
      return modal
    }
    modal.setLoading(false)
    executionState.finalResult = {
      status,
      message,
    }
    renderExecutionState()
    scheduleAutoClose(modal)
    return modal
  }

  modal.open()
  renderExecutionState()

  setTimeout(() => {
    modal.contentEl.querySelectorAll('input[name="ai-generate-mode"]').forEach(input => {
      input.addEventListener('change', syncConfirmText)
    })
    modal.contentEl.querySelector('#ai-generate-requirement')?.addEventListener('input', clearAutoClose)
  }, 0)

  const originalDestroy = modal.destroy.bind(modal)
  modal.destroy = () => {
    clearAutoClose()
    originalDestroy()
  }

  return modal
}

function formatEventTitle(event) {
  return getAiToolTitle(event?.toolName)
}

function formatEventDescription(event) {
  if (!event) return ''
  return getAiToolDescription(event.toolName, event.argsSummary, event.resultSummary)
}
