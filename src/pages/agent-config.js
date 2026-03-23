/**
 * AI代理配置页面
 */
import { ICONS } from '../lib/icons.js'

const AGENT_TYPES = [
  { type: 'novel_outline', name: '小说大纲生成', description: '根据用户输入的故事概念，生成详细的小说大纲，包括主要情节、角色设定和章节规划。' },
  { type: 'chapter_writer', name: '章节内容撰写', description: '根据大纲和上下文，撰写小说章节内容，保持风格一致性和情节连贯性。' },
  { type: 'character_creator', name: '角色创建助手', description: '帮助用户创建详细的角色档案，包括外貌、性格、背景故事等。' },
  { type: 'dialogue_enhancer', name: '对话优化', description: '优化小说中的对话，使其更加自然、生动，符合角色性格。' },
  { type: 'plot_analyzer', name: '情节分析', description: '分析小说情节结构，提供改进建议，确保故事节奏和张力。' },
  { type: 'world_builder', name: '世界观构建', description: '帮助构建小说的世界观，包括地理、历史、文化、魔法体系等设定。' },
]

const DEMO_AGENTS = [
  { id: 1, agentName: '小说大纲生成器', agentType: 'novel_outline', agentRemark: '根据故事概念生成详细大纲', llmConfigId: 1, useDefaultPrompt: true, systemPrompt: '', userPrompt: '' },
  { id: 2, agentName: '章节撰写助手', agentType: 'chapter_writer', agentRemark: '撰写小说章节内容', llmConfigId: 1, useDefaultPrompt: true, systemPrompt: '', userPrompt: '' },
  { id: 3, agentName: '角色创建专家', agentType: 'character_creator', agentRemark: '创建详细角色档案', llmConfigId: 2, useDefaultPrompt: false, systemPrompt: '你是一位专业的角色设计师...', userPrompt: '请为以下角色创建详细档案...' },
]

const DEMO_LLM_OPTIONS = [
  { id: 1, name: 'OpenAI - GPT-4o' },
  { id: 2, name: 'DeepSeek - Chat' },
  { id: 3, name: 'Ollama - Llama3.2' },
]

let selectedAgentId = null
let isCreating = false

const formData = {
  agentName: '',
  agentType: '',
  agentRemark: '',
  llmConfigId: '',
  useDefaultPrompt: true,
  systemPrompt: '',
  userPrompt: '',
}

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">AI代理配置</h1>
      <p class="page-subtitle">配置AI代理的提示词和行为</p>
    </div>
    
    <div class="agent-layout">
      <div class="card agent-list-card">
        <div class="agent-list-header">
          <h3 class="card-title">${ICONS.ai} 代理列表</h3>
          <span class="agent-count">共 ${DEMO_AGENTS.length} 个代理</span>
        </div>
        
        <div class="agent-toolbar">
          <button id="create-agent-btn" class="btn btn-primary btn-sm">${ICONS.plus}<span>新增</span></button>
          <button id="init-agents-btn" class="btn btn-success btn-sm">${ICONS.refresh}<span>初始化</span></button>
        </div>
        
        <div id="agent-list" class="agent-list"></div>
      </div>
      
      <div class="card agent-editor-card">
        <div id="agent-editor"></div>
      </div>
    </div>
  `

  await loadAgentList(el)

  el.querySelector('#create-agent-btn')?.addEventListener('click', () => {
    isCreating = true
    selectedAgentId = null
    resetFormData()
    renderAgentEditor(el)
  })

  el.querySelector('#init-agents-btn')?.addEventListener('click', () => {
    alert('初始化功能开发中...')
  })

  return el
}

async function loadAgentList(root) {
  const listEl = root.querySelector('#agent-list')

  if (DEMO_AGENTS.length === 0) {
    listEl.innerHTML = `
      <div class="text-center text-tertiary p-lg">
        <p>暂无代理</p>
      </div>
    `
    return
  }

  listEl.innerHTML = DEMO_AGENTS.map(item => {
    const agentType = AGENT_TYPES.find(t => t.type === item.agentType)
    return `
      <div class="agent-item ${selectedAgentId === item.id ? 'active' : ''}" data-id="${item.id}">
        <div class="agent-item-header">
          <span class="agent-item-name">${item.agentName || '未命名代理'}</span>
        </div>
        <div class="agent-item-type">${agentType?.name || item.agentType}</div>
        ${item.agentRemark ? `<div class="agent-item-remark">${item.agentRemark}</div>` : ''}
        <div class="agent-item-meta">
          <span class="badge badge-sm ${item.useDefaultPrompt ? 'badge-success' : 'badge-warning'}">
            ${item.useDefaultPrompt ? '默认提示词' : '自定义提示词'}
          </span>
        </div>
        <div class="agent-item-actions">
          <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${item.id}" title="删除">
            ${ICONS.delete}
          </button>
        </div>
      </div>
    `
  }).join('')

  listEl.querySelectorAll('.agent-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete"]')) {
        const id = Number(e.target.closest('[data-action="delete"]').dataset.id)
        handleDelete(id, root)
        return
      }
      
      selectedAgentId = Number(item.dataset.id)
      isCreating = false
      listEl.querySelectorAll('.agent-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      renderAgentEditor(root)
    })
  })

  if (!selectedAgentId && !isCreating && DEMO_AGENTS.length > 0) {
    selectedAgentId = DEMO_AGENTS[0].id
    renderAgentEditor(root)
  }
}

function handleDelete(id, root) {
  if (confirm('确定删除此代理？')) {
    const index = DEMO_AGENTS.findIndex(a => a.id === id)
    if (index > -1) {
      DEMO_AGENTS.splice(index, 1)
      if (selectedAgentId === id) {
        selectedAgentId = null
      }
      loadAgentList(root)
      renderAgentEditor(root)
    }
  }
}

function resetFormData() {
  formData.agentName = ''
  formData.agentType = ''
  formData.agentRemark = ''
  formData.llmConfigId = ''
  formData.useDefaultPrompt = true
  formData.systemPrompt = ''
  formData.userPrompt = ''
}

function renderAgentEditor(root) {
  const editorEl = root.querySelector('#agent-editor')
  
  if (isCreating) {
    renderCreateForm(editorEl, root)
    return
  }

  const agent = DEMO_AGENTS.find(a => a.id === selectedAgentId)
  
  if (!agent) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.ai}</div>
        <div class="empty-state-title">选择代理</div>
        <div class="empty-state-desc">从左侧列表选择代理进行编辑</div>
      </div>
    `
    return
  }

  formData.agentName = agent.agentName || ''
  formData.agentType = agent.agentType || ''
  formData.agentRemark = agent.agentRemark || ''
  formData.llmConfigId = agent.llmConfigId || ''
  formData.useDefaultPrompt = agent.useDefaultPrompt ?? true
  formData.systemPrompt = agent.systemPrompt || ''
  formData.userPrompt = agent.userPrompt || ''

  renderEditForm(editorEl, agent, root)
}

function renderCreateForm(editorEl, root) {
  const agentTypeOptions = AGENT_TYPES.map(t => 
    `<option value="${t.type}">${t.name}</option>`
  ).join('')

  const llmOptions = DEMO_LLM_OPTIONS.map(l => 
    `<option value="${l.id}">${l.name}</option>`
  ).join('')

  editorEl.innerHTML = `
    <div class="agent-editor-header">
      <h3 class="card-title">创建代理</h3>
      <div class="agent-editor-actions">
        <button id="save-agent-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
      </div>
    </div>
    
    <div class="agent-form-content">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">代理名称</label>
          <input id="agent-name" class="form-input" placeholder="请输入代理名称" />
        </div>
        <div class="form-group">
          <label class="form-label">LLM配置</label>
          <select id="llm-config" class="form-input">
            <option value="">请选择LLM配置</option>
            ${llmOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">代理类型</label>
        <select id="agent-type" class="form-input">
          <option value="">请选择代理类型</option>
          ${agentTypeOptions}
        </select>
      </div>
      
      <div id="agent-type-description" class="agent-type-description hidden"></div>
      
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea id="agent-remark" class="form-input" rows="2" placeholder="请输入备注信息"></textarea>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="use-default-prompt" checked />
          <span>使用默认提示词</span>
        </label>
      </div>
      
      <div id="custom-prompt-section" class="custom-prompt-section hidden">
        <div class="form-group">
          <label class="form-label">系统提示词</label>
          <textarea id="system-prompt" class="form-input prompt-textarea" rows="8" placeholder="定义AI代理的角色、行为规则和上下文..."></textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">用户提示词</label>
          <textarea id="user-prompt" class="form-input prompt-textarea" rows="8" placeholder="定义用户输入的默认提示词模板..."></textarea>
        </div>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, true)
}

function renderEditForm(editorEl, agent, root) {
  const agentTypeOptions = AGENT_TYPES.map(t => 
    `<option value="${t.type}" ${agent.agentType === t.type ? 'selected' : ''}>${t.name}</option>`
  ).join('')

  const llmOptions = DEMO_LLM_OPTIONS.map(l => 
    `<option value="${l.id}" ${agent.llmConfigId === l.id ? 'selected' : ''}>${l.name}</option>`
  ).join('')

  const selectedType = AGENT_TYPES.find(t => t.type === agent.agentType)

  editorEl.innerHTML = `
    <div class="agent-editor-header">
      <h3 class="card-title">${agent.agentName}</h3>
      <div class="agent-editor-actions">
        <button id="save-agent-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
      </div>
    </div>
    
    <div class="agent-form-content">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">代理名称</label>
          <input id="agent-name" class="form-input" value="${agent.agentName || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">LLM配置</label>
          <select id="llm-config" class="form-input">
            <option value="">请选择LLM配置</option>
            ${llmOptions}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">代理类型</label>
        <select id="agent-type" class="form-input">
          <option value="">请选择代理类型</option>
          ${agentTypeOptions}
        </select>
      </div>
      
      <div id="agent-type-description" class="agent-type-description ${selectedType ? '' : 'hidden'}">
        ${selectedType ? selectedType.description : ''}
      </div>
      
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea id="agent-remark" class="form-input" rows="2">${agent.agentRemark || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="use-default-prompt" ${agent.useDefaultPrompt ? 'checked' : ''} />
          <span>使用默认提示词</span>
        </label>
      </div>
      
      <div id="custom-prompt-section" class="custom-prompt-section ${agent.useDefaultPrompt ? 'hidden' : ''}">
        <div class="form-group">
          <label class="form-label">系统提示词</label>
          <textarea id="system-prompt" class="form-input prompt-textarea" rows="8">${agent.systemPrompt || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-label">用户提示词</label>
          <textarea id="user-prompt" class="form-input prompt-textarea" rows="8">${agent.userPrompt || ''}</textarea>
        </div>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, false)
}

function setupFormEvents(editorEl, root, isCreate) {
  const agentTypeSelect = editorEl.querySelector('#agent-type')
  const typeDescription = editorEl.querySelector('#agent-type-description')
  const useDefaultPrompt = editorEl.querySelector('#use-default-prompt')
  const customPromptSection = editorEl.querySelector('#custom-prompt-section')

  agentTypeSelect?.addEventListener('change', (e) => {
    const selectedType = AGENT_TYPES.find(t => t.type === e.target.value)
    if (selectedType) {
      typeDescription.textContent = selectedType.description
      typeDescription.classList.remove('hidden')
    } else {
      typeDescription.classList.add('hidden')
    }
  })

  useDefaultPrompt?.addEventListener('change', (e) => {
    if (e.target.checked) {
      customPromptSection.classList.add('hidden')
    } else {
      customPromptSection.classList.remove('hidden')
    }
  })

  editorEl.querySelector('#save-agent-btn')?.addEventListener('click', () => {
    saveAgentConfig(editorEl, isCreate)
  })
}

function saveAgentConfig(editorEl, isCreate) {
  const agentName = editorEl.querySelector('#agent-name')?.value
  const agentType = editorEl.querySelector('#agent-type')?.value
  const llmConfigId = editorEl.querySelector('#llm-config')?.value
  const agentRemark = editorEl.querySelector('#agent-remark')?.value
  const useDefaultPrompt = editorEl.querySelector('#use-default-prompt')?.checked
  const systemPrompt = editorEl.querySelector('#system-prompt')?.value
  const userPrompt = editorEl.querySelector('#user-prompt')?.value

  if (!agentName) {
    alert('请输入代理名称')
    return
  }
  if (!agentType) {
    alert('请选择代理类型')
    return
  }
  if (!llmConfigId) {
    alert('请选择LLM配置')
    return
  }
  if (!useDefaultPrompt && !systemPrompt && !userPrompt) {
    alert('请输入系统提示词或用户提示词')
    return
  }

  if (isCreate) {
    const newAgent = {
      id: Date.now(),
      agentName,
      agentType,
      agentRemark,
      llmConfigId: parseInt(llmConfigId),
      useDefaultPrompt,
      systemPrompt,
      userPrompt,
    }
    DEMO_AGENTS.push(newAgent)
    selectedAgentId = newAgent.id
    isCreating = false
  } else {
    const agent = DEMO_AGENTS.find(a => a.id === selectedAgentId)
    if (agent) {
      agent.agentName = agentName
      agent.agentType = agentType
      agent.agentRemark = agentRemark
      agent.llmConfigId = parseInt(llmConfigId)
      agent.useDefaultPrompt = useDefaultPrompt
      agent.systemPrompt = systemPrompt
      agent.userPrompt = userPrompt
    }
  }

  alert('保存成功！')
  loadAgentList(document.querySelector('.page'))
  renderAgentEditor(document.querySelector('.page'))
}

export function cleanup() {
  selectedAgentId = null
  isCreating = false
  resetFormData()
}
