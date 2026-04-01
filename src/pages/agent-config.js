import { api } from '../api/tauri.js'
import { icon } from '../lib/icons.js'
import { toastSuccess, toastError } from '../lib/toast.js'
import '../style/virtual-list.css'
import '../style/pages/page-agent-config.css'

let agentDefinitions = []
let llmConfigs = []
let selectedAgentCode = null

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Agent 配置</h1>
      <p class="page-subtitle">查看 TOML 中定义的 Agent，并配置运行时模型绑定</p>
    </div>

    <div class="agent-layout">
      <div class="card agent-list-card">
        <div class="agent-list-header">
          <h3 class="card-title">${icon('ai', 16)} Agent 列表</h3>
          <span id="config-count" class="agent-count">加载中...</span>
        </div>

        <div class="agent-list-mount">
          <div id="agent-list" class="agent-list"></div>
        </div>
      </div>

      <div class="card agent-editor-card">
        <div id="agent-editor">
          <div class="empty-state">
            <div class="empty-state-icon">${icon('ai', 20)}</div>
            <div class="empty-state-title">选择 Agent</div>
            <div class="empty-state-desc">从左侧选择一个 Agent，查看它的定义并配置运行时绑定。</div>
          </div>
        </div>
      </div>
    </div>
  `

  await loadData(el)
  return el
}

async function loadData(root) {
  try {
    const [definitions, llms] = await Promise.all([
      api.listAgentDefinitions(),
      api.listLlmConfigs(),
    ])

    agentDefinitions = definitions
    llmConfigs = llms

    if (!selectedAgentCode && agentDefinitions.length > 0) {
      selectedAgentCode = agentDefinitions[0].agent_code
    }

    renderList(root)
    renderEditor(root)
  } catch (err) {
    root.querySelector('#agent-list').innerHTML = `
      <div class="text-center text-danger p-lg">
        <p>加载失败: ${err.message || err}</p>
      </div>
    `
  }
}

function renderList(root) {
  const listEl = root.querySelector('#agent-list')
  const countEl = root.querySelector('#config-count')
  if (!listEl || !countEl) return

  countEl.textContent = `共 ${agentDefinitions.length} 个 Agent`

  listEl.innerHTML = agentDefinitions.map((agent) => {
    const llm = llmConfigs.find(item => item.id === agent.llm_config_id)
    return `
      <div class="agent-item ${selectedAgentCode === agent.agent_code ? 'active' : ''}" data-code="${agent.agent_code}">
        <div class="agent-item-header">
          <div class="agent-item-title-wrap">
            <span class="agent-item-name">${escapeHtml(agent.name)}</span>
            <span class="agent-item-code">${escapeHtml(agent.agent_code)}</span>
          </div>
        </div>
        <div class="agent-item-desc">${escapeHtml(agent.description)}</div>
        <div class="agent-item-tags">
          <span class="agent-tag">${escapeHtml(agent.category)}</span>
          <span class="agent-tag">${escapeHtml(agent.output_format)}</span>
          <span class="agent-tag">${agent.streaming ? 'stream' : 'sync'}</span>
          ${agent.ui_entry ? `<span class="agent-tag">${escapeHtml(agent.ui_entry)}</span>` : ''}
        </div>
        <div class="agent-item-preview">
          ${llm ? `已绑定 ${escapeHtml(llm.name)}` : '使用默认 LLM'}
        </div>
      </div>
    `
  }).join('')

  listEl.querySelectorAll('.agent-item').forEach((item) => {
    item.addEventListener('click', () => {
      selectedAgentCode = item.dataset.code
      renderList(root)
      renderEditor(root)
    })
  })
}

function renderEditor(root) {
  const editorEl = root.querySelector('#agent-editor')
  if (!editorEl) return

  const agent = agentDefinitions.find(item => item.agent_code === selectedAgentCode)
  if (!agent) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('ai', 20)}</div>
        <div class="empty-state-title">选择 Agent</div>
        <div class="empty-state-desc">从左侧选择一个 Agent。</div>
      </div>
    `
    return
  }

  const llmOptions = llmConfigs
    .filter(item => item.enabled)
    .map(item => `<option value="${item.id}" ${agent.llm_config_id === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`)
    .join('')

  const extraConfigFields = renderExtraConfigFields(agent)
  const extraConfigFallback = !agent.extra_config_schema?.length ? `
        <div class="form-group">
          <label class="form-label">extra_config</label>
          <textarea id="extra-config-json" class="form-input prompt-textarea" rows="10" placeholder="输入 JSON 对象，例如 {\"temperature\":0.7}">${formatJson(agent.extra_config)}</textarea>
          <span class="form-hint">当前 Agent 没有可识别字段时，回退为 JSON 文本编辑。</span>
        </div>
      ` : ''

  editorEl.innerHTML = `
    <div class="agent-editor-header">
      <div class="agent-hero">
        <div class="agent-hero-icon">${icon(agent.icon || 'ai', 18)}</div>
        <div class="agent-hero-copy">
          <div class="agent-hero-title-row">
            <h3 class="card-title">${escapeHtml(agent.name)}</h3>
            <span class="agent-code-pill">${escapeHtml(agent.agent_code)}</span>
          </div>
          <p class="agent-hero-desc">${escapeHtml(agent.description)}</p>
          <div class="agent-item-meta">
            <span class="badge badge-sm">${escapeHtml(agent.category)}</span>
            <span class="badge badge-sm">${escapeHtml(agent.output_format)}</span>
            ${agent.streaming ? '<span class="badge badge-sm badge-info">stream</span>' : '<span class="badge badge-sm badge-secondary">sync</span>'}
            ${agent.ui_entry ? `<span class="badge badge-sm">${escapeHtml(agent.ui_entry)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="agent-editor-actions">
        <button id="save-btn" class="btn btn-primary">${icon('save', 16)}<span>保存配置</span></button>
      </div>
    </div>

    <div class="agent-form-content">
      <div class="form-section">
        <h4 class="form-section-title">运行时配置</h4>
        <div class="agent-runtime-grid">
          <div class="form-group agent-runtime-grid__primary">
            <label class="form-label">绑定 LLM 配置</label>
            <select id="llm-config-id" class="form-input">
              <option value="">使用默认 LLM</option>
              ${llmOptions}
            </select>
            <span class="form-hint">未绑定时将使用系统默认 LLM。</span>
          </div>

          ${extraConfigFields}
        </div>

        ${extraConfigFallback}
      </div>

      <div class="agent-prompt-columns">
        <div class="form-section agent-prompt-card">
          <h4 class="form-section-title">系统提示词</h4>
          <div class="form-group">
            <textarea class="form-input prompt-textarea agent-prompt-preview" rows="16" disabled>${escapeHtml(agent.system_prompt || '')}</textarea>
          </div>
        </div>

        <div class="form-section agent-prompt-card">
          <h4 class="form-section-title">用户提示词模板</h4>
          <div class="form-group">
            <textarea class="form-input prompt-textarea agent-prompt-preview" rows="16" disabled>${escapeHtml(agent.user_template || '')}</textarea>
          </div>
        </div>
      </div>
    </div>
  `

  editorEl.querySelector('#save-btn')?.addEventListener('click', async () => {
    await saveAgentConfig(agent)
    await loadData(root)
  })
}

async function saveAgentConfig(agent) {
  const llmValue = document.querySelector('#llm-config-id')?.value || ''
  const extraConfig = parseExtraConfig(agent)
  if (extraConfig instanceof Error) {
    toastError(`extra_config 解析失败: ${extraConfig.message}`)
    return
  }

  try {
    await api.saveAgentRuntimeConfig({
      agentCode: agent.agent_code,
      llmConfigId: llmValue ? Number(llmValue) : null,
      extraConfig,
    })
    toastSuccess('保存成功')
  } catch (err) {
    toastError(`保存失败: ${err.message || err}`)
  }
}

function renderExtraConfigFields(agent) {
  if (!agent.extra_config_schema?.length) return ''

  const current = agent.extra_config || {}
  return agent.extra_config_schema.map((field) => {
    const value = current[field.key]
    if (field.field_type === 'boolean') {
      return `
        <div class="form-group agent-runtime-field agent-runtime-field--compact">
          <label class="checkbox-label">
            <input type="checkbox" data-extra-key="${escapeHtml(field.key)}" data-extra-type="boolean" ${value === true ? 'checked' : ''} />
            <span>${escapeHtml(field.label)}</span>
          </label>
        </div>
      `
    }

    return `
      <div class="form-group agent-runtime-field ${field.key === 'language' ? 'agent-runtime-grid__secondary' : field.key === 'detail_level' ? 'agent-runtime-grid__tertiary' : field.key === 'recommended_length' ? 'agent-runtime-grid__quaternary' : ''}">
        <label class="form-label">${escapeHtml(field.label)}</label>
        <input class="form-input" data-extra-key="${escapeHtml(field.key)}" data-extra-type="text" value="${escapeHtml(value ?? '')}" placeholder="${escapeHtml(field.placeholder || '')}" />
      </div>
    `
  }).join('')
}

function parseExtraConfig(agent) {
  if (agent.extra_config_schema?.length) {
    const result = {}
    document.querySelectorAll('[data-extra-key]').forEach((el) => {
      const key = el.dataset.extraKey
      const type = el.dataset.extraType
      if (!key) return

      if (type === 'boolean') {
        if (el.checked) result[key] = true
        return
      }

      const value = el.value?.trim()
      if (value) result[key] = value
    })
    return Object.keys(result).length > 0 ? result : null
  }

  const extraConfigText = document.querySelector('#extra-config-json')?.value?.trim() || ''
  if (!extraConfigText) return null

  try {
    const parsed = JSON.parse(extraConfigText)
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      return new Error('extra_config 必须是 JSON 对象')
    }
    return parsed
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err))
  }
}

function formatJson(value) {
  if (!value) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function escapeHtml(text) {
  if (text == null) return ''
  const div = document.createElement('div')
  div.textContent = String(text)
  return div.innerHTML
}

export function cleanup() {
  agentDefinitions = []
  llmConfigs = []
  selectedAgentCode = null
}
