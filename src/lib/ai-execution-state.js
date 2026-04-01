import { getAiPhaseLabel, humanizeAiToolArgs } from './ai-execution-labels.js'

export function applyAiPhaseUpdate(modal, activeRequestId, payload, status) {
  if (!modal || payload?.request_id !== activeRequestId) return

  modal.updateExecutionState((state) => {
    const phases = [...state.phases]
    const phaseName = payload?.phase || 'unknown'
    const existingIndex = phases.findIndex(item => item.name === phaseName)
    const nextPhase = existingIndex >= 0
      ? { ...phases[existingIndex] }
      : { name: phaseName, label: getAiPhaseLabel(phaseName), status: 'pending', message: '', events: [] }

    nextPhase.status = status
    nextPhase.message = payload?.message || nextPhase.message

    if (existingIndex >= 0) {
      phases[existingIndex] = nextPhase
    } else {
      phases.push(nextPhase)
    }

    return { ...state, phases }
  })
}

export function applyAiToolEvent(modal, activeRequestId, payload, isResult = false) {
  if (!modal || payload?.request_id !== activeRequestId) return

  modal.updateExecutionState((state) => {
    const phases = [...state.phases]
    const phaseName = payload?.phase || 'tool_reasoning'
    const phaseIndex = phases.findIndex(item => item.name === phaseName)
    const phase = phaseIndex >= 0
      ? { ...phases[phaseIndex] }
      : { name: phaseName, label: getAiPhaseLabel(phaseName), status: 'running', message: '', events: [] }

    const argsSummary = humanizeAiToolArgs(payload.tool_name, payload.args_summary)
    const events = [...(phase.events || [])]
    if (isResult) {
      const existingIndex = events.findIndex(item => item.toolName === payload.tool_name && item.argsSummary === argsSummary && item.status === 'running')
      const nextEvent = {
        toolName: payload.tool_name,
        argsSummary,
        resultSummary: payload.result_summary,
        durationMs: payload.duration_ms,
        status: payload.status || 'finished',
      }
      if (existingIndex >= 0) {
        events[existingIndex] = { ...events[existingIndex], ...nextEvent }
      } else {
        events.push(nextEvent)
      }
    } else {
      events.push({
        toolName: payload.tool_name,
        argsSummary,
        resultSummary: '',
        durationMs: null,
        status: 'running',
      })
    }

    phase.events = events
    phase.status = 'running'
    if (phaseIndex >= 0) {
      phases[phaseIndex] = phase
    } else {
      phases.push(phase)
    }

    return { ...state, phases }
  })
}
