import { invoke } from '@tauri-apps/api/core'
import { ICONS } from '../lib/icons.js'

/**
 * Chat 页面模块
 * 支持切换不同 Agent 进行对话，默认使用通用助手
 */

// 当前状态
let currentAgentCode = 'general_chat'
let currentAgentName = '通用助手'
let messages = []
let isLoading = false
let agents = []

/**
 * 渲染 Chat 页面
 */
export function renderChat(root) {
  root.innerHTML = `
    <div class="page-container chat-container">
      <!-- 侧边栏：Agent 选择 -->
      <aside class="chat-sidebar">
        <div class="chat-sidebar-header">
          <h3>${ICONS.message} AI 助手</h3>
        </div>
        <div class="chat-agent-list" id="agent-list">
          <!-- Agent 列表将在这里渲染 -->
        </div>
      </aside>

      <!-- 主聊天区域 -->
      <main class="chat-main">
        <!-- 聊天头部 -->
        <header class="chat-header">
          <div class="chat-header-info">
            <span class="chat-header-icon">${ICONS.ai}</span>
            <div class="chat-header-text">
              <h2 id="current-agent-name">${currentAgentName}</h2>
              <span class="chat-header-status" id="agent-status">准备就绪</span>
            </div>
          </div>
          <div class="chat-header-actions">
            <button class="btn-icon" id="clear-chat" title="清空对话">
              ${ICONS.trash}
            </button>
            <button class="btn-icon" id="chat-settings" title="设置">
              ${ICONS.settings}
            </button>
          </div>
        </header>

        <!-- 消息列表 -->
        <div class="chat-messages" id="chat-messages">
          <div class="chat-welcome">
            <div class="chat-welcome-icon">${ICONS.sparkles}</div>
            <h3>你好！我是 ${currentAgentName}</h3>
            <p>有什么我可以帮你的吗？</p>
          </div>
        </div>

        <!-- 输入区域 -->
        <footer class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea 
              id="chat-input" 
              class="chat-input" 
              placeholder="输入消息..."
              rows="1"
            ></textarea>
            <button class="chat-send-btn" id="send-btn" disabled>
              ${ICONS.send}
            </button>
          </div>
          <div class="chat-input-hint">
            <span>按 Enter 发送，Shift + Enter 换行</span>
          </div>
        </footer>
      </main>
    </div>
  `

  // 初始化
  initChat()
}

/**
 * 初始化聊天功能
 */
async function initChat() {
  // 加载 Agent 列表
  await loadAgents()

  // 绑定事件
  bindEvents()

  // 加载历史消息（如果有）
  loadMessages()
}

/**
 * 加载可用 Agent 列表
 */
async function loadAgents() {
  try {
    // 从后端获取 Agent 配置列表
    const agentConfigs = await invoke('list_agent_configs')
    
    // 构建 Agent 列表数据
    agents = [
      {
        code: 'general_chat',
        name: '通用助手',
        description: '通用的 AI 助手，可以回答各种问题',
        icon: ICONS.message,
        isDefault: true
      },
      ...agentConfigs
        .filter(cfg => cfg.enabled && cfg.agent_code !== 'general_chat')
        .map(cfg => ({
          code: cfg.agent_code,
          name: cfg.name,
          description: cfg.description || '',
          icon: getAgentIcon(cfg.agent_code),
          isDefault: false
        }))
    ]

    renderAgentList()
  } catch (err) {
    console.error('加载 Agent 列表失败:', err)
    // 使用默认列表
    agents = [
      {
        code: 'general_chat',
        name: '通用助手',
        description: '通用的 AI 助手，可以回答各种问题',
        icon: ICONS.message,
        isDefault: true
      }
    ]
    renderAgentList()
  }
}

/**
 * 获取 Agent 图标
 */
function getAgentIcon(agentCode) {
  const iconMap = {
    'novel_outline': ICONS.book,
    'chapter_timeline': ICONS.timeline,
    'character_design': ICONS.user,
    'general_chat': ICONS.message
  }
  return iconMap[agentCode] || ICONS.ai
}

/**
 * 渲染 Agent 列表
 */
function renderAgentList() {
  const listEl = document.getElementById('agent-list')
  if (!listEl) return

  listEl.innerHTML = agents.map(agent => `
    <div class="chat-agent-item ${agent.code === currentAgentCode ? 'active' : ''}" 
         data-code="${agent.code}">
      <span class="chat-agent-icon">${agent.icon}</span>
      <div class="chat-agent-info">
        <span class="chat-agent-name">${agent.name}</span>
        <span class="chat-agent-desc">${agent.description}</span>
      </div>
    </div>
  `).join('')
}

/**
 * 绑定事件
 */
function bindEvents() {
  // Agent 切换
  const agentList = document.getElementById('agent-list')
  agentList?.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-agent-item')
    if (item) {
      const code = item.dataset.code
      switchAgent(code)
    }
  })

  // 输入框自动调整高度
  const input = document.getElementById('chat-input')
  input?.addEventListener('input', () => {
    autoResizeTextarea(input)
    updateSendButton()
  })

  // 发送消息
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // 发送按钮
  const sendBtn = document.getElementById('send-btn')
  sendBtn?.addEventListener('click', sendMessage)

  // 清空对话
  const clearBtn = document.getElementById('clear-chat')
  clearBtn?.addEventListener('click', clearChat)
}

/**
 * 自动调整文本框高度
 */
function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
}

/**
 * 更新发送按钮状态
 */
function updateSendButton() {
  const input = document.getElementById('chat-input')
  const sendBtn = document.getElementById('send-btn')
  if (input && sendBtn) {
    sendBtn.disabled = !input.value.trim() || isLoading
  }
}

/**
 * 切换 Agent
 */
function switchAgent(code) {
  if (code === currentAgentCode) return

  const agent = agents.find(a => a.code === code)
  if (!agent) return

  currentAgentCode = code
  currentAgentName = agent.name

  // 更新 UI
  document.getElementById('current-agent-name').textContent = agent.name
  renderAgentList()

  // 添加系统消息
  addSystemMessage(`已切换到 ${agent.name}`)
}

/**
 * 发送消息
 */
async function sendMessage() {
  const input = document.getElementById('chat-input')
  const message = input.value.trim()
  
  if (!message || isLoading) return

  // 添加用户消息
  addUserMessage(message)
  
  // 清空输入框
  input.value = ''
  input.style.height = 'auto'
  updateSendButton()

  // 显示加载状态
  showLoading()

  try {
    // 调用后端发送消息
    const response = await invoke('chat_with_agent', {
      agentCode: currentAgentCode,
      message: message,
      history: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }))
    })

    // 添加 AI 回复
    addAssistantMessage(response.content)
  } catch (err) {
    console.error('发送消息失败:', err)
    addErrorMessage('发送失败，请重试')
  } finally {
    hideLoading()
  }
}

/**
 * 添加用户消息
 */
function addUserMessage(content) {
  const message = {
    id: Date.now(),
    role: 'user',
    content,
    timestamp: new Date().toISOString()
  }
  messages.push(message)
  renderMessage(message)
  scrollToBottom()
}

/**
 * 添加助手消息
 */
function addAssistantMessage(content) {
  const message = {
    id: Date.now(),
    role: 'assistant',
    content,
    timestamp: new Date().toISOString()
  }
  messages.push(message)
  renderMessage(message)
  scrollToBottom()
}

/**
 * 添加系统消息
 */
function addSystemMessage(content) {
  const message = {
    id: Date.now(),
    role: 'system',
    content,
    timestamp: new Date().toISOString()
  }
  messages.push(message)
  renderMessage(message)
  scrollToBottom()
}

/**
 * 添加错误消息
 */
function addErrorMessage(content) {
  const messagesContainer = document.getElementById('chat-messages')
  if (!messagesContainer) return

  const errorEl = document.createElement('div')
  errorEl.className = 'chat-message chat-message-error'
  errorEl.innerHTML = `
    <div class="chat-message-content">
      <span class="chat-error-icon">${ICONS.alert}</span>
      <span>${content}</span>
    </div>
  `
  messagesContainer.appendChild(errorEl)
  scrollToBottom()
}

/**
 * 渲染单条消息
 */
function renderMessage(message) {
  const messagesContainer = document.getElementById('chat-messages')
  if (!messagesContainer) return

  // 隐藏欢迎消息
  const welcomeEl = messagesContainer.querySelector('.chat-welcome')
  if (welcomeEl) {
    welcomeEl.style.display = 'none'
  }

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  const messageEl = document.createElement('div')
  messageEl.className = `chat-message ${isUser ? 'chat-message-user' : isSystem ? 'chat-message-system' : 'chat-message-assistant'}`
  messageEl.dataset.id = message.id

  if (isSystem) {
    messageEl.innerHTML = `
      <div class="chat-message-content">
        <span class="chat-system-text">${message.content}</span>
      </div>
    `
  } else {
    messageEl.innerHTML = `
      <div class="chat-message-avatar">
        ${isUser ? ICONS.user : ICONS.ai}
      </div>
      <div class="chat-message-body">
        <div class="chat-message-header">
          <span class="chat-message-author">${isUser ? '我' : currentAgentName}</span>
          <span class="chat-message-time">${formatTime(message.timestamp)}</span>
        </div>
        <div class="chat-message-content">
          ${formatMessageContent(message.content)}
        </div>
      </div>
    `
  }

  messagesContainer.appendChild(messageEl)
}

/**
 * 格式化消息内容
 */
function formatMessageContent(content) {
  // 简单处理：将换行符转为 <br>
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById('chat-messages')
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

/**
 * 显示加载状态
 */
function showLoading() {
  isLoading = true
  updateSendButton()

  const messagesContainer = document.getElementById('chat-messages')
  if (!messagesContainer) return

  const loadingEl = document.createElement('div')
  loadingEl.className = 'chat-message chat-message-loading'
  loadingEl.id = 'chat-loading'
  loadingEl.innerHTML = `
    <div class="chat-message-avatar">${ICONS.ai}</div>
    <div class="chat-message-body">
      <div class="chat-loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `
  messagesContainer.appendChild(loadingEl)
  scrollToBottom()
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
  isLoading = false
  updateSendButton()

  const loadingEl = document.getElementById('chat-loading')
  if (loadingEl) {
    loadingEl.remove()
  }
}

/**
 * 清空对话
 */
function clearChat() {
  if (messages.length === 0) return

  if (confirm('确定要清空当前对话吗？')) {
    messages = []
    const messagesContainer = document.getElementById('chat-messages')
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="chat-welcome">
          <div class="chat-welcome-icon">${ICONS.sparkles}</div>
          <h3>你好！我是 ${currentAgentName}</h3>
          <p>有什么我可以帮你的吗？</p>
        </div>
      `
    }
  }
}

/**
 * 加载历史消息
 */
function loadMessages() {
  // TODO: 从本地存储或数据库加载历史消息
  messages = []
}
