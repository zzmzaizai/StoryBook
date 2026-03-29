/**
 * Agent 配置页面
 * 
 * 管理 AI Agent 配置，支持自定义提示词和 LLM 绑定
 */
import { icon } from '../lib/icons.js'
import { invoke } from '@tauri-apps/api/core'
import { toastSuccess, toastError } from '../lib/toast.js'
import '../style/virtual-list.css'
import '../style/pages/page-agent-config.css'

let configs = []
let llmConfigs = []
let agentTypes = []
let selectedId = null
let isCreating = false
let promptDetailsCache = new Map()

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Agent 配置</h1>
      <p class="page-subtitle">管理 AI Agent 配置和提示词</p>
    </div>
    
    <div class="agent-layout">
      <div class="card agent-list-card">
        <div class="agent-list-header">
          <h3 class="card-title">${icon('ai', 16)} Agent 列表</h3>
          <span class="agent-count" id="config-count">加载中...</span>
        </div>
        
        <div class="agent-toolbar">
          <button id="create-btn" class="btn btn-primary btn-sm">${icon('plus', 16)}<span>新增配置</span></button>
          <button id="init-btn" class="btn btn-success btn-sm">${icon('refresh', 16)}<span>初始化</span></button>
        </div>
        
        <div id="agent-list-mount" class="agent-list-mount">
          <div id="agent-list" class="agent-list">
            <div class="text-center text-tertiary p-lg">加载中...</div>
          </div>
        </div>
      </div>
      
      <div class="card agent-editor-card">
        <div id="agent-editor">
          <div class="empty-state">
            <div class="empty-state-icon">${icon('ai', 20)}</div>
            <div class="empty-state-title">选择 Agent</div>
            <div class="empty-state-desc">从左侧列表选择 Agent 进行编辑，或点击新增创建配置</div>
          </div>
        </div>
      </div>
    </div>
  `

  // 绑定事件
  el.querySelector('#create-btn')?.addEventListener('click', () => {
    isCreating = true
    selectedId = null
    renderEditor(el)
  })

  el.querySelector('#init-btn')?.addEventListener('click', async () => {
    try {
      await invoke('init_default_agent_configs')
      toastSuccess('初始化成功，已补齐缺失的 Agent 配置')
      await loadData(el)
    } catch (err) {
      toastError(`初始化失败: ${err}`)
    }
  })

  // 加载数据
  await loadData(el)

  return el
}

async function loadData(root) {
  try {
    // 并行加载所有数据
    const [agentConfigs, llmList, types] = await Promise.all([
      invoke('list_agent_configs'),
      invoke('list_llm_configs'),
      invoke('get_agent_types'),
    ])
    
    configs = agentConfigs
    llmConfigs = llmList
    agentTypes = types
    
    renderList(root)
  } catch (err) {
    console.error('加载 Agent 配置失败:', err)
    root.querySelector('#agent-list').innerHTML = `
      <div class="text-center text-danger p-lg">
        <p>加载失败: ${err}</p>
        <button class="btn btn-primary btn-sm mt-sm" onclick="location.reload()">重试</button>
      </div>
    `
  }
}

function renderList(root) {
  const listEl = root.querySelector('#agent-list')
  const countEl = root.querySelector('#config-count')
  
  countEl.textContent = `共 ${configs.length} 个配置`

  if (configs.length === 0) {
    listEl.innerHTML = `
      <div class="text-center text-tertiary p-lg">
        <p>暂无配置</p>
        <p class="text-sm mt-xs">点击上方按钮创建或初始化配置</p>
      </div>
    `
    return
  }

  listEl.innerHTML = configs.map(config => {
    const agentType = agentTypes.find(t => t.code === config.agent_code)
    const llmConfig = llmConfigs.find(l => l.id === config.llm_config_id)
    
    return `
      <div class="agent-item ${selectedId === config.id ? 'active' : ''}" data-id="${config.id}">
        <div class="agent-item-header">
          <div class="agent-item-name-row">
            <span class="agent-item-name">${escapeHtml(config.name)}</span>
          </div>
        </div>
        <div class="agent-item-type">${agentType?.name || config.agent_code}</div>
        ${config.description ? `<div class="agent-item-desc">${escapeHtml(config.description)}</div>` : ''}
        <div class="agent-item-meta">
          <span class="badge badge-sm badge-success">启用</span>
          <span class="badge badge-sm ${config.use_system_prompt ? 'badge-info' : 'badge-warning'}">${config.use_system_prompt ? '系统提示词' : '自定义提示词'}</span>
          ${config.builtin ? '<span class="badge badge-sm badge-info">内置</span>' : '<span class="badge badge-sm badge-secondary">扩展</span>'}
          ${llmConfig ? `<span class="badge badge-sm">${escapeHtml(llmConfig.name)}</span>` : '<span class="badge badge-sm badge-secondary">默认 LLM</span>'}
          <span class="agent-item-meta-spacer"></span>
          ${config.builtin
            ? `<button class="list-item-delete-btn list-item-delete-btn-visible" data-action="reset" data-id="${config.id}" title="重置默认">${icon('refresh', 14)}</button>`
            : `<button class="list-item-delete-btn list-item-delete-btn-visible" data-action="delete" data-id="${config.id}" title="删除">${icon('delete', 14)}</button>`}
        </div>
      </div>
    `
  }).join('')

  // 绑定列表项点击事件
  listEl.querySelectorAll('.agent-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // 如果点击的是操作按钮，不触发选择
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
      case 'delete':
        if (confirm('确定删除此 Agent 配置？')) {
          await invoke('delete_agent_config', { id })
          if (selectedId === id) {
            selectedId = null
            renderEditor(root)
          }
        } else {
          return
        }
        break
      case 'reset':
        if (confirm('确定将此内置 Agent 重置为默认配置？')) {
          await invoke('reset_builtin_agent_config', { id })
        } else {
          return
        }
        break
    }
    await loadData(root)
  } catch (err) {
    toastError(`操作失败: ${err}`)
  }
}

async function renderEditor(root) {
  const editorEl = root.querySelector('#agent-editor')
  
  if (isCreating) {
    renderCreateForm(editorEl, root)
    return
  }

  const config = configs.find(c => c.id === selectedId)
  
  if (!config) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('ai', 20)}</div>
        <div class="empty-state-title">选择 Agent</div>
        <div class="empty-state-desc">从左侧列表选择 Agent 进行编辑</div>
      </div>
    `
    return
  }

  const promptDetails = await getPromptDetails(config.agent_code)
  renderEditForm(editorEl, config, promptDetails, root)
}

function renderCreateForm(editorEl, root) {
  const agentTypeOptions = agentTypes.map(t => 
    `<option value="${t.code}">${t.name}</option>`
  ).join('')

  const llmOptions = llmConfigs
    .filter(l => l.enabled)
    .map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`)
    .join('')

  editorEl.innerHTML = `
    <div class="agent-editor-header">
      <h3 class="card-title">创建 Agent 配置</h3>
      <div class="agent-editor-actions">
        <button id="save-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
        <button id="cancel-btn" class="btn btn-secondary">取消</button>
      </div>
    </div>
    
    <div class="agent-form-content">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Agent 类型 <span class="text-danger">*</span></label>
          <select id="agent-code" class="form-input">
            <option value="">请选择 Agent 类型</option>
            ${agentTypeOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">显示名称 <span class="text-danger">*</span></label>
          <input id="name" class="form-input" placeholder="例如：小说大纲生成器" />
        </div>
      </div>
      
      <div id="agent-type-description" class="agent-type-description hidden"></div>
      
      <div class="form-group">
        <label class="form-label">描述</label>
        <input id="description" class="form-input" placeholder="可选描述信息" />
      </div>
      
      <div class="form-group">
        <label class="form-label">绑定 LLM 配置</label>
        <select id="llm-config-id" class="form-input">
          <option value="">使用默认 LLM</option>
          ${llmOptions}
        </select>
        <span class="form-hint">不选择将使用默认 LLM 配置</span>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="use-custom-prompt" />
          <span>使用自定义提示词</span>
        </label>
        <span class="form-hint">默认使用系统提示词；勾选后切换为使用自定义提示词。</span>
      </div>

      <div id="system-prompt-section" class="form-group">
        <label class="form-label">系统提示词</label>
        <textarea id="system-prompt-preview" class="form-input prompt-textarea agent-prompt-preview" rows="10" readonly placeholder="请选择 Agent 类型后查看系统提示词"></textarea>
      </div>

      <div id="custom-prompt-section" class="custom-prompt-section hidden">
        <div class="form-group">
          <div class="agent-inline-label-row">
            <label class="form-label">自定义提示词</label>
            <button id="copy-system-to-custom-btn" class="btn btn-secondary btn-sm" type="button">${icon('copy', 14)}<span>填充系统默认提示词</span></button>
          </div>
          <textarea id="custom-prompt" class="form-input prompt-textarea" rows="12" placeholder="输入自定义提示词..."></textarea>
          <span class="form-hint">如需基于系统提示词修改，请先点击“填充系统默认提示词”。</span>
        </div>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, true)
}

function renderEditForm(editorEl, config, promptDetails, root) {
  const agentType = agentTypes.find(t => t.code === config.agent_code)
  
  const llmOptions = llmConfigs
    .filter(l => l.enabled)
    .map(l => `<option value="${l.id}" ${config.llm_config_id === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`)
    .join('')

  editorEl.innerHTML = `
    <div class="agent-editor-header">
      <h3 class="card-title">${escapeHtml(config.name)}</h3>
      <div class="agent-editor-actions">
        <button id="save-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
        <button id="cancel-btn" class="btn btn-secondary">取消</button>
      </div>
    </div>
    
    <div class="agent-form-content">
      <div class="form-section">
        <h4 class="form-section-title">基本信息</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Agent 代码</label>
            <input class="form-input" value="${config.agent_code}" disabled />
            <span class="form-hint">Agent 代码不可修改</span>
          </div>
          <div class="form-group">
            <label class="form-label">显示名称 <span class="text-danger">*</span></label>
            <input id="name" class="form-input" value="${escapeHtml(config.name)}" />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">描述</label>
          <input id="description" class="form-input" value="${escapeHtml(config.description || '')}" placeholder="可选描述信息" />
        </div>
        
        <div class="form-group">
          <label class="form-label">绑定 LLM 配置</label>
          <select id="llm-config-id" class="form-input">
            <option value="">使用默认 LLM</option>
            ${llmOptions}
          </select>
        </div>
        
      </div>
      
      <div class="form-section">
        <h4 class="form-section-title">提示词配置</h4>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="use-custom-prompt" ${config.use_system_prompt ? '' : 'checked'} />
            <span>使用自定义提示词</span>
          </label>
          <span class="form-hint">默认使用系统提示词；勾选后切换为使用自定义提示词。</span>
        </div>
        
        <div class="agent-prompt-grid">
          <div id="system-prompt-section" class="form-group ${config.use_system_prompt ? '' : 'hidden'}">
            <label class="form-label">系统提示词</label>
            <textarea id="system-prompt-preview" class="form-input prompt-textarea agent-prompt-preview" rows="10" readonly>${escapeHtml(promptDetails?.system_prompt || '')}</textarea>
          </div>

          <div id="custom-prompt-section" class="custom-prompt-section ${config.use_system_prompt ? 'hidden' : ''}">
          <div class="form-group">
            <div class="agent-inline-label-row">
              <label class="form-label">自定义提示词</label>
              <button id="copy-system-to-custom-btn" class="btn btn-secondary btn-sm" type="button">${icon('copy', 14)}<span>填充系统默认提示词</span></button>
            </div>
            <textarea id="custom-prompt" class="form-input prompt-textarea" rows="12" placeholder="输入自定义提示词...">${escapeHtml(config.custom_prompt || '')}</textarea>
            <span class="form-hint">如需基于系统提示词修改，请先点击“填充系统默认提示词”。</span>
          </div>
          </div>
        </div>
      </div>
    </div>
  `

  setupFormEvents(editorEl, root, false)
}

function setupFormEvents(editorEl, root, isCreate) {
  const agentCodeSelect = editorEl.querySelector('#agent-code')
  const typeDescription = editorEl.querySelector('#agent-type-description')
  const useCustomPrompt = editorEl.querySelector('#use-custom-prompt')
  const customPrompt = editorEl.querySelector('#custom-prompt')
  const systemPromptPreview = editorEl.querySelector('#system-prompt-preview')

  // Agent 类型改变时显示描述
  agentCodeSelect?.addEventListener('change', (e) => {
    const selectedType = agentTypes.find(t => t.code === e.target.value)
    if (selectedType) {
      typeDescription.innerHTML = `
        <strong>${selectedType.name}</strong>
        <p>${selectedType.description}</p>
      `
      typeDescription.classList.remove('hidden')
      
      // 自动填充名称
      const nameInput = editorEl.querySelector('#name')
      if (nameInput && !nameInput.value) {
        nameInput.value = selectedType.name
      }

      if (isCreate) {
        getPromptDetails(selectedType.code)
          .then((details) => {
            if (systemPromptPreview) {
              systemPromptPreview.value = details?.system_prompt || ''
            }
          })
          .catch(() => {})
      }
    } else {
      typeDescription.classList.add('hidden')
      if (isCreate && systemPromptPreview) {
        systemPromptPreview.value = ''
      }
    }
  })

  useCustomPrompt?.addEventListener('change', () => {
    updatePromptMode(editorEl)
  })

  editorEl.querySelector('#copy-system-to-custom-btn')?.addEventListener('click', () => {
    const systemText = systemPromptPreview?.value || ''
    if (!customPrompt) return
    if (!customPrompt.value.trim()) {
      customPrompt.value = systemText
    } else if (confirm('自定义提示词已有内容，是否使用系统提示词覆盖？')) {
      customPrompt.value = systemText
    }
    if (useCustomPrompt) useCustomPrompt.checked = true
    updatePromptMode(editorEl)
  })

  // 保存按钮
  editorEl.querySelector('#save-btn')?.addEventListener('click', async () => {
    await saveConfig(editorEl, root, isCreate)
  })

  // 取消按钮
  editorEl.querySelector('#cancel-btn')?.addEventListener('click', () => {
    if (isCreate) {
      isCreating = false
      selectedId = null
    }
    renderList(root)
    renderEditor(root)
  })
}

function updatePromptMode(editorEl) {
  const useCustomPrompt = editorEl.querySelector('#use-custom-prompt')?.checked
  const systemSection = editorEl.querySelector('#system-prompt-section')
  const customSection = editorEl.querySelector('#custom-prompt-section')

  if (systemSection) {
    systemSection.classList.toggle('hidden', !!useCustomPrompt)
  }
  if (customSection) {
    customSection.classList.toggle('hidden', !useCustomPrompt)
  }
}

async function getPromptDetails(agentCode) {
  if (promptDetailsCache.has(agentCode)) return promptDetailsCache.get(agentCode)
  const details = await invoke('get_agent_prompt_details', { agentCode })
  promptDetailsCache.set(agentCode, details)
  return details
}

async function saveConfig(editorEl, root, isCreate) {
  const name = editorEl.querySelector('#name')?.value?.trim()
  const description = editorEl.querySelector('#description')?.value?.trim()
  const llmConfigId = editorEl.querySelector('#llm-config-id')?.value
  const useCustomPrompt = editorEl.querySelector('#use-custom-prompt')?.checked
  const customPrompt = editorEl.querySelector('#custom-prompt')?.value?.trim()

  // 验证
  if (!name) {
    alert('请输入显示名称')
    return
  }

  try {
    if (isCreate) {
      const agentCode = editorEl.querySelector('#agent-code')?.value
      if (!agentCode) {
        alert('请选择 Agent 类型')
        return
      }

      await invoke('create_agent_config', {
        req: {
          agent_code: agentCode,
          name,
          description: description || null,
          llm_config_id: llmConfigId ? Number(llmConfigId) : null,
          custom_prompt: customPrompt || null,
          use_system_prompt: !useCustomPrompt,
          extra_config: null,
        }
      })
    } else {
      await invoke('update_agent_config', {
        id: selectedId,
        req: {
          name,
          description: description ? description : null,
          llm_config_id: llmConfigId ? Number(llmConfigId) : null,
          custom_prompt: customPrompt ? customPrompt : null,
          use_system_prompt: !useCustomPrompt,
          extra_config: null,
        }
      })
    }

    isCreating = false
    await loadData(root)
  } catch (err) {
    toastError(`保存失败: ${err}`)
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
  llmConfigs = []
  agentTypes = []
  promptDetailsCache = new Map()
  selectedId = null
  isCreating = false
}
