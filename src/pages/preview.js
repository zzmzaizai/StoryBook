import { api, ENUMS } from '../api/tauri.js'
import { icon } from '../lib/icons.js'
import { createTabs } from '../lib/tabs.js'
import { toastInfo } from '../lib/toast.js'
import { getSetting, setSetting } from '../lib/store.js'
import { createNovelPageShell, loadCurrentNovelInfo, renderNovelSelectionState } from './novel-page.js'

const FONT_SCALE_STORE_KEY = 'preview.readingFontScale'

let activePreviewTab = 'stats'
let selectedReadingChapterId = null
let previewTabsComponent = null
let previewState = null
let selectedExportFormat = 'txt'
let isExportMenuOpen = false
let readingFontScale = 16
let readingFontScaleInitialized = false

const EXPORT_FORMATS = [
  { value: 'txt', label: 'TXT 纯文本', desc: '适合备份与快速分发' },
  { value: 'umd', label: 'UMD 通用稿', desc: '适合统一结构打包输出' },
  { value: 'epub', label: 'EPUB 阅读版', desc: '适合电子书阅读器' },
]

export async function render() {
  const novelInfo = await loadCurrentNovelInfo()

  if (!novelInfo) {
    const el = document.createElement('div')
    el.className = 'page'
    return renderNovelSelectionState(el, {
      title: '预览',
      subtitle: '从统计与阅读两个视角快速浏览当前小说',
      iconName: 'eye',
    })
  }

  if (!readingFontScaleInitialized) {
    readingFontScaleInitialized = true
    try {
      const persisted = await getSetting(FONT_SCALE_STORE_KEY, 16)
      readingFontScale = Math.max(14, Math.min(22, Number(persisted) || 16))
    } catch {
      readingFontScale = 16
    }
  }

  const chaptersResult = await api.listChapters(novelInfo.id, 0, 100)
  const chapters = Array.isArray(chaptersResult?.items) ? chaptersResult.items : []
  const chapterCount = chaptersResult?.total_count ?? chapters.length
  const totalWords = chapters.reduce((sum, chapter) => sum + Number(chapter.word_count || chapter.content?.length || 0), 0)
  const statusCounts = buildChapterStatusCounts(chapters)
  const selectedChapter = resolveSelectedChapter(chapters)

  previewState = {
    novelInfo: {
      ...novelInfo,
      total_word_count: novelInfo.total_word_count || totalWords,
    },
    chapters,
    chapterCount,
    totalWords,
    statusCounts,
  }

  const { el, content } = createNovelPageShell('预览', `正在预览"${novelInfo.title}"小说`)
  content.innerHTML = `
    <div class="preview-page-shell">
      <div id="preview-tabs-mount"></div>
      <div id="preview-tab-content" class="preview-tab-content"></div>
    </div>
  `

  const tabsMount = content.querySelector('#preview-tabs-mount')
  previewTabsComponent = createTabs({
    containerId: 'preview-tabs',
    tabs: [
      { key: 'stats', label: '统计', icon: icon('bar-chart', 16), color: '#8b5cf6' },
      { key: 'reading', label: '阅读', icon: icon('book', 16), color: '#3b82f6' },
    ],
    activeKey: activePreviewTab,
    onChange: (key) => {
      activePreviewTab = key
      renderPreviewTabContent(el)
    },
  })
  tabsMount.appendChild(previewTabsComponent.element)

  if (!selectedReadingChapterId && selectedChapter) {
    selectedReadingChapterId = String(selectedChapter.id)
  }

  renderPreviewTabContent(el)
  return el
}

function renderPreviewTabContent(root) {
  const content = root.querySelector('#preview-tab-content')
  if (!content || !previewState) return

  if (activePreviewTab === 'reading') {
    renderReadingTab(content)
    return
  }

  renderStatsTab(content)
}

function renderStatsTab(container) {
  const { novelInfo, chapters, chapterCount, totalWords, statusCounts } = previewState
  const estimatedWords = Number(novelInfo.estimated_total_word_count || 0)
  const wordsPerChapter = Number(novelInfo.estimated_words_per_chapter || 0)
  const completion = estimatedWords > 0
    ? Math.min(100, Math.round((totalWords / estimatedWords) * 100))
    : 0
  const averageWords = chapterCount > 0 ? Math.round(totalWords / chapterCount) : 0
  container.innerHTML = `
    <div class="preview-stats-layout">
      <section class="workspace-basic-hero preview-hero">
        <div class="workspace-basic-hero__glow"></div>
        <div class="workspace-basic-hero__content">
          <div class="workspace-basic-hero__eyebrow">Story Atelier Preview</div>
          <div class="preview-hero__headline">
            <div>
              <div class="workspace-basic-hero__title-row">
                <h2 class="workspace-basic-hero__title">${escapeHtml(novelInfo.title || '未命名小说')}</h2>
                <div class="workspace-basic-hero__chips">
                  <span class="workspace-basic-chip">${escapeHtml(getNovelStyleLabel(novelInfo.style))}</span>
                  <span class="workspace-basic-chip">${escapeHtml(getLengthLabel(novelInfo.length_type))}</span>
                  <span class="workspace-basic-chip">${escapeHtml(getAudienceLabel(novelInfo.target_audience))}</span>
                </div>
              </div>
              <p class="workspace-basic-hero__origin">${escapeHtml(novelInfo.description || novelInfo.original_description || '暂无作品描述')}</p>
            </div>
            <div class="preview-export-anchor">
              <button type="button" id="preview-export-trigger" class="preview-export-trigger${isExportMenuOpen ? ' active' : ''}">
                <span class="preview-export-trigger__icon">${icon('download', 16)}</span>
                <span class="preview-export-trigger__text">导出所需要的格式</span>
                <span class="preview-export-trigger__arrow">${icon('chevron-down', 16)}</span>
              </button>
              ${renderExportMenu()}
            </div>
          </div>
          <div class="workspace-basic-metrics preview-stats-metrics-row">
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">当前总字数</div>
              <div class="workspace-basic-metric__value">${formatNumber(totalWords)}</div>
            </div>
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">已写章节</div>
              <div class="workspace-basic-metric__value">${chapterCount}</div>
            </div>
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">平均章字数</div>
              <div class="workspace-basic-metric__value">${formatNumber(averageWords)}</div>
            </div>
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">完成进度</div>
              <div class="workspace-basic-metric__value">${estimatedWords > 0 ? `${completion}%` : '--'}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="preview-stats-grid">
        <section class="card workspace-basic-panel preview-panel">
          <div class="workspace-basic-panel__header workspace-basic-panel__header--compact">
            <div>
              <div class="workspace-basic-panel__eyebrow">Novel Blueprint</div>
              <h3 class="workspace-basic-panel__title">基础信息</h3>
            </div>
          </div>
          <div class="preview-info-list">
            <div class="preview-info-row"><span>作品标题</span><strong>${escapeHtml(novelInfo.title || '未命名小说')}</strong></div>
            <div class="preview-info-row"><span>创作状态</span><strong>${escapeHtml(ENUMS.NovelStatus[novelInfo.status] || '构思')}</strong></div>
            <div class="preview-info-row"><span>题材风格</span><strong>${escapeHtml(getNovelStyleLabel(novelInfo.style))}</strong></div>
            <div class="preview-info-row"><span>目标读者</span><strong>${escapeHtml(getAudienceLabel(novelInfo.target_audience))}</strong></div>
            <div class="preview-info-row"><span>篇幅规划</span><strong>${escapeHtml(getLengthLabel(novelInfo.length_type))}</strong></div>
            <div class="preview-info-row"><span>单章目标</span><strong>${wordsPerChapter ? `${formatNumber(wordsPerChapter)} / 章` : '未设定'}</strong></div>
          </div>
        </section>

        <section class="card workspace-basic-panel preview-panel">
          <div class="workspace-basic-panel__header workspace-basic-panel__header--compact">
            <div>
              <div class="workspace-basic-panel__eyebrow">Chapter Signals</div>
              <h3 class="workspace-basic-panel__title">章节状态</h3>
            </div>
          </div>
          <div class="preview-status-grid">
            ${renderStatusItem('正文', statusCounts.main)}
            ${renderStatusItem('草稿', statusCounts.draft)}
            ${renderStatusItem('修订版', statusCounts.revision)}
            ${renderStatusItem('已确认', statusCounts.confirmed)}
          </div>
          <div class="workspace-basic-progress-card preview-progress-card">
            <div class="workspace-basic-progress-card__header">
              <span>创作推进感知</span>
              <strong>${estimatedWords > 0 ? `${completion}%` : '未设定'}</strong>
            </div>
            <div class="workspace-basic-progress-bar">
              <span style="width: ${estimatedWords > 0 ? completion : 0}%"></span>
            </div>
            <p class="workspace-basic-progress-card__desc">${estimatedWords > 0 ? `当前已写 ${formatNumber(totalWords)} 字，目标约 ${formatNumber(estimatedWords)} 字。` : '建议先在工作台填写预估总字数，便于后续观察完成度。'}</p>
          </div>
        </section>

      </div>
    </div>
  `

  bindExportMenu(container)
}

function renderReadingTab(container) {
  const { novelInfo, chapters } = previewState
  const selectedChapter = resolveSelectedChapter(chapters)

  container.innerHTML = `
    <div class="preview-reading-layout">
      <aside class="card chapter-list-card preview-reading-sidebar-card">
        <div class="chapter-list-header preview-reading-sidebar__header">
          <h3 class="card-title">${icon('book', 16)} 阅读目录</h3>
          <span class="chapter-count">共 ${chapters.length} 章</span>
        </div>
        <div class="preview-reading-list chapter-list-mount">
          ${chapters.length > 0 ? chapters.map(chapter => renderReadingChapterItem(chapter, selectedChapter)).join('') : `
            <div class="empty-state preview-reading-empty">
              <div class="empty-state-icon">${icon('chapters', 20)}</div>
              <div class="empty-state-title">暂无章节</div>
              <div class="empty-state-desc">当前小说还没有可阅读的章节内容。</div>
            </div>
          `}
        </div>
      </aside>

      <section class="preview-reading-main" style="--preview-reading-font-size:${readingFontScale}px;">
        <div class="preview-reading-main__toolbar card preview-reading-toolbar-card">
          <div class="preview-reading-toolbar__info">
            ${selectedChapter ? `
              <div class="preview-reading-toolbar__title">第 ${selectedChapter.chapter_number || 1} 章 ${escapeHtml(selectedChapter.chapter_name || '未命名章节')}</div>
              <div class="preview-reading-toolbar__tags">
                <span>${formatWordCount(selectedChapter.word_count || 0)}</span>
                <span>${ENUMS.NovelChapterStatus[selectedChapter.status] || '起草'}</span>
                <span>v${selectedChapter.version || 1}</span>
              </div>
            ` : `
              <div class="preview-reading-toolbar__title">Reader Mode</div>
            `}
          </div>
          <div class="preview-reading-toolbar__controls">
            ${renderFontSizeControls()}
          </div>
        </div>

        <article class="card preview-reading-article">
          ${selectedChapter ? `
            <div class="preview-reading-article__body preview-reading-article__body--wide">
              ${renderChapterContent(selectedChapter.content)}
            </div>
          ` : `
            <div class="empty-state preview-reading-empty-main">
              <div class="empty-state-icon">${icon('eye', 20)}</div>
              <div class="empty-state-title">没有可阅读内容</div>
              <div class="empty-state-desc">请先到章节页创建至少一章内容。</div>
            </div>
          `}
        </article>
      </section>
    </div>
  `

  bindReadingTab(container)
}

function bindExportMenu(container) {
  const trigger = container.querySelector('#preview-export-trigger')

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation()
    isExportMenuOpen = !isExportMenuOpen
    renderStatsTab(container)
  })

  container.querySelectorAll('[data-export-format]').forEach(button => {
    button.addEventListener('click', () => {
      selectedExportFormat = button.dataset.exportFormat || 'txt'
      isExportMenuOpen = false
      const currentFormat = EXPORT_FORMATS.find(format => format.value === selectedExportFormat) || EXPORT_FORMATS[0]
      toastInfo(`当前项目暂未暴露 ${currentFormat.label} 的导出命令，你可以点这里直接导出。`)
      renderStatsTab(container)
    })
  })

  queueMicrotask(() => {
    const handleOutsideClick = (event) => {
      if (!container.contains(event.target)) {
        isExportMenuOpen = false
        document.removeEventListener('click', handleOutsideClick)
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener('click', handleOutsideClick, { once: true })
    }
  })
}

function bindReadingTab(container) {
  container.querySelectorAll('[data-chapter-id]').forEach(button => {
    button.addEventListener('click', () => {
      selectedReadingChapterId = button.dataset.chapterId || null
      renderReadingTab(container)
    })
  })

  container.querySelectorAll('[data-reading-segment]').forEach(button => {
    button.addEventListener('click', () => {
      renderReadingTab(container)
    })
  })

  container.querySelector('[data-font-step="decrease"]')?.addEventListener('click', () => {
    readingFontScale = Math.max(14, readingFontScale - 1)
    setSetting(FONT_SCALE_STORE_KEY, readingFontScale).catch(() => {})
    renderReadingTab(container)
  })

  container.querySelector('[data-font-step="increase"]')?.addEventListener('click', () => {
    readingFontScale = Math.min(22, readingFontScale + 1)
    setSetting(FONT_SCALE_STORE_KEY, readingFontScale).catch(() => {})
    renderReadingTab(container)
  })
}

function renderExportMenu() {
  if (!isExportMenuOpen) return ''

  return `
    <div class="preview-export-menu">
      ${EXPORT_FORMATS.map(format => `
        <button type="button" class="preview-export-menu__item" data-export-format="${format.value}">
          <div>
            <strong>${format.label}</strong>
            <span>点击这里导出 ${format.label}</span>
          </div>
          ${icon('download', 16)}
        </button>
      `).join('')}
    </div>
  `
}

function renderStatusItem(label, value) {
  return `
    <div class="preview-status-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `
}

function renderFontSizeControls() {
  return `
    <div class="preview-font-size-control">
      <button type="button" class="preview-font-size-control__btn" data-font-step="decrease" ${readingFontScale <= 14 ? 'disabled' : ''}>${icon('minus-circle', 16)}</button>
      <span class="preview-font-size-control__value">${readingFontScale}</span>
      <button type="button" class="preview-font-size-control__btn" data-font-step="increase" ${readingFontScale >= 22 ? 'disabled' : ''}>${icon('plus-circle', 16)}</button>
    </div>
  `
}

function renderReadingChapterItem(chapter, selectedChapter) {
  const isActive = String(chapter.id) === String(selectedChapter?.id)
  return `
    <button type="button" class="chapter-list-item preview-reading-list__item${isActive ? ' active' : ''}" data-chapter-id="${chapter.id}">
      <div class="chapter-item-number-wrap">
        <div class="chapter-item-number">${chapter.chapter_number || '--'}</div>
        <div class="chapter-item-number-label">章节</div>
        ${chapter.version > 1 ? `<div class="chapter-item-version">v${chapter.version}</div>` : ''}
      </div>
      <div class="chapter-item-body">
        <div class="chapter-item-header">
          <div class="chapter-item-title">${escapeHtml(chapter.chapter_name || '未命名章节')}</div>
        </div>
        <div class="chapter-item-meta">
          <div class="chapter-item-meta-main">
            <span class="badge badge-sm ${getStatusBadgeClass(chapter.status)}">${ENUMS.NovelChapterStatus[chapter.status] || '起草'}</span>
            <span class="chapter-item-words">${formatWordCount(chapter.word_count || 0)}</span>
          </div>
        </div>
      </div>
    </button>
  `
}

function renderChapterContent(content) {
  const normalized = String(content || '').trim()
  if (!normalized) {
    return '<p class="preview-reading-article__placeholder">这一章还没有正文内容。</p>'
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(item => item.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  return paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')
}

function resolveSelectedChapter(chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) return null
  return chapters.find(chapter => String(chapter.id) === String(selectedReadingChapterId)) || chapters[0]
}

function buildChapterStatusCounts(chapters) {
  return {
    main: chapters.filter(chapter => chapter.status === 3).length,
    draft: chapters.filter(chapter => chapter.status === 0 || chapter.status === 1 || chapter.status === 2).length,
    revision: chapters.filter(chapter => chapter.status === 7).length,
    confirmed: chapters.filter(chapter => chapter.status === 10).length,
  }
}

function buildExcerpt(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  if (!text) return '暂无正文内容'
  return text.length > 36 ? `${text.slice(0, 36)}...` : text
}

function getNovelStyleLabel(style) {
  return ENUMS.NovelStyle[style] || '都市'
}

function getAudienceLabel(audience) {
  return ENUMS.TargetAudience[audience] || '全体读者'
}

function getLengthLabel(lengthType) {
  return ENUMS.NovelLengthType[lengthType] || '中篇'
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 0: return 'badge-secondary'
    case 1: return 'badge-warning'
    case 2: return 'badge-info'
    case 3: return 'badge-primary'
    case 7: return 'badge-success'
    case 10: return 'badge-success'
    case 44: return 'badge-error'
    default: return 'badge-secondary'
  }
}

function formatWordCount(count) {
  const numeric = Number(count || 0)
  if (numeric >= 10000) {
    return `${(numeric / 10000).toFixed(1)}万字`
  }
  return `${numeric}字`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function cleanup() {
  activePreviewTab = 'stats'
  selectedReadingChapterId = null
  selectedExportFormat = 'txt'
  isExportMenuOpen = false
  readingFontScale = 16
  readingFontScaleInitialized = false
  previewState = null
  if (previewTabsComponent) {
    previewTabsComponent.destroy()
    previewTabsComponent = null
  }
}
