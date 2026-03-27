/**
 * 仪表盘页面
 */
import { api, ENUMS } from '../api/tauri.js'
import { store } from '../state/store.js'
import { navigate } from '../router.js'
import { icon } from '../lib/icons.js'
import { version as APP_VERSION } from '../../package.json'

export async function render() {
  const el = document.createElement('div')
  el.className = 'page dashboard-page'
  
  let novelStats = { total: 0, writing: 0, completed: 0, totalWords: 0 }
  let chapterStats = { total: 0 }
  let characterStats = { total: 0 }
  
  try {
    const novels = await api.listNovels(0, 1000)
    novelStats.total = novels?.total || novels?.data?.length || 0
    novelStats.totalWords = novels?.data?.reduce((sum, n) => sum + (n.total_word_count || 0), 0) || 0
    novelStats.writing = novels?.data?.filter(n => n.status === 1 || n.status === 2).length || 0
    novelStats.completed = novels?.data?.filter(n => n.status === 3).length || 0
    
    // 计算所有小说的章节和角色总数
    let totalChapters = 0
    let totalCharacters = 0
    
    if (novels?.data?.length > 0) {
      for (const novel of novels.data) {
        try {
          const chapters = await api.listChapters(novel.id, 0, 1)
          totalChapters += chapters?.total || 0
        } catch (e) {
          // 忽略单个小说的错误
        }
        
        try {
          const characters = await api.listCharacters(novel.id, 0, 1)
          totalCharacters += characters?.total || 0
        } catch (e) {
          // 忽略单个小说的错误
        }
      }
    }
    
    chapterStats.total = totalChapters
    characterStats.total = totalCharacters
  } catch (e) {
    console.error('Failed to load dashboard stats:', e)
  }

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">概览</h1>
      <p class="page-subtitle">欢迎回来，开始您的创作之旅</p>
    </div>
    
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-icon novels">${icon('novels', 20)}</div>
        <div class="stat-content">
          <div class="stat-value">${novelStats.total}</div>
          <div class="stat-label">小说项目</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon chapters">${icon('chapters', 20)}</div>
        <div class="stat-content">
          <div class="stat-value">${chapterStats.total}</div>
          <div class="stat-label">章节总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon characters">${icon('characters', 20)}</div>
        <div class="stat-content">
          <div class="stat-value">${characterStats.total}</div>
          <div class="stat-label">角色数量</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon words">${icon('file-text', 20)}</div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(novelStats.totalWords)}</div>
          <div class="stat-label">总字数</div>
        </div>
      </div>
    </div>
    
    <div class="dashboard-grid">
      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">快速开始</h2>
        </div>
        <div class="quick-actions">
          <div class="quick-action-card" data-action="novels">
            <div class="quick-action-icon">${icon('novels', 18)}</div>
            <div class="quick-action-content">
              <div class="quick-action-title">小说项目</div>
              <div class="quick-action-desc">管理您的小说项目，选择一个开始创作</div>
            </div>
          </div>
          <div class="quick-action-card" data-action="llm-config">
            <div class="quick-action-icon">${icon('settings', 18)}</div>
            <div class="quick-action-content">
              <div class="quick-action-title">LLM设置</div>
              <div class="quick-action-desc">配置AI模型参数，优化创作体验</div>
            </div>
          </div>
          <div class="quick-action-card" data-action="agent-config">
            <div class="quick-action-icon">${icon('ai', 18)}</div>
            <div class="quick-action-content">
              <div class="quick-action-title">代理配置</div>
              <div class="quick-action-desc">设置AI代理，增强创作能力</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">帮助与指南</h2>
        </div>
        <div class="help-cards">
          <div class="help-card">
            <div class="help-icon">${icon('file-text', 18)}</div>
            <div class="help-content">
              <div class="help-title">快速入门</div>
              <div class="help-desc">了解如何创建您的第一个小说项目</div>
            </div>
          </div>
          <div class="help-card">
            <div class="help-icon">${icon('sparkles', 18)}</div>
            <div class="help-content">
              <div class="help-title">AI辅助创作</div>
              <div class="help-desc">探索AI如何帮助您提升创作效率</div>
            </div>
          </div>
          <div class="help-card">
            <div class="help-icon">${icon('help-circle', 18)}</div>
            <div class="help-content">
              <div class="help-title">常见问题</div>
              <div class="help-desc">查看常见问题解答和使用技巧</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="dashboard-footer">
      <div class="app-info">
        <span class="app-version">StoryBook v${APP_VERSION}</span>
        <span class="app-divider">·</span>
        <span class="app-status">系统运行正常</span>
      </div>
    </div>
  `
  
  el.querySelectorAll('.quick-action-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action
      navigate('/' + action)
    })
  })
  
  return el
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}
