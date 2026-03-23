/**
 * 共享模型预设配置
 * LLM 配置和 AI Agent 配置共用
 */

// API 接口类型选项
export const API_TYPES = [
  { value: 'openai-completions', label: 'OpenAI 兼容 (最常用)' },
  { value: 'anthropic-messages', label: 'Anthropic 原生' },
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'google-gemini', label: 'Google Gemini' },
]

// 服务商快捷预设
export const PROVIDER_PRESETS = [
  { key: 'qtcool', label: '晴辰云', badge: '官方', baseUrl: 'https://gpt.qt.cool/v1', api: 'openai-completions', site: 'https://gpt.qt.cool/', desc: 'GPT-5 全系列开箱即用，更多模型持续接入中。每日签到送额度 · 邀请送余额 · 充值最低 3 折消耗 · 未消耗包退' },
  { key: 'openai', label: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1', api: 'openai-completions' },
  { key: 'anthropic', label: 'Anthropic 官方', baseUrl: 'https://api.anthropic.com', api: 'anthropic-messages' },
  { key: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', api: 'openai-completions' },
  { key: 'google', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', api: 'google-gemini' },
  { key: 'ollama', label: 'Ollama (本地)', baseUrl: 'http://127.0.0.1:11434/v1', api: 'openai-completions' },
  { key: 'custom', label: '自定义', baseUrl: '', api: 'openai-completions' },
]

// 晴辰云推广配置
export const QTCOOL = {
  baseUrl: 'https://gpt.qt.cool/v1',
  defaultKey: 'sk-0JDu7hyc51ZKD4iNebpFu07EUEhXmVVc',
  site: 'https://gpt.qt.cool/',
  checkinUrl: 'https://gpt.qt.cool/checkin',
  usageUrl: 'https://gpt.qt.cool/user?key=',
  providerKey: 'qtcool',
  brandName: '晴辰云',
  api: 'openai-completions',
  models: []
}

// 常用模型预设（按服务商分组）
export const MODEL_PRESETS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
    { id: 'o3-mini', name: 'o3 Mini', contextWindow: 200000, reasoning: true },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5-20250514', name: 'Claude Sonnet 4.5', contextWindow: 200000 },
    { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', contextWindow: 200000 },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3', contextWindow: 64000 },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextWindow: 64000, reasoning: true },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1000000, reasoning: true },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000 },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 1000000 },
  ],
  ollama: [
    { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B', contextWindow: 32768 },
    { id: 'llama3.2', name: 'Llama 3.2', contextWindow: 8192 },
    { id: 'gemma3', name: 'Gemma 3', contextWindow: 32768 },
    { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', contextWindow: 32768, reasoning: true },
  ],
}

// Agent 预设模板
export const AGENT_PRESETS = [
  {
    id: 'novel-writer',
    name: '小说创作助手',
    description: '专业的小说创作助手，帮助构思情节、塑造人物、润色文字',
    systemPrompt: '你是一位专业的小说创作助手。你擅长帮助作者构思情节、塑造人物形象、润色文字表达。请根据用户的需求提供专业、有建设性的建议。',
    temperature: 0.7,
    maxTokens: 4096,
  },
  {
    id: 'character-designer',
    name: '角色设计师',
    description: '帮助设计小说角色，包括性格、背景、外貌等',
    systemPrompt: '你是一位专业的角色设计师。你擅长为小说创作设计立体、有深度的角色形象，包括角色的性格特点、成长背景、外貌特征、行为习惯等。请提供详细且富有创意的角色设计方案。',
    temperature: 0.8,
    maxTokens: 2048,
  },
  {
    id: 'plot-planner',
    name: '情节规划师',
    description: '帮助规划小说情节走向，设计冲突和高潮',
    systemPrompt: '你是一位专业的情节规划师。你擅长设计引人入胜的故事情节，包括起承转合、冲突设置、高潮安排、伏笔埋设等。请帮助用户构建逻辑严密、节奏合理的情节框架。',
    temperature: 0.6,
    maxTokens: 4096,
  },
  {
    id: 'editor',
    name: '文字编辑',
    description: '专业的文字编辑，帮助润色和改进文章',
    systemPrompt: '你是一位专业的文字编辑。你擅长发现文章中的问题并提供修改建议，包括语法错误、表达不当、逻辑漏洞等。请以专业、细致的态度帮助用户改进文章质量。',
    temperature: 0.3,
    maxTokens: 2048,
  },
  {
    id: 'world-builder',
    name: '世界观构建师',
    description: '帮助构建小说的世界观、设定和规则',
    systemPrompt: '你是一位专业的世界观构建师。你擅长为小说创建完整、自洽的世界设定，包括地理环境、社会制度、魔法/科技体系、历史背景等。请帮助用户构建富有想象力和逻辑性的世界观。',
    temperature: 0.7,
    maxTokens: 4096,
  },
]

/**
 * 根据服务商获取模型列表
 * @param {string} providerKey 服务商标识
 * @returns {Array} 模型列表
 */
export function getModelsByProvider(providerKey) {
  return MODEL_PRESETS[providerKey] || []
}

/**
 * 获取所有模型
 * @returns {Array} 所有模型列表
 */
export function getAllModels() {
  return Object.values(MODEL_PRESETS).flat()
}

/**
 * 根据模型 ID 查找模型信息
 * @param {string} modelId 模型 ID
 * @returns {Object|null} 模型信息
 */
export function findModelById(modelId) {
  for (const models of Object.values(MODEL_PRESETS)) {
    const model = models.find(m => m.id === modelId)
    if (model) return model
  }
  return null
}

/**
 * 获取服务商预设
 * @param {string} providerKey 服务商标识
 * @returns {Object|null} 服务商预设
 */
export function getProviderPreset(providerKey) {
  return PROVIDER_PRESETS.find(p => p.key === providerKey) || null
}

/**
 * 动态获取晴辰云模型列表
 * @param {string} [apiKey] - 自定义密钥，不传则用默认密钥
 * @returns {Promise<Array<{id:string, name:string, contextWindow:number, reasoning?:boolean}>>}
 */
export async function fetchQtcoolModels(apiKey) {
  const key = apiKey || QTCOOL.defaultKey
  try {
    const resp = await fetch(QTCOOL.baseUrl + '/models', {
      headers: { 'Authorization': 'Bearer ' + key },
      signal: AbortSignal.timeout(8000)
    })
    if (resp.ok) {
      const data = await resp.json()
      if (data.data && data.data.length) {
        return data.data.map(m => ({
          id: m.id, name: m.id, contextWindow: 128000,
          reasoning: m.id.includes('codex')
        })).sort((a, b) => b.id.localeCompare(a.id))
      }
    }
  } catch { /* use fallback */ }
  return QTCOOL.models
}
