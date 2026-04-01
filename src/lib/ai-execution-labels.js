export function getAiPhaseLabel(phase) {
  switch (phase) {
    case 'preparing_context': return '准备内容'
    case 'tool_reasoning': return '读取设定并生成'
    case 'finalizing_output': return '整理结果'
    default: return phase || '执行中'
  }
}

export function humanizeAiToolArgs(toolName, argsSummary) {
  if (!argsSummary) return ''

  try {
    const parsed = JSON.parse(argsSummary)

    if (toolName === 'read_novel_meta' || toolName === 'read_meta_context' || toolName === 'read_character_meta') {
      const parts = []
      if (parsed.query) parts.push(`关键词 ${parsed.query}`)
      if (parsed.limit) parts.push(`${parsed.limit} 条内`)
      return parts.join('，') || '查设定'
    }

    if (toolName === 'read_previous_timelines') {
      const parts = []
      if (parsed.before_chapter) parts.push(`第 ${parsed.before_chapter} 章之前`)
      if (parsed.limit) parts.push(`${parsed.limit} 条内`)
      return parts.join('，') || '查前文'
    }

    if (toolName === 'read_character_context') {
      const parts = []
      if (parsed.query) parts.push(`关键词 ${parsed.query}`)
      if (parsed.limit) parts.push(`${parsed.limit} 条内`)
      return parts.join('，') || '查角色'
    }

    if (toolName === 'read_existing_characters') {
      const parts = []
      if (parsed.query) parts.push(`关键词 ${parsed.query}`)
      if (parsed.limit) parts.push(`${parsed.limit} 人内`)
      return parts.join('，') || '查已有角色'
    }
  } catch (_) {}

  return argsSummary
}

export function getAiToolTitle(toolName) {
  switch (toolName) {
    case 'read_novel_meta':
    case 'read_character_meta':
      return '读取小说设定'
    case 'read_previous_timelines':
      return '读取前文时间线'
    case 'read_meta_context':
      return '读取其他元数据'
    case 'read_character_context':
      return '读取角色信息'
    case 'read_existing_characters':
      return '读取已有角色'
    default:
      return toolName || '阶段事件'
  }
}

export function getAiToolDescription(toolName, argsSummary, resultSummary) {
  const args = argsSummary || ''
  const result = resultSummary || ''

  if (toolName === 'read_novel_meta' || toolName === 'read_meta_context' || toolName === 'read_character_meta') {
    const query = args ? `查设定：${args}` : '查设定'
    return result ? `${query}；${result}` : query
  }

  if (toolName === 'read_previous_timelines') {
    const query = args ? `查前文：${args}` : '查前文'
    return result ? `${query}；${result}` : query
  }

  if (toolName === 'read_character_context' || toolName === 'read_existing_characters') {
    const query = args ? `查角色：${args}` : '查角色'
    return result ? `${query}；${result}` : query
  }

  return result || args
}
