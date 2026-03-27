/**
 * LLM 配置页面
 * 
 * 管理大语言模型配置，支持多个 Provider 和 Model
 */
import { icon } from '../lib/icons.js'
import { invoke } from '@tauri-apps/api/core'
import '../style/virtual-list.css'

// 支持的 Provider 列表
const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI Chat Completions', baseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { value: 'gemini', label: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com' },
  { value: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434' },
]

let configs = []
let selectedId = null
let isCreating = false

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">LLM 配置</h1>
      <p class="page-subtitle">管理大语言模型配置</p>
    </div>
    
    <div class="llm-layout">
      <div class="card llm-list-card">
        <div class="llm-list-header">
          <h3 class="card-title">${icon('settings', 16)} 配置列表</h3>
          <span class="llm-count" id="config-count">加载中...</span>
        </div>
        
        <div class="llm-toolbar">
          <button id="create-btn" class="btn btn-primary btn-sm">${icon('plus', 16)}<span>新增配置</span></button>
        </div>
        
        <div id="llm-list-mount" class="llm-list-mount">
          <div id="llm-list" class="llm-list">
            <div class="text-center text-tertiary p-lg">加载中...</div>
          </div>
        </div>
      </div>
      
      <div class="card llm-editor-card">
        <div id="llm-editor">
          <div class="empty-state">
            <div class="empty-state-icon">${icon('settings', 20)}</div>
            <div class="empty-state-title">选择配置</div>
            <div class="empty-state-desc">从左侧列表选择配置进行编辑，或点击新增创建配置</div>
          </div>
        </div>
      </div>
    </div>
  `

  el.querySelector('#create-btn')?.addEventListener('click', () => {
    isCreating = true
    selectedId = null
    renderEditor(el)
  })

  await loadConfigs(el)

  return el
}

async function loadConfigs(root) {
  try {
    configs = await invoke('list_llm_configs')
    renderList(root)
  } catch (err) {
    console.error('加载 LLM 配置失败:', err)
    root.querySelector('#llm-list').innerHTML = `
      <div class="text-center text-danger p-lg">
        <p>加载失败: ${err}</p>
        <button class="btn btn-primary btn-sm mt-sm" onclick="location.reload()">重试</button>
      </div>
    `
  }
}

function renderList(root) {
  const listEl = root.querySelector('#llm-list')
  const countEl = root.querySelector('#config-count')
  
  countEl.textContent = `共 ${configs.length} 个配置`

  if (configs.length === 0) {
    listEl.innerHTML = `
      <div class="text-center text-tertiary p-lg">
        <p>暂无配置</p>
        <p class="text-sm mt-xs">点击上方按钮创建</p>
      </div>
    `
    return
  }

  listEl.innerHTML = configs.map(config => `
    <div class="llm-item ${selectedId === config.id ? 'active' : ''}" data-id="${config.id}">
      <div class="llm-item-header">
        <div class="llm-item-name-row">
          <span class="llm-item-name">${escapeHtml(config.name)}</span>
        </div>
        <div class="llm-item-actions">
          <button class="llm-item-default-toggle ${config.is_default ? 'is-default' : ''}" data-action="default" data-id="${config.id}" title="${config.is_default ? '当前默认配置' : '设为默认'}" ${config.is_default ? 'disabled' : ''}>
            ${icon('star', 15)}
          </button>
          <button class="llm-item-toggle-btn ${config.enabled ? 'is-enabled' : 'is-disabled'}" data-action="toggle" data-id="${config.id}" title="${config.enabled ? '禁用' : '启用'}">
            ${config.enabled ? icon('check-circle', 15) : icon('x-circle', 15)}
          </button>
        </div>
      </div>
      <div class="llm-item-meta">
        <span class="badge badge-sm ${config.enabled ? 'badge-success' : 'badge-secondary'}">${config.enabled ? '启用' : '禁用'}</span>
        <span class="badge badge-sm">${escapeHtml(config.provider)}</span>
        <span class="badge badge-sm badge-secondary">${escapeHtml(config.model)}</span>
        <span class="llm-item-meta-spacer"></span>
        <button class="list-item-delete-btn list-item-delete-btn-visible" data-action="delete" data-id="${config.id}" title="删除">
          ${icon('delete', 14)}
        </button>
      </div>
    </div>
  `).join('')

  listEl.querySelectorAll('.llm-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) {
        const action = e.target.closest('[data-action]').dataset.action
        const id = Number(e.target.closest('[data-action]').dataset.id)
        handleAction(action, id, root)
        return
      }
      
      selectedId = Number(item.dataset.id)
      isCreating = false
      renderList(root)
      renderEditor(root)
    })
  })
}

async function handleAction(action, id, root) {
  try {
    switch (action) {
      case 'toggle':
        const config = configs.find(c => c.id === id)
        if (config.enabled) {
          await invoke('disable_llm_config', { id })
        } else {
          await invoke('enable_llm_config', { id })
        }
        break
      case 'default':
        await invoke('set_default_llm_config', { id })
        break
      case 'delete':
        if (confirm('确定删除此配置？')) {
          await invoke('delete_llm_config', { id })
          if (selectedId === id) {
            selectedId = null
            renderEditor(root)
          }
        } else {
          return
        }
        break
    }
    await loadConfigs(root)
  } catch (err) {
    alert(`操作失败: ${err}`)
  }
}

function renderEditor(root) {
  const editorEl = root.querySelector('#llm-editor')
  
  if (isCreating) {
    renderCreateForm(editorEl, root)
    return
  }

  const config = configs.find(c => c.id === selectedId)
  
  if (!config) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('settings', 20)}</div>
        <div class="empty-state-title">选择配置</div>
        <div class="empty-state-desc">从左侧列表选择配置进行编辑</div>
      </div>
    `
    return
  }

  renderEditForm(editorEl, config, root)
}

function renderApiKeyItems(apiKeys, isEditMode) {
  if (!apiKeys || apiKeys.length === 0) {
    return `
      <div class="api-key-item" data-index="0">
        <input type="password" class="form-input api-key-input" placeholder="sk-..." />
        <button class="btn-icon api-key-toggle" type="button" title="显示">${icon('eye', 16)}</button>
        <button class="btn-icon api-key-add" type="button" title="添加">${icon('plus', 16)}</button>
      </div>
    `
  }

  return apiKeys.map((key, index) => `
    <div class="api-key-item" data-index="${index}">
      <input type="password" class="form-input api-key-input" placeholder="sk-..." value="${escapeHtml(key || '')}" />
      <button class="btn-icon api-key-toggle" type="button" title="显示">${icon('eye', 16)}</button>
      <button class="btn-icon api-key-remove" type="button" title="删除">${icon('x', 16)}</button>
      ${index === apiKeys.length - 1 ? `<button class="btn-icon api-key-add" type="button" title="添加">${icon('plus', 16)}</button>` : ''}
    </div>
  `).join('')
}

function renderCreateForm(editorEl, root) {
  const providerOptions = PROVIDER_OPTIONS.map(p => 
    `<option value="${p.value}">${p.label}</option>`
  ).join('')

  editorEl.innerHTML = `
    <div class="llm-editor-header">
      <h3 class="card-title">创建 LLM 配置</h3>
      <div class="llm-editor-actions">
        <button id="save-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
        <button id="cancel-btn" class="btn btn-secondary">取消</button>
      </div>
    </div>
    
    <div class="llm-form-content">
      <div class="form-group">
        <label class="form-label">配置名称 <span class="text-danger">*</span></label>
        <input id="name" class="form-input" placeholder="例如：OpenAI GPT-4o" />
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">提供商 <span class="text-danger">*</span></label>
          <select id="provider" class="form-input">
            <option value="">请选择提供商</option>
            ${providerOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">模型 <span class="text-danger">*</span></label>
          <input id="model" class="form-input" placeholder="例如：gpt-4o" />
        </div>
      </div>
      
      <div class="form-group" id="api-key-group">
        <label class="form-label">API 密钥</label>
        <div id="api-key-list" class="api-key-list">
          ${renderApiKeyItems([], false)}
        </div>
        <span class="form-hint">支持填写多个 KEY，使用英文逗号分隔；运行时会随机选择一个 KEY</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">自定义 API 地址</label>
        <input id="base-url" class="form-input" placeholder="https://api.example.com/v1" />
        <span class="form-hint">可选，用于自定义网关或兼容服务</span>
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">高级配置</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">温度 (Temperature)</label>
            <input id="temperature" type="number" class="form-input" min="0" max="2" step="0.1" placeholder="0.7" />
          </div>
          <div class="form-group">
            <label class="form-label">最大 Tokens</label>
            <input id="max-tokens" type="number" class="form-input" min="1" placeholder="4096" />
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="is-default" />
          <span>设为默认配置</span>
        </label>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, true)
}

function renderEditForm(editorEl, config, root) {
  const providerOptions = PROVIDER_OPTIONS.map(p => 
    `<option value="${p.value}" ${config.provider === p.value ? 'selected' : ''}>${p.label}</option>`
  ).join('')

  const extraConfig = config.extra_config || {}
  const apiKeys = config.api_key ? config.api_key.split(',').map(k => k.trim()).filter(k => k) : []

  editorEl.innerHTML = `
    <div class="llm-editor-header">
      <h3 class="card-title">${escapeHtml(config.name)}</h3>
      <div class="llm-editor-actions">
        <button id="save-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
        <button id="cancel-btn" class="btn btn-secondary">取消</button>
      </div>
    </div>
    
    <div class="llm-form-content">
      <div class="form-group">
        <label class="form-label">配置名称 <span class="text-danger">*</span></label>
        <input id="name" class="form-input" value="${escapeHtml(config.name)}" />
      </div>
      
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">提供商 <span class="text-danger">*</span></label>
          <select id="provider" class="form-input">
            <option value="">请选择提供商</option>
            ${providerOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">模型 <span class="text-danger">*</span></label>
          <input id="model" class="form-input" value="${escapeHtml(config.model)}" placeholder="例如：gpt-4o" />
        </div>
      </div>
      
      <div class="form-group" id="api-key-group">
        <label class="form-label">API 密钥</label>
        <div id="api-key-list" class="api-key-list">
          ${renderApiKeyItems(apiKeys, true)}
        </div>
        <span class="form-hint">支持填写多个 KEY，使用英文逗号分隔；留空表示不修改，输入后会整体覆盖原有 KEY 列表</span>
      </div>
      
      <div class="form-group">
        <label class="form-label">自定义 API 地址</label>
        <input id="base-url" class="form-input" value="${escapeHtml(config.base_url || '')}" placeholder="https://api.example.com/v1" />
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">高级配置</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">温度 (Temperature)</label>
            <input id="temperature" type="number" class="form-input" min="0" max="2" step="0.1" value="${extraConfig.temperature || ''}" placeholder="0.7" />
          </div>
          <div class="form-group">
            <label class="form-label">最大 Tokens</label>
            <input id="max-tokens" type="number" class="form-input" min="1" value="${extraConfig.max_tokens || ''}" placeholder="4096" />
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="is-default" ${config.is_default ? 'checked' : ''} />
          <span>设为默认配置</span>
        </label>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="enabled" ${config.enabled ? 'checked' : ''} />
          <span>启用此配置</span>
        </label>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, false)
}

function setupFormEvents(editorEl, root, isCreate) {
  const providerSelect = editorEl.querySelector('#provider')
  const baseUrlInput = editorEl.querySelector('#base-url')
  const apiKeyList = editorEl.querySelector('#api-key-list')
  const apiKeyGroup = editorEl.querySelector('#api-key-group')

  const syncProviderFields = (provider) => {
    if (!apiKeyGroup) return
    apiKeyGroup.style.display = provider === 'ollama' ? 'none' : ''
  }

  providerSelect?.addEventListener('change', (e) => {
    const provider = e.target.value
    const providerInfo = PROVIDER_OPTIONS.find(p => p.value === provider)
    if (providerInfo && baseUrlInput && !baseUrlInput.value) {
      baseUrlInput.value = providerInfo.baseUrl
    }
    syncProviderFields(provider)
  })

  syncProviderFields(providerSelect?.value || '')

  apiKeyList?.addEventListener('click', (e) => {
    const item = e.target.closest('.api-key-item')
    if (!item) return

    if (e.target.closest('.api-key-toggle')) {
      const input = item.querySelector('.api-key-input')
      const toggleBtn = e.target.closest('.api-key-toggle')
      const isPassword = input.type === 'password'
      input.type = isPassword ? 'text' : 'password'
      toggleBtn.innerHTML = isPassword ? icon('eye-off', 16) : icon('eye', 16)
      toggleBtn.title = isPassword ? '隐藏' : '显示'
    }

    if (e.target.closest('.api-key-add')) {
      const newItem = document.createElement('div')
      newItem.className = 'api-key-item'
      newItem.dataset.index = apiKeyList.children.length
      newItem.innerHTML = `
        <input type="password" class="form-input api-key-input" placeholder="sk-..." />
        <button class="btn-icon api-key-toggle" type="button" title="显示">${icon('eye', 16)}</button>
        <button class="btn-icon api-key-remove" type="button" title="删除">${icon('x', 16)}</button>
        <button class="btn-icon api-key-add" type="button" title="添加">${icon('plus', 16)}</button>
      `
      const prevAddBtn = item.querySelector('.api-key-add')
      if (prevAddBtn) prevAddBtn.remove()
      apiKeyList.appendChild(newItem)
    }

    if (e.target.closest('.api-key-remove')) {
      const items = apiKeyList.querySelectorAll('.api-key-item')
      if (items.length > 1) {
        const lastItem = items[items.length - 1]
        if (lastItem === item && items.length > 1) {
          items[items.length - 2].innerHTML += `<button class="btn-icon api-key-add" type="button" title="添加">${icon('plus', 16)}</button>`
        }
        item.remove()
        apiKeyList.querySelectorAll('.api-key-item').forEach((el, idx) => el.dataset.index = idx)
      } else {
        const input = item.querySelector('.api-key-input')
        input.value = ''
        input.dataset.hasKey = 'false'
      }
    }
  })

  editorEl.querySelector('#save-btn')?.addEventListener('click', async () => {
    await saveConfig(editorEl, root, isCreate)
  })

  editorEl.querySelector('#cancel-btn')?.addEventListener('click', () => {
    if (isCreate) {
      isCreating = false
      selectedId = null
    }
    renderList(root)
    renderEditor(root)
  })
}

async function saveConfig(editorEl, root, isCreate) {
  const name = editorEl.querySelector('#name')?.value?.trim()
  const provider = editorEl.querySelector('#provider')?.value
  const model = editorEl.querySelector('#model')?.value?.trim()
  const baseUrl = editorEl.querySelector('#base-url')?.value?.trim()
  const isDefault = editorEl.querySelector('#is-default')?.checked
  const enabled = editorEl.querySelector('#enabled')?.checked ?? true
  const temperature = editorEl.querySelector('#temperature')?.value
  const maxTokens = editorEl.querySelector('#max-tokens')?.value

  const apiKeyInputs = editorEl.querySelectorAll('.api-key-input')
  const apiKeys = Array.from(apiKeyInputs)
    .map(input => input.value?.trim())
    .filter(v => v)
  
  if (!name) {
    alert('请输入配置名称')
    return
  }
  if (!provider) {
    alert('请选择提供商')
    return
  }
  if (!model) {
    alert('请输入模型名称')
    return
  }

  const extraConfig = {}
  if (temperature) extraConfig.temperature = parseFloat(temperature)
  if (maxTokens) extraConfig.max_tokens = parseInt(maxTokens)

  try {
    const apiKey = apiKeys.length > 0 ? apiKeys.join(',') : null

    if (isCreate) {
      await invoke('create_llm_config', {
        req: {
          name,
          provider,
          model,
          api_key: apiKey,
          base_url: baseUrl || null,
          extra_config: Object.keys(extraConfig).length > 0 ? extraConfig : null,
          is_default: isDefault,
        }
      })
    } else {
      await invoke('update_llm_config', {
        id: selectedId,
        req: {
          name,
          provider,
          model,
          api_key: apiKey,
          base_url: baseUrl || null,
          extra_config: Object.keys(extraConfig).length > 0 ? extraConfig : null,
          is_default: isDefault,
          enabled,
        }
      })
    }

    isCreating = false
    await loadConfigs(root)
  } catch (err) {
    alert(`保存失败: ${err}`)
  }
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function cleanup() {
  configs = []
  selectedId = null
  isCreating = false
}
