/**
 * LLM配置页面
 */
import { ICONS } from '../lib/icons.js'

const LLM_PROVIDER_TYPES = {
  10: 'OpenAI',
  20: 'OpenAI Responses',
  30: 'Anthropic',
  40: 'Google',
  100: 'Ollama'
}

const CONFIGURATOR_TYPES = {
  1: '预设模式',
  2: '进阶模式'
}

const VENDOR_PROVIDERS = [
  { name: 'OpenAI', type: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'] },
  { name: 'Anthropic', type: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
  { name: 'Google', type: 'Google', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'] },
  { name: 'DeepSeek', type: 'OpenAI', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { name: 'Moonshot', type: 'OpenAI', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  { name: 'ZhipuAI', type: 'OpenAI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-air'] },
  { name: 'Qwen', type: 'OpenAI', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext'] },
  { name: 'Ollama', type: 'Ollama', baseUrl: 'http://localhost:11434/v1', models: ['llama3.2', 'llama3.1', 'qwen2.5', 'mistral', 'codellama'] },
]

const DEMO_LLM_CONFIGS = [
  { id: 1, vendorName: 'OpenAI', providerType: 10, configuratorType: 1, modelName: 'gpt-4o', apiEndpoint: 'https://api.openai.com/v1', isActive: true, isDefault: true, contextLength: 128000, maxOutputTokens: 4096, capabilities: 153 },
  { id: 2, vendorName: 'DeepSeek', providerType: 10, configuratorType: 1, modelName: 'deepseek-chat', apiEndpoint: 'https://api.deepseek.com/v1', isActive: true, isDefault: false, contextLength: 64000, maxOutputTokens: 4096, capabilities: 5 },
  { id: 3, vendorName: 'Ollama', providerType: 100, configuratorType: 1, modelName: 'llama3.2', apiEndpoint: 'http://localhost:11434/v1', isActive: false, isDefault: false, contextLength: 8192, maxOutputTokens: 4096, capabilities: 5 },
]

let selectedLLMId = null
let isCreating = false
let configuratorType = 1
let selectedVendor = null
let isCustomModel = false

const formData = {
  vendorName: '',
  providerType: 10,
  apiEndpoint: '',
  apiKeys: [''],
  modelName: '',
  apiVersion: '',
  deploymentName: '',
  contextLength: 8192,
  maxOutputTokens: 4096,
  maxInputTokens: 4096,
  capabilities: 5,
  inputPricePer1K: 0,
  outputPricePer1K: 0,
  isActive: true,
  isDefault: false,
}

const capabilities = {
  supportImageInput: false,
  supportFunctionCalling: false,
  supportDeepThinking: false,
}

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">LLM设置</h1>
      <p class="page-subtitle">配置大语言模型API</p>
    </div>
    
    <div class="llm-layout">
      <div class="card llm-list-card">
        <div class="llm-list-header">
          <h3 class="card-title">${ICONS.settings} 配置列表</h3>
          <span class="llm-count">共 ${DEMO_LLM_CONFIGS.length} 个配置</span>
        </div>
        
        <div class="llm-toolbar">
          <button id="create-llm-btn" class="btn btn-primary btn-sm">${ICONS.plus}<span>新增</span></button>
        </div>
        
        <div id="llm-list" class="llm-list"></div>
      </div>
      
      <div class="card llm-editor-card">
        <div id="llm-editor"></div>
      </div>
    </div>
  `

  await loadLLMList(el)

  el.querySelector('#create-llm-btn')?.addEventListener('click', () => {
    isCreating = true
    selectedLLMId = null
    resetFormData()
    renderLLMEditor(el)
  })

  return el
}

async function loadLLMList(root) {
  const listEl = root.querySelector('#llm-list')

  listEl.innerHTML = DEMO_LLM_CONFIGS.map(item => `
    <div class="llm-item ${selectedLLMId === item.id ? 'active' : ''}" data-id="${item.id}">
      <div class="llm-item-header">
        <span class="llm-item-name">${item.vendorName || '未命名配置'}</span>
        ${item.isDefault ? `<span class="badge badge-warning badge-sm">默认</span>` : ''}
      </div>
      <div class="llm-item-model">${item.modelName || '-'}</div>
      <div class="llm-item-meta">
        <span class="badge badge-sm">${LLM_PROVIDER_TYPES[item.providerType] || 'OpenAI'}</span>
        <span class="badge badge-sm ${item.configuratorType === 1 ? 'badge-success' : 'badge-info'}">${item.configuratorType === 1 ? '预设' : '进阶'}</span>
        <span class="badge badge-sm ${item.isActive ? 'badge-success' : 'badge-secondary'}">${item.isActive ? '激活' : '未激活'}</span>
      </div>
      <div class="llm-item-actions">
        <button class="btn-icon" data-action="toggle-active" data-id="${item.id}" title="${item.isActive ? '停用' : '激活'}">
          ${item.isActive ? ICONS.toggleRight : ICONS.toggleLeft}
        </button>
        <button class="btn-icon" data-action="set-default" data-id="${item.id}" title="设为默认" ${item.isDefault ? 'disabled' : ''}>
          ${ICONS.star}
        </button>
        <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${item.id}" title="删除">
          ${ICONS.delete}
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
      
      selectedLLMId = Number(item.dataset.id)
      isCreating = false
      listEl.querySelectorAll('.llm-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      renderLLMEditor(root)
    })
  })

  if (!selectedLLMId && !isCreating && DEMO_LLM_CONFIGS.length > 0) {
    selectedLLMId = DEMO_LLM_CONFIGS[0].id
    renderLLMEditor(root)
  }
}

function handleAction(action, id, root) {
  const llm = DEMO_LLM_CONFIGS.find(l => l.id === id)
  if (!llm) return

  switch (action) {
    case 'toggle-active':
      llm.isActive = !llm.isActive
      loadLLMList(root)
      break
    case 'set-default':
      DEMO_LLM_CONFIGS.forEach(l => l.isDefault = false)
      llm.isDefault = true
      loadLLMList(root)
      break
    case 'delete':
      if (confirm('确定删除此配置？')) {
        const index = DEMO_LLM_CONFIGS.findIndex(l => l.id === id)
        if (index > -1) {
          DEMO_LLM_CONFIGS.splice(index, 1)
          if (selectedLLMId === id) {
            selectedLLMId = null
          }
          loadLLMList(root)
          renderLLMEditor(root)
        }
      }
      break
  }
}

function resetFormData() {
  formData.vendorName = ''
  formData.providerType = 10
  formData.apiEndpoint = ''
  formData.apiKeys = ['']
  formData.modelName = ''
  formData.apiVersion = ''
  formData.deploymentName = ''
  formData.contextLength = 8192
  formData.maxOutputTokens = 4096
  formData.maxInputTokens = 4096
  formData.capabilities = 5
  formData.inputPricePer1K = 0
  formData.outputPricePer1K = 0
  formData.isActive = true
  formData.isDefault = false
  capabilities.supportImageInput = false
  capabilities.supportFunctionCalling = false
  capabilities.supportDeepThinking = false
  selectedVendor = null
  isCustomModel = false
  configuratorType = 1
}

function renderLLMEditor(root) {
  const editorEl = root.querySelector('#llm-editor')
  
  if (isCreating) {
    renderCreateForm(editorEl, root)
    return
  }

  const llm = DEMO_LLM_CONFIGS.find(l => l.id === selectedLLMId)
  
  if (!llm) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.settings}</div>
        <div class="empty-state-title">选择配置</div>
        <div class="empty-state-desc">从左侧列表选择配置进行编辑</div>
      </div>
    `
    return
  }

  formData.vendorName = llm.vendorName || ''
  formData.providerType = llm.providerType || 10
  formData.apiEndpoint = llm.apiEndpoint || ''
  formData.apiKeys = ['sk-***']
  formData.modelName = llm.modelName || ''
  formData.contextLength = llm.contextLength || 8192
  formData.maxOutputTokens = llm.maxOutputTokens || 4096
  formData.maxInputTokens = llm.maxInputTokens || 4096
  formData.capabilities = llm.capabilities || 5
  formData.isActive = llm.isActive
  formData.isDefault = llm.isDefault
  configuratorType = llm.configuratorType || 1

  capabilities.supportImageInput = (llm.capabilities & 16) === 16
  capabilities.supportFunctionCalling = (llm.capabilities & 8) === 8
  capabilities.supportDeepThinking = (llm.capabilities & 128) === 128

  selectedVendor = VENDOR_PROVIDERS.find(v => v.name === llm.vendorName)

  renderEditForm(editorEl, llm, root)
}

function renderCreateForm(editorEl, root) {
  const vendorOptions = VENDOR_PROVIDERS.map(v => 
    `<option value="${v.name}">${v.name}</option>`
  ).join('')

  editorEl.innerHTML = `
    <div class="llm-editor-header">
      <h3 class="card-title">创建配置</h3>
      <div class="llm-editor-actions">
        <button id="save-test-btn" class="btn btn-success">${ICONS.connection}<span>保存并测试</span></button>
        <button id="save-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
      </div>
    </div>
    
    <div class="configurator-tabs">
      <button class="configurator-tab ${configuratorType === 1 ? 'active' : ''}" data-type="1">预设模式</button>
      <button class="configurator-tab ${configuratorType === 2 ? 'active' : ''}" data-type="2">进阶模式</button>
    </div>
    
    <div class="llm-form-content">
      ${configuratorType === 1 ? `
        <div class="mode-description">
          <h4>预设模式</h4>
          <p>通过预定义的模板简化配置，快速上手，适合大多数用户</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">模型提供商</label>
            <select id="vendor-name" class="form-input">
              <option value="">请选择模型提供商</option>
              ${vendorOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <select id="model-name" class="form-input" ${!selectedVendor ? 'disabled' : ''}>
              <option value="">请先选择提供商</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">API密钥</label>
          <div id="api-keys-list" class="api-keys-list">
            <div class="api-key-item">
              <input class="form-input api-key-input" placeholder="sk-..." />
              <button class="btn-icon btn-icon-danger" data-action="remove-key">${ICONS.delete}</button>
            </div>
          </div>
          <button id="add-api-key-btn" class="btn btn-secondary btn-sm mt-sm">${ICONS.plus}<span>添加密钥</span></button>
        </div>
      ` : `
        <div class="mode-description">
          <h4>进阶模式</h4>
          <p>完全自定义配置，适合有特殊需求的高级用户</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">模型提供商</label>
            <input id="vendor-name" class="form-input" placeholder="输入提供商名称" />
          </div>
          <div class="form-group">
            <label class="form-label">API端点</label>
            <input id="api-endpoint" class="form-input" placeholder="https://api.example.com/v1" />
          </div>
          <div class="form-group">
            <label class="form-label">模型ID</label>
            <input id="model-name" class="form-input" placeholder="model-id" />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">API密钥</label>
          <div id="api-keys-list" class="api-keys-list">
            <div class="api-key-item">
              <input class="form-input api-key-input" placeholder="sk-..." />
              <button class="btn-icon btn-icon-danger" data-action="remove-key">${ICONS.delete}</button>
            </div>
          </div>
          <button id="add-api-key-btn" class="btn btn-secondary btn-sm mt-sm">${ICONS.plus}<span>添加密钥</span></button>
        </div>
      `}
      
      <div class="form-section">
        <h4 class="form-section-title">模型参数</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">上下文长度</label>
            <input id="context-length" class="form-input" type="number" value="${formData.contextLength}" />
          </div>
          <div class="form-group">
            <label class="form-label">最大输出Tokens</label>
            <input id="max-output-tokens" class="form-input" type="number" value="${formData.maxOutputTokens}" />
          </div>
          <div class="form-group">
            <label class="form-label">最大输入Tokens</label>
            <input id="max-input-tokens" class="form-input" type="number" value="${formData.maxInputTokens}" />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">模型能力</h4>
        <div class="capability-options">
          <label class="checkbox-label">
            <input type="checkbox" id="cap-image" ${capabilities.supportImageInput ? 'checked' : ''} />
            <span>支持图像输入</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="cap-function" ${capabilities.supportFunctionCalling ? 'checked' : ''} />
            <span>支持函数调用</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="cap-thinking" ${capabilities.supportDeepThinking ? 'checked' : ''} />
            <span>支持深度思考</span>
          </label>
        </div>
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">状态设置</h4>
        <div class="form-grid">
          <label class="checkbox-label">
            <input type="checkbox" id="is-active" ${formData.isActive ? 'checked' : ''} />
            <span>激活此配置</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="is-default" ${formData.isDefault ? 'checked' : ''} />
            <span>设为默认配置</span>
          </label>
        </div>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, true)
}

function renderEditForm(editorEl, llm, root) {
  const vendorOptions = VENDOR_PROVIDERS.map(v => 
    `<option value="${v.name}" ${llm.vendorName === v.name ? 'selected' : ''}>${v.name}</option>`
  ).join('')

  const modelOptions = selectedVendor 
    ? selectedVendor.models.map(m => `<option value="${m}" ${llm.modelName === m ? 'selected' : ''}>${m}</option>`).join('')
    : ''

  editorEl.innerHTML = `
    <div class="llm-editor-header">
      <h3 class="card-title">${llm.vendorName}</h3>
      <div class="llm-editor-actions">
        <button id="save-test-btn" class="btn btn-success">${ICONS.connection}<span>保存并测试</span></button>
        <button id="save-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
      </div>
    </div>
    
    <div class="configurator-tabs">
      <button class="configurator-tab ${configuratorType === 1 ? 'active' : ''}" data-type="1">预设模式</button>
      <button class="configurator-tab ${configuratorType === 2 ? 'active' : ''}" data-type="2">进阶模式</button>
    </div>
    
    <div class="llm-form-content">
      ${configuratorType === 1 ? `
        <div class="mode-description">
          <h4>预设模式</h4>
          <p>通过预定义的模板简化配置，快速上手，适合大多数用户</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">模型提供商</label>
            <select id="vendor-name" class="form-input">
              <option value="">请选择模型提供商</option>
              ${vendorOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <select id="model-name" class="form-input">
              ${modelOptions}
              <option value="__custom__">自定义...</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">API密钥</label>
          <div id="api-keys-list" class="api-keys-list">
            <div class="api-key-item">
              <input class="form-input api-key-input" value="sk-***" />
              <button class="btn-icon btn-icon-danger" data-action="remove-key">${ICONS.delete}</button>
            </div>
          </div>
          <button id="add-api-key-btn" class="btn btn-secondary btn-sm mt-sm">${ICONS.plus}<span>添加密钥</span></button>
        </div>
      ` : `
        <div class="mode-description">
          <h4>进阶模式</h4>
          <p>完全自定义配置，适合有特殊需求的高级用户</p>
        </div>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">模型提供商</label>
            <input id="vendor-name" class="form-input" value="${llm.vendorName || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">API端点</label>
            <input id="api-endpoint" class="form-input" value="${llm.apiEndpoint || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">模型ID</label>
            <input id="model-name" class="form-input" value="${llm.modelName || ''}" />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">API密钥</label>
          <div id="api-keys-list" class="api-keys-list">
            <div class="api-key-item">
              <input class="form-input api-key-input" value="sk-***" />
              <button class="btn-icon btn-icon-danger" data-action="remove-key">${ICONS.delete}</button>
            </div>
          </div>
          <button id="add-api-key-btn" class="btn btn-secondary btn-sm mt-sm">${ICONS.plus}<span>添加密钥</span></button>
        </div>
      `}
      
      <div class="form-section">
        <h4 class="form-section-title">模型参数</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">上下文长度</label>
            <input id="context-length" class="form-input" type="number" value="${formData.contextLength}" />
          </div>
          <div class="form-group">
            <label class="form-label">最大输出Tokens</label>
            <input id="max-output-tokens" class="form-input" type="number" value="${formData.maxOutputTokens}" />
          </div>
          <div class="form-group">
            <label class="form-label">最大输入Tokens</label>
            <input id="max-input-tokens" class="form-input" type="number" value="${formData.maxInputTokens}" />
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">模型能力</h4>
        <div class="capability-options">
          <label class="checkbox-label">
            <input type="checkbox" id="cap-image" ${capabilities.supportImageInput ? 'checked' : ''} />
            <span>支持图像输入</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="cap-function" ${capabilities.supportFunctionCalling ? 'checked' : ''} />
            <span>支持函数调用</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="cap-thinking" ${capabilities.supportDeepThinking ? 'checked' : ''} />
            <span>支持深度思考</span>
          </label>
        </div>
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">状态设置</h4>
        <div class="form-grid">
          <label class="checkbox-label">
            <input type="checkbox" id="is-active" ${formData.isActive ? 'checked' : ''} />
            <span>激活此配置</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="is-default" ${formData.isDefault ? 'checked' : ''} />
            <span>设为默认配置</span>
          </label>
        </div>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, false)
}

function setupFormEvents(editorEl, root, isCreate) {
  editorEl.querySelectorAll('.configurator-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      configuratorType = parseInt(tab.dataset.type)
      editorEl.querySelectorAll('.configurator-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      if (isCreate) {
        renderCreateForm(editorEl, root)
      } else {
        const llm = DEMO_LLM_CONFIGS.find(l => l.id === selectedLLMId)
        if (llm) renderEditForm(editorEl, llm, root)
      }
    })
  })

  const vendorSelect = editorEl.querySelector('#vendor-name')
  const modelSelect = editorEl.querySelector('#model-name')

  if (vendorSelect && configuratorType === 1) {
    vendorSelect.addEventListener('change', (e) => {
      const vendor = VENDOR_PROVIDERS.find(v => v.name === e.target.value)
      selectedVendor = vendor
      if (vendor && modelSelect) {
        modelSelect.innerHTML = vendor.models.map(m => `<option value="${m}">${m}</option>`).join('') + '<option value="__custom__">自定义...</option>'
        modelSelect.disabled = false
      }
    })
  }

  if (modelSelect && configuratorType === 1) {
    modelSelect.addEventListener('change', (e) => {
      if (e.target.value === '__custom__') {
        isCustomModel = true
        const customInput = document.createElement('input')
        customInput.className = 'form-input mt-sm'
        customInput.id = 'custom-model-name'
        customInput.placeholder = '输入自定义模型名称'
        modelSelect.parentNode.appendChild(customInput)
      } else {
        isCustomModel = false
        const customInput = editorEl.querySelector('#custom-model-name')
        if (customInput) customInput.remove()
      }
    })
  }

  editorEl.querySelector('#add-api-key-btn')?.addEventListener('click', () => {
    const list = editorEl.querySelector('#api-keys-list')
    const item = document.createElement('div')
    item.className = 'api-key-item'
    item.innerHTML = `
      <input class="form-input api-key-input" placeholder="sk-..." />
      <button class="btn-icon btn-icon-danger" data-action="remove-key">${ICONS.delete}</button>
    `
    list.appendChild(item)
    setupApiKeyRemove(item)
  })

  editorEl.querySelectorAll('.api-key-item').forEach(setupApiKeyRemove)

  editorEl.querySelector('#save-btn')?.addEventListener('click', () => {
    saveLLMConfig(editorEl, isCreate, false)
  })

  editorEl.querySelector('#save-test-btn')?.addEventListener('click', () => {
    saveLLMConfig(editorEl, isCreate, true)
  })
}

function setupApiKeyRemove(item) {
  item.querySelector('[data-action="remove-key"]')?.addEventListener('click', () => {
    const list = item.parentElement
    if (list.children.length > 1) {
      item.remove()
    }
  })
}

function saveLLMConfig(editorEl, isCreate, testConnection) {
  const vendorName = editorEl.querySelector('#vendor-name')?.value
  const modelName = isCustomModel 
    ? editorEl.querySelector('#custom-model-name')?.value 
    : editorEl.querySelector('#model-name')?.value

  if (!vendorName) {
    alert('请选择模型提供商')
    return
  }
  if (!modelName) {
    alert('请选择或输入模型名称')
    return
  }

  const contextLength = parseInt(editorEl.querySelector('#context-length')?.value) || 8192
  const maxOutputTokens = parseInt(editorEl.querySelector('#max-output-tokens')?.value) || 4096
  const maxInputTokens = parseInt(editorEl.querySelector('#max-input-tokens')?.value) || 4096
  const isActive = editorEl.querySelector('#is-active')?.checked ?? true
  const isDefault = editorEl.querySelector('#is-default')?.checked ?? false

  let caps = 5
  if (editorEl.querySelector('#cap-image')?.checked) caps |= 16
  if (editorEl.querySelector('#cap-function')?.checked) caps |= 8
  if (editorEl.querySelector('#cap-thinking')?.checked) caps |= 128

  if (isCreate) {
    const newLLM = {
      id: Date.now(),
      vendorName,
      providerType: selectedVendor ? getProviderType(selectedVendor.type) : 10,
      configuratorType,
      modelName,
      apiEndpoint: selectedVendor?.baseUrl || editorEl.querySelector('#api-endpoint')?.value || '',
      isActive,
      isDefault,
      contextLength,
      maxOutputTokens,
      maxInputTokens,
      capabilities: caps
    }
    if (isDefault) {
      DEMO_LLM_CONFIGS.forEach(l => l.isDefault = false)
    }
    DEMO_LLM_CONFIGS.push(newLLM)
    selectedLLMId = newLLM.id
    isCreating = false
  } else {
    const llm = DEMO_LLM_CONFIGS.find(l => l.id === selectedLLMId)
    if (llm) {
      llm.vendorName = vendorName
      llm.modelName = modelName
      llm.configuratorType = configuratorType
      llm.contextLength = contextLength
      llm.maxOutputTokens = maxOutputTokens
      llm.maxInputTokens = maxInputTokens
      llm.isActive = isActive
      llm.capabilities = caps
      if (isDefault) {
        DEMO_LLM_CONFIGS.forEach(l => l.isDefault = false)
        llm.isDefault = true
      }
    }
  }

  alert(testConnection ? '保存成功！正在测试连通性...' : '保存成功！')
  loadLLMList(document.querySelector('.page'))
  renderLLMEditor(document.querySelector('.page'))
}

function getProviderType(typeName) {
  const typeMap = {
    'Ollama': 100,
    'OpenAI': 10,
    'OpenAIResponses': 20,
    'Anthropic': 30,
    'Google': 40,
  }
  return typeMap[typeName] || 10
}

export function cleanup() {
  selectedLLMId = null
  isCreating = false
  resetFormData()
}
