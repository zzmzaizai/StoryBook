import { toastError } from '../lib/toast.js'

const { invoke } = window.__TAURI__.core

const CACHE_TTL = 15000
const REQUEST_LOG_LIMIT = 100

const requestCache = new Map()
const requestLogs = []

function stringifyArgs(args) {
  try {
    return JSON.stringify(args ?? {})
  } catch {
    return '{}'
  }
}

function buildCacheKey(cmd, args) {
  return `${cmd}:${stringifyArgs(args)}`
}

function trimRequestLogs() {
  while (requestLogs.length > REQUEST_LOG_LIMIT) {
    requestLogs.shift()
  }
}

function logRequest(cmd, args, duration, options = {}) {
  const { cached = false, error = null } = options
  requestLogs.push({
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      fractionalSecondDigits: 3,
    }),
    cmd,
    args: stringifyArgs(args),
    duration: Number.isFinite(duration) ? `${duration}ms` : '-',
    cached,
    success: !error,
    error: error || null,
  })
  trimRequestLogs()
}

function normalizeInvokeError(error, cmd) {
  const rawMessage = typeof error === 'string'
    ? error
    : error?.message || error?.toString?.() || `${cmd} 执行失败`
  const message = String(rawMessage).trim() || `${cmd} 执行失败`
  const lower = message.toLowerCase()

  let normalizedMessage = message
  if (lower.includes('504') || lower.includes('gateway timeout')) {
    normalizedMessage = '请求超时（上游服务返回 504），请稍后重试或检查模型网关配置'
  } else if (lower.includes('timeout') || lower.includes('timed out')) {
    normalizedMessage = '请求超时，请稍后重试'
  } else if (lower.includes('network error')) {
    normalizedMessage = '网络异常，请检查网络或服务状态后重试'
  } else if (lower.includes('failed to fetch')) {
    normalizedMessage = '请求发送失败，请检查本地服务是否可用'
  }

  const normalized = new Error(normalizedMessage)
  normalized.name = error?.name || 'InvokeError'
  normalized.cause = error
  normalized.command = cmd
  normalized.rawMessage = message
  normalized.isInvokeError = true
  normalized.toastShown = false
  return normalized
}

function showInvokeErrorToast(error, fallbackMessage) {
  if (!error || error.toastShown) return
  const message = fallbackMessage || error.message || '操作失败'
  toastError(message)
  error.toastShown = true
}

export function getRequestLogs() {
  return requestLogs.slice()
}

export function clearRequestLogs() {
  requestLogs.length = 0
}

export function invalidate(...cmds) {
  if (cmds.length === 0) {
    requestCache.clear()
    return
  }

  for (const key of requestCache.keys()) {
    if (cmds.some(cmd => key.startsWith(`${cmd}:`))) {
      requestCache.delete(key)
    }
  }
}

export function getErrorMessage(error, fallback = '操作失败') {
  if (!error) return fallback
  return error.message || error.rawMessage || String(error)
}

export async function invokeCommand(cmd, args = {}, options = {}) {
  const { showErrorToast = false, errorMessage } = options
  const start = Date.now()

  try {
    const result = await invoke(cmd, args)
    logRequest(cmd, args, Date.now() - start)
    return result
  } catch (error) {
    const normalized = normalizeInvokeError(error, cmd)
    logRequest(cmd, args, Date.now() - start, { error: normalized.rawMessage || normalized.message })
    if (showErrorToast) {
      showInvokeErrorToast(normalized, errorMessage)
    }
    throw normalized
  }
}

export function cachedInvoke(cmd, args = {}, ttl = CACHE_TTL, options = {}) {
  const key = buildCacheKey(cmd, args)
  const cached = requestCache.get(key)

  if (cached && Date.now() - cached.timestamp < ttl) {
    logRequest(cmd, args, 0, { cached: true })
    return Promise.resolve(cached.value)
  }

  return invokeCommand(cmd, args, options).then(value => {
    requestCache.set(key, { value, timestamp: Date.now() })
    return value
  })
}

export const ENUMS = {
  NovelStyle: {
    1: '都市', 2: '奇幻', 3: '悬疑', 4: '喜剧', 5: '言情',
    6: '恐怖', 7: '科幻', 8: '历史', 9: '武侠', 10: '仙侠'
  },
  NovelStatus: {
    1: '构思', 2: '进行中', 3: '已完本', 4: '已废弃'
  },
  NovelLengthType: {
    1: '超长篇', 2: '长篇', 3: '中篇', 4: '短文', 5: '其他待定'
  },
  TargetAudience: {
    1: '男性读者', 2: '女性读者', 3: '儿童读者', 4: '全体读者'
  },
  NovelChapterStatus: {
    0: '起草', 1: '构思', 2: '草稿', 3: '正文', 7: '修订版', 10: '已确认', 44: '已废弃'
  },
  CharacterRoleAttribute: {
    1: '主角', 2: '女主角', 3: '男主角', 4: '反派', 5: '配角', 6: '路人'
  },
  CharacterGender: {
    1: '男性', 2: '女性', 3: '中性'
  },
  CharacterType: {
    1: '人类', 2: '非人类'
  }
}

export const api = {
  listLlmConfigs: () => cachedInvoke('list_llm_configs', {}, 5000),
  getLlmConfig: (id) => cachedInvoke('get_llm_config', { id }, 5000),
  getDefaultLlmConfig: () => cachedInvoke('get_default_llm_config', {}, 5000),
  createNovel: (title) => invokeCommand('create_novel', { title }),
  listNovels: (page = 0, pageSize = 12) => cachedInvoke('list_novels', { page, pageSize }, 5000),
  countNovels: () => cachedInvoke('count_novels', {}, 5000),
  getNovel: (id) => cachedInvoke('get_novel', { id }, 5000),
  getNovelSettings: (novelId) => cachedInvoke('get_novel_settings', { novelId }, 5000),
  updateNovel: (payload) => invokeCommand('update_novel', {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    originalDescription: payload.originalDescription ?? payload.original_description,
    image: payload.image,
    style: payload.style,
    targetAudience: payload.targetAudience ?? payload.target_audience,
    lengthType: payload.lengthType ?? payload.length_type,
    estimatedChapterCount: payload.estimatedChapterCount ?? payload.estimated_chapter_count,
    estimatedTotalWordCount: payload.estimatedTotalWordCount ?? payload.estimated_total_word_count,
    estimatedWordsPerChapter: payload.estimatedWordsPerChapter ?? payload.estimated_words_per_chapter,
    status: payload.status,
  }).then(result => {
    invalidate('list_novels', 'count_novels', 'get_novel', 'get_novel_settings')
    return result
  }),
  deleteNovel: (id) => invokeCommand('delete_novel', { id }).then(result => {
    invalidate('list_novels', 'count_novels', 'get_novel', 'get_novel_settings')
    return result
  }),
  saveNovelSettings: (novelId, settings) => invokeCommand('save_novel_settings', { novelId, settings }).then(result => {
    invalidate('get_novel_settings', 'get_novel')
    return result
  }),
  aiGenerateNovelInfo: (requirement) => invokeCommand('ai_generate_novel_info', { requirement }),

  createChapter: (novelId, chapterName) => invokeCommand('create_chapter', { novelId, chapterName }).then(result => {
    invalidate('list_chapters', 'get_next_chapter_number')
    return result
  }),
  listChapters: (novelId, page = 0, pageSize = 20) =>
    cachedInvoke('list_chapters', { novelId, page, pageSize }, 5000),
  getChapter: (id) => cachedInvoke('get_chapter', { id }, 5000),
  getNextChapterNumber: (novelId) => cachedInvoke('get_next_chapter_number', { novelId }, 5000),
  saveChapter: (id, chapterNumber, chapterName, content, status) =>
    invokeCommand('save_chapter', { id, chapterNumber, chapterName, content, status }).then(result => {
      invalidate('list_chapters', 'get_chapter', 'get_next_chapter_number')
      return result
    }),
  deleteChapter: (id) => invokeCommand('delete_chapter', { id }).then(result => {
    invalidate('list_chapters', 'get_chapter', 'get_next_chapter_number')
    return result
  }),
  aiGenerateChapterStream: (payload) => invokeCommand('ai_generate_chapter_stream', payload),

  createCharacter: (novelId, name) => invokeCommand('create_character', { novelId, name }).then(result => {
    invalidate('list_characters')
    return result
  }),
  listCharacters: (novelId, page = 0, pageSize = 20) =>
    cachedInvoke('list_characters', { novelId, page, pageSize }, 5000),
  getCharacter: (id) => cachedInvoke('get_character', { id }, 5000),
  saveCharacter: (id, name, nickname, age, personality, roleAttribute, gender, characterType, sortOrder) =>
    invokeCommand('save_character', {
      id,
      name,
      nickname,
      age,
      personality,
      roleAttribute,
      gender,
      characterType,
      sortOrder,
    }).then(result => {
      invalidate('list_characters', 'get_character')
      return result
    }),
  deleteCharacter: (id) => invokeCommand('delete_character', { id }).then(result => {
    invalidate('list_characters', 'get_character')
    return result
  }),
  aiGenerateCharacter: (payload) => invokeCommand('ai_generate_character', payload),

  createTimeline: (novelId, title) => invokeCommand('create_timeline', { novelId, title }).then(result => {
    invalidate('list_timelines', 'list_timelines_paged', 'get_timeline')
    return result
  }),
  listTimelines: (novelId) => cachedInvoke('list_timelines', { novelId }, 5000),
  listTimelinesPaged: (novelId, page = 0, pageSize = 20) =>
    cachedInvoke('list_timelines_paged', { novelId, page, pageSize }, 5000),
  getTimeline: (id) => cachedInvoke('get_timeline', { id }, 5000),
  updateTimeline: (id, title, content, startChapterNumber, endChapterNumber) =>
    invokeCommand('update_timeline', { id, title, content, startChapterNumber, endChapterNumber }).then(result => {
      invalidate('list_timelines', 'list_timelines_paged', 'get_timeline')
      return result
    }),
  aiGenerateTimeline: (payload) => invokeCommand('ai_generate_timeline', payload),
  deleteTimeline: (id) => invokeCommand('delete_timeline', { id }).then(result => {
    invalidate('list_timelines', 'list_timelines_paged', 'get_timeline')
    return result
  }),
  getChapterMetaProperties: () => cachedInvoke('get_chapter_meta_properties', {}, 60000),

  createMeta: (novelId, propertyName, propertyValue) =>
    invokeCommand('create_meta', { novelId, propertyName, propertyValue }).then(result => {
      invalidate('list_meta', 'list_meta_paged', 'get_meta', 'get_meta_by_name')
      return result
    }),
  listMeta: (novelId) => cachedInvoke('list_meta', { novelId }, 5000),
  listMetaPaged: (novelId, page = 0, pageSize = 20) =>
    cachedInvoke('list_meta_paged', { novelId, page, pageSize }, 5000),
  getMeta: (id) => cachedInvoke('get_meta', { id }, 5000),
  getMetaByName: (novelId, propertyName) =>
    cachedInvoke('get_meta_by_name', { novelId, propertyName }, 5000),
  updateMeta: (id, propertyValue) => invokeCommand('update_meta', { id, propertyValue }).then(result => {
    invalidate('list_meta', 'list_meta_paged', 'get_meta', 'get_meta_by_name')
    return result
  }),
  aiGenerateMetaStream: (payload) => invokeCommand('ai_generate_meta_stream', payload),
  upsertMeta: (novelId, propertyName, propertyValue) =>
    invokeCommand('upsert_meta', { novelId, propertyName, propertyValue }).then(result => {
      invalidate('list_meta', 'list_meta_paged', 'get_meta', 'get_meta_by_name')
      return result
    }),
  deleteMeta: (id) => invokeCommand('delete_meta', { id }).then(result => {
    invalidate('list_meta', 'list_meta_paged', 'get_meta', 'get_meta_by_name')
    return result
  }),
  getNovelMetaProperties: () => cachedInvoke('get_novel_meta_properties', {}, 60000),

  listAgentDefinitions: () => cachedInvoke('list_agent_definitions', {}, 5000),
  getAgentDefinition: (agentCode) => cachedInvoke('get_agent_definition', { agentCode }, 5000),
  saveAgentRuntimeConfig: (payload) => invokeCommand('save_agent_runtime_config', {
    req: {
      agent_code: payload.agentCode,
      llm_config_id: payload.llmConfigId ?? null,
      extra_config: payload.extraConfig ?? null,
    }
  }).then(result => {
    invalidate('list_agent_definitions', 'get_agent_definition')
    return result
  }),
  resetAgentRuntimeConfig: (agentCode) => invokeCommand('reset_agent_runtime_config', { agentCode }).then(result => {
    invalidate('list_agent_definitions', 'get_agent_definition')
    return result
  }),
}
