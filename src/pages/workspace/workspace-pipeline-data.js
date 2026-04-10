import { buildMetadataPipelineStage } from './workspace-pipeline-stage-meta.js'
import { buildRolesPipelineStage } from './workspace-pipeline-stage-roles.js'
import { buildTimelinePipelineStage } from './workspace-pipeline-stage-timeline.js'
import { buildChaptersPipelineStage } from './workspace-pipeline-stage-chapters.js'

export function buildPipelineViewModel(novelInfo, chapters = []) {
  const metadataStage = buildMetadataPipelineStage(novelInfo)
  const rolesStage = buildRolesPipelineStage(novelInfo, metadataStage)
  const timelineStage = buildTimelinePipelineStage(novelInfo, rolesStage)
  const chaptersStage = buildChaptersPipelineStage(chapters)
  const stages = [metadataStage, rolesStage, timelineStage, chaptersStage]
  const currentStage = stages.find((stage) => stage.status === 'running') || stages.find((stage) => stage.status === 'paused') || stages.find((stage) => stage.status === 'queued') || stages[0]
  const totalSteps = stages.reduce((sum, stage) => sum + stage.items.length, 0)
  const completedSteps = stages.reduce((sum, stage) => sum + stage.counts.completed, 0)
  const reviewCount = stages.reduce((sum, stage) => sum + stage.counts.review, 0)
  const errorCount = stages.reduce((sum, stage) => sum + stage.counts.error, 0)

  return {
    title: '小说流水线',
    subtitle: '统一监控元数据、角色、时间线与章节流水线，支持阶段切换、筛选与待确认视图。',
    status: errorCount > 0 ? 'paused' : completedSteps === totalSteps && totalSteps > 0 ? 'completed' : 'running',
    progressText: `${completedSteps} / ${totalSteps}`,
    progressPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    currentStage,
    metrics: [
      { label: '当前阶段', value: currentStage?.title || '未启动' },
      { label: '总进度', value: `${completedSteps} / ${totalSteps}` },
      { label: '待确认项', value: `${reviewCount}` },
      { label: '最近运行', value: errorCount > 0 ? '刚刚暂停' : '2 分钟前' },
    ],
    stages,
    actions: [
      { key: 'start', label: '启动流水线', icon: 'play' },
      { key: 'pause', label: '暂停', icon: 'pause' },
      { key: 'resume', label: '继续', icon: 'refresh-cw' },
      { key: 'logs', label: '查看日志', icon: 'list' },
    ],
  }
}
