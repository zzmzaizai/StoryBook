import { api, ENUMS } from '../api/tauri.js'
import { store } from '../state/store.js'
import { icon } from '../lib/icons.js'
import { createMarkdownEditor, destroyEditor } from '../lib/markdown-editor.js'
import { confirm } from '../lib/modal.js'
import { toastSuccess, toastError } from '../lib/toast.js'
import { createPagedList } from '../lib/virtual-list.js'
import { listen } from '@tauri-apps/api/event'
import { createSimpleTabs } from '../lib/tabs.js'
import { createNovelPageShell, loadCurrentNovelInfo, renderNovelSelectionState } from './novel-page.js'
import { getChapterPipelineStatus, getChapterPipelineStatusLabel } from './chapters/chapter-pipeline-data.js'
import { buildChapterProcessModel } from './chapters/chapter-process-data.js'
import { renderChapterProcessView } from './chapters/chapter-process-view.js'
import '../style/editor.css'
import '../style/tabs.css'
import '../style/virtual-list.css'

let searchKeyword = ''
let chapterPipelineFilter = 'all'
let selectedChapterId = null
let isCreating = false
let editorInstance = null
let chapterListComponent = null
let chapterAiUnlisteners = []
let activeChapterAiRequestId = null
let chapterDetailTab = 'editor'
let chapterDetailTabsComponent = null

const CHAPTER_AI_MODES = [
  { value: 'create', label: '新写本章' },
  { value: 'rewrite', label: '改写当前内容' },
  { value: 'expand', label: '扩写当前内容' },
  { value: 'continue', label: '续写当前内容' },
  { value: 'polish', label: '润色当前内容' },
]

function getChapterAiConfirmText(mode) {
  switch (mode) {
    case 'rewrite': return '重写内容'
    case 'expand': return '扩写内容'
    case 'continue': return '续写内容'
    case 'polish': return '润色内容'
    default: return '生成'
  }
}

export async function render() {
  await ensureChapterAiListeners()
  const novelInfo = await loadCurrentNovelInfo()

  if (!novelInfo) {
    const el = document.createElement('div')
    el.className = 'page'
    return renderNovelSelectionState(el, {
      title: '章节',
      subtitle: '编辑小说章节与正文内容',
      iconName: 'chapters',
    })
  }

  const { el, content } = createNovelPageShell('章节', `正在管理"${novelInfo.title}"小说章节内容`)
  content.innerHTML = `
    <div class="chapters-layout">
      <div class="card chapter-list-card">
        <div class="chapter-list-header">
          <h3 class="card-title">${icon('chapters', 16)} 章节列表</h3>
          <span class="chapter-count" id="chapter-count">加载中...</span>
        </div>

        <div class="chapter-toolbar">
          <button id="create-chapter-btn" class="btn btn-primary btn-sm">${icon('plus', 16)}</button>
          <div class="search-box search-box-sm">
            <span class="search-icon">${icon('search', 16)}</span>
            <input id="search-chapter" class="search-input" placeholder="搜索章节..." value="${searchKeyword}" />
          </div>
        </div>

        <div class="chapter-pipeline-filters">
          ${renderChapterPipelineFilters()}
        </div>

        <div id="chapter-list-mount" class="chapter-list-mount"></div>
      </div>

      <div class="card chapter-editor-card">
        <div id="chapter-detail-tabs-mount"></div>
        <div id="chapter-editor"></div>
      </div>
    </div>
  `

  renderChapterDetailTabs(el)

  const listMount = content.querySelector('#chapter-list-mount')
  chapterListComponent = createPagedList({
    containerId: 'chapter-list',
    pageSize: 20,
    loadMore: async (page, pageSize) => {
      const result = await api.listChapters(store.currentNovelId, 0, 100)
      const allItems = Array.isArray(result.items) ? result.items : []
      const filteredItems = allItems.filter(item => matchesChapterFilters(item))
      const start = page * pageSize
      const pageItems = filteredItems.slice(start, start + pageSize)
      // 更新总数显示
      const countEl = el.querySelector('#chapter-count')
      if (countEl) {
        countEl.textContent = `共 ${filteredItems.length} 章`
      }
      return {
        items: pageItems,
        hasMore: start + pageSize < filteredItems.length
      }
    },
    renderItem: (item) => {
      const div = document.createElement('div')
      div.className = `chapter-list-item ${selectedChapterId === item.id ? 'active' : ''}`
      div.dataset.id = item.id
      div.innerHTML = `
        <div class="chapter-item-number-wrap">
          <div class="chapter-item-number">${item.chapter_number}</div>
          <div class="chapter-item-number-label">章节</div>
          ${item.version > 1 ? `<div class="chapter-item-version">v${item.version}</div>` : ''}
        </div>
        <div class="chapter-item-body">
          <div class="chapter-item-header">
            <div class="chapter-item-title-wrap">
              <div class="chapter-item-title">${item.chapter_name || '未命名章节'}</div>
              <span class="chapter-process-state-dot chapter-process-state-dot--${getChapterPipelineStatus(item)}" title="${getChapterPipelineStatusLabel(item)}"></span>
            </div>
          </div>
          <div class="chapter-item-meta">
            <div class="chapter-item-meta-main">
              <span class="badge badge-sm ${getStatusBadgeClass(item.status)}">${ENUMS.NovelChapterStatus[item.status] || '起草'}</span>
              <span class="chapter-item-words">${formatWordCount(item.word_count)}</span>
              <span class="chapter-process-state-label">${getChapterPipelineStatusLabel(item)}</span>
            </div>
            <button class="list-item-delete-btn" data-action="delete" data-id="${item.id}" title="删除">
              ${icon('delete', 14)}
            </button>
          </div>
        </div>
      `
      
      const deleteBtn = div.querySelector('[data-action="delete"]')
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation()
          await handleDeleteChapter(item.id, el)
        })
      }
      
      return div
    },
    onItemClick: (item, index, itemEl) => {
      selectedChapterId = item.id
      isCreating = false

      const listContainer = itemEl.closest('.paged-list-content')
      if (listContainer) {
        listContainer.querySelectorAll('.chapter-list-item').forEach(i => i.classList.remove('active'))
        itemEl.querySelector('.chapter-list-item')?.classList.add('active')
      }

      destroyCurrentEditor()
      renderChapterDetailTabs(el)
      renderChapterEditor(el).catch((error) => {
        console.error('切换章节失败:', error)
      })
    },
    emptyText: '暂无章节'
  })
  listMount.appendChild(chapterListComponent.element)

  content.querySelector('#create-chapter-btn')?.addEventListener('click', () => {
    destroyCurrentEditor()
    isCreating = true
    selectedChapterId = null
    chapterDetailTab = 'editor'
    renderChapterDetailTabs(el)
    renderChapterEditor(el).catch((error) => {
      console.error('渲染章节编辑器失败:', error)
    })
  })

  content.querySelector('#search-chapter')?.addEventListener('input', (e) => {
    searchKeyword = e.target.value
    chapterListComponent.refresh()
  })

  content.querySelectorAll('[data-pipeline-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      chapterPipelineFilter = button.dataset.pipelineFilter || 'all'
      chapterListComponent.refresh()
      syncChapterPipelineFilterButtons(content)
    })
  })

  setTimeout(async () => {
    if (!selectedChapterId && !isCreating) {
      isCreating = true
      renderChapterEditor(el).catch((error) => {
        console.error('初始化章节面板失败:', error)
      })
    }
  }, 100)

  return el
}

function destroyCurrentEditor() {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
}

async function renderChapterEditor(root) {
  const editorEl = root.querySelector('#chapter-editor')

  if (chapterDetailTab === 'process') {
    const chapter = selectedChapterId ? await api.getChapter(selectedChapterId) : null
    editorEl.innerHTML = renderChapterProcessView(buildChapterProcessModel(chapter))
    bindChapterProcessActions(editorEl)
    return
  }

  if (isCreating) {
    const nextChapter = await getNextChapterNumber()

    editorEl.innerHTML = `
      <div class="chapter-editor-header">
        <h3 class="card-title">创建章节</h3>
        <div class="chapter-editor-actions">
          <button id="ai-generate-chapter-btn" class="btn btn-secondary">${icon('sparkles', 16)}<span>AI生成</span></button>
          <button id="save-chapter-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
        </div>
      </div>

      <div class="chapter-form-grid mb-lg">
        <div class="form-group chapter-form-field chapter-form-field--name">
          <label class="form-label">章节名称</label>
          <input id="chapter-name" class="form-input" placeholder="输入章节名称" />
        </div>
        <div class="form-group chapter-form-field chapter-form-field--number">
          <label class="form-label">章节序号</label>
          <input id="chapter-number" class="form-input" type="number" value="${nextChapter}" />
        </div>
        <div class="form-group chapter-form-field chapter-form-field--status">
          <label class="form-label">章节状态</label>
          <select id="chapter-status" class="form-input">
            ${Object.entries(ENUMS.NovelChapterStatus).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">章节内容</label>
        <div id="md-editor-container" class="markdown-editor-container" style="height: 400px;"></div>
      </div>
    `

    setTimeout(() => {
      const container = editorEl.querySelector('#md-editor-container')
      if (container) {
        editorInstance = createMarkdownEditor(container, {
          placeholder: '开始写作...',
          height: 400,
          minHeight: 300,
          toolbar: [
            'headings', 'bold', 'italic', 'strike', '|',
            'list', 'ordered-list', 'check', '|',
            'quote', 'code', 'inline-code', '|',
            'table', 'line', '|',
            'undo', 'redo', '|',
            'edit-mode', 'preview',
          ],
        })
      }
    }, 100)

    editorEl.querySelector('#save-chapter-btn')?.addEventListener('click', async () => {
      const chapterName = editorEl.querySelector('#chapter-name').value.trim()
      if (!chapterName) {
        toastError('请输入章节名称')
        return
      }

      try {
        const newChapter = await api.createChapter(store.currentNovelId, chapterName)
        const content = editorInstance ? editorInstance.getValue() : ''
        const chapterNumber = parseInt(editorEl.querySelector('#chapter-number').value) || nextChapter
        const status = parseInt(editorEl.querySelector('#chapter-status').value)

        await api.saveChapter(newChapter.id, chapterNumber, chapterName, content, status)

        isCreating = false
        selectedChapterId = newChapter.id
        store.currentChapterId = newChapter.id
        store.currentChapterDetailTab = 'editor'
        destroyCurrentEditor()
        chapterListComponent.refresh()
        renderChapterDetailTabs(root)
        renderChapterEditor(root)
        toastSuccess('章节创建成功！')
      } catch (e) {
        console.error('创建章节失败:', e)
        toastError('创建失败: ' + e)
      }
    })

    editorEl.querySelector('#ai-generate-chapter-btn')?.addEventListener('click', () => {
      openChapterAiModal(editorEl, { chapterId: null, chapterNumber: nextChapter, status: 0 })
    })
    return
  }

  const chapter = selectedChapterId ? await api.getChapter(selectedChapterId) : null

  if (!chapter) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('chapters', 20)}</div>
        <div class="empty-state-title">选择章节</div>
        <div class="empty-state-desc">从左侧列表选择章节进行编辑</div>
      </div>
    `
    return
  }

  const statusOptions = Object.entries(ENUMS.NovelChapterStatus)
    .map(([k, v]) => `<option value="${k}" ${chapter.status == k ? 'selected' : ''}>${v}</option>`).join('')

  editorEl.innerHTML = `
    <div class="chapter-editor-header">
      <div class="flex items-center gap-md">
        <h3 class="card-title">第 ${chapter.chapter_number} 章</h3>
        <div class="chapter-version-badge">v${chapter.version}</div>
      </div>
      <div class="chapter-editor-actions">
        <button id="ai-generate-chapter-btn" class="btn btn-secondary">${icon('sparkles', 16)}<span>AI生成</span></button>
        <button id="save-chapter-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
      </div>
    </div>

    <div class="chapter-stats-bar">
      <div class="chapter-stat">
        <span class="chapter-stat-label">字数</span>
        <span class="chapter-stat-value" id="word-count-display">${formatWordCount(chapter.word_count)}</span>
      </div>
      <div class="chapter-stat">
        <span class="chapter-stat-label">状态</span>
        <span class="badge ${getStatusBadgeClass(chapter.status)}">${ENUMS.NovelChapterStatus[chapter.status] || '起草'}</span>
      </div>
      <div class="chapter-stat">
        <span class="chapter-stat-label">版本</span>
        <span class="chapter-stat-value">v${chapter.version}</span>
      </div>
    </div>

    <div class="chapter-form-grid mb-lg">
      <div class="form-group chapter-form-field chapter-form-field--name">
        <label class="form-label">章节名称</label>
        <input id="chapter-name" class="form-input" value="${chapter.chapter_name || ''}" />
      </div>
      <div class="form-group chapter-form-field chapter-form-field--number">
        <label class="form-label">章节序号</label>
        <input id="chapter-number" class="form-input" type="number" value="${chapter.chapter_number}" />
      </div>
      <div class="form-group chapter-form-field chapter-form-field--status">
        <label class="form-label">状态</label>
        <select id="chapter-status" class="form-input">${statusOptions}</select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">章节内容</label>
      <div id="md-editor-container" class="markdown-editor-container" style="height: 450px;"></div>
    </div>
  `

  setTimeout(() => {
    const container = editorEl.querySelector('#md-editor-container')
    if (container) {
      editorInstance = createMarkdownEditor(container, {
        placeholder: '开始写作...',
        height: 450,
        minHeight: 300,
        value: chapter.content || '',
        toolbar: [
          'headings', 'bold', 'italic', 'strike', '|',
          'list', 'ordered-list', 'check', '|',
          'quote', 'code', 'inline-code', '|',
          'table', 'line', '|',
          'undo', 'redo', '|',
          'edit-mode', 'preview', 'fullscreen',
        ],
        onChange: (value) => {
          const wordCount = value.length
          const display = editorEl.querySelector('#word-count-display')
          if (display) {
            display.textContent = formatWordCount(wordCount)
          }
        },
      })
    }
  }, 100)

  editorEl.querySelector('#save-chapter-btn')?.addEventListener('click', async () => {
    try {
      const chapterName = editorEl.querySelector('#chapter-name').value.trim()
      const chapterNumber = parseInt(editorEl.querySelector('#chapter-number').value || chapter.chapter_number)
      const content = editorInstance ? editorInstance.getValue() : ''
      const status = parseInt(editorEl.querySelector('#chapter-status').value)

      await api.saveChapter(chapter.id, chapterNumber, chapterName, content, status)

      toastSuccess('保存成功！')
      chapterListComponent.refresh()
      store.currentChapterId = chapter.id
    } catch (e) {
      console.error('保存章节失败:', e)
      toastError('保存失败: ' + e)
    }
  })

  editorEl.querySelector('#ai-generate-chapter-btn')?.addEventListener('click', () => {
    openChapterAiModal(editorEl, {
      chapterId: chapter.id,
      chapterNumber: chapter.chapter_number,
      status: chapter.status,
    })
  })
}

async function openChapterAiModal(editorEl, chapterInfo) {
  const { openAiGenerateModal } = await import('../components/ai-generate-modal.js')
  openAiGenerateModal({
    title: 'AI生成章节',
    currentContent: editorInstance ? editorInstance.getValue() : '',
    currentContextTitle: `你正在处理第 ${chapterInfo.chapterNumber || 1} 章。补充要求是可选项。`,
    currentContextDesc: '你可以生成、改写、扩写、续写或润色当前章节内容。',
    modeLabel: '生成模式',
    modes: CHAPTER_AI_MODES,
    defaultMode: 'create',
    requirementPlaceholder: '例如：强化冲突推进、让结尾钩子更强、突出人物压迫感',
    getConfirmText: getChapterAiConfirmText,
    onSubmit: async ({ mode, requirement }) => {
      const chapterNumber = parseInt(editorEl.querySelector('#chapter-number')?.value || `${chapterInfo.chapterNumber || 1}`, 10) || (chapterInfo.chapterNumber || 1)
      const currentChapterName = editorEl.querySelector('#chapter-name')?.value?.trim() || ''
      const currentStatus = parseInt(editorEl.querySelector('#chapter-status')?.value || `${chapterInfo.status || 0}`, 10) || 0
      const currentContent = editorInstance ? editorInstance.getValue() : ''
      const requestId = `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

      activeChapterAiRequestId = requestId
      editorInstance?.setValue('')

      try {
        await api.aiGenerateChapterStream({
          requestId,
          novelId: store.currentNovelId,
          chapterId: chapterInfo.chapterId,
          currentChapterNumber: chapterNumber,
          currentChapterName,
          currentStatus,
          currentContent,
          mode,
          requirement,
        })
      } catch (err) {
        activeChapterAiRequestId = null
        editorInstance?.setValue(currentContent)
        toastError('AI生成失败: ' + err)
      }
    },
  })
}

async function ensureChapterAiListeners() {
  if (chapterAiUnlisteners.length > 0) return

  const chunkUnlisten = await listen('chapter-ai-stream-chunk', (event) => {
    const payload = event.payload
    if (!editorInstance || !payload?.delta || payload.request_id !== activeChapterAiRequestId) return
    editorInstance.setValueWithAiFollow((editorInstance.getValue() || '') + payload.delta)
  })

  const doneUnlisten = await listen('chapter-ai-stream-done', (event) => {
    const payload = event.payload
    if (!editorInstance || !payload || payload.request_id !== activeChapterAiRequestId) return
    editorInstance.setValueWithAiFollow(payload.content || '')
    activeChapterAiRequestId = null
    toastSuccess('AI已生成章节内容，请检查后点击保存')
  })

  const errorUnlisten = await listen('chapter-ai-stream-error', (event) => {
    const payload = event.payload
    if (payload?.request_id !== activeChapterAiRequestId) return
    activeChapterAiRequestId = null
    toastError('AI生成失败: ' + (payload?.error || '未知错误'))
  })

  chapterAiUnlisteners = [chunkUnlisten, doneUnlisten, errorUnlisten]
}

async function handleDeleteChapter(id, root) {
  const result = await confirm('确定删除此章节？', '删除确认')
  if (result) {
    try {
      await api.deleteChapter(id)

      if (selectedChapterId === id) {
        selectedChapterId = null
        store.currentChapterId = null
        destroyCurrentEditor()
        renderChapterEditor(root)
      }

      chapterListComponent.refresh()
      toastSuccess('删除成功！')
    } catch (e) {
      console.error('删除章节失败:', e)
      toastError('删除失败: ' + e)
    }
  }
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
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`
  }
  return `${count}字`
}

function matchesChapterFilters(chapter) {
  const normalizedKeyword = searchKeyword.trim().toLowerCase()
  const title = String(chapter.chapter_name || '').toLowerCase()
  const status = getChapterPipelineStatus(chapter)
  const matchesKeyword = !normalizedKeyword || title.includes(normalizedKeyword) || String(chapter.chapter_number || '').includes(normalizedKeyword)
  const matchesStatus = chapterPipelineFilter === 'all' || status === chapterPipelineFilter
  return matchesKeyword && matchesStatus
}

function renderChapterPipelineFilters() {
  const filters = [
    { key: 'all', label: '全部' },
    { key: 'running', label: '进行中' },
    { key: 'review', label: '待确认' },
    { key: 'paused', label: '暂停' },
    { key: 'completed', label: '已完成' },
    { key: 'error', label: '异常' },
  ]
  return filters.map((filter) => `
    <button type="button" class="chapter-pipeline-filter-chip${chapterPipelineFilter === filter.key ? ' active' : ''}" data-pipeline-filter="${filter.key}">${filter.label}</button>
  `).join('')
}

function syncChapterPipelineFilterButtons(root) {
  root.querySelectorAll('[data-pipeline-filter]').forEach((button) => {
    button.classList.toggle('active', button.dataset.pipelineFilter === chapterPipelineFilter)
  })
}

export function cleanup() {
  destroyCurrentEditor()
  chapterAiUnlisteners.forEach((unlisten) => {
    try {
      unlisten()
    } catch (_) {}
  })
  chapterAiUnlisteners = []
  activeChapterAiRequestId = null
  if (chapterListComponent) {
    chapterListComponent.destroy()
    chapterListComponent = null
  }
  if (chapterDetailTabsComponent) {
    chapterDetailTabsComponent.destroy()
    chapterDetailTabsComponent = null
  }
  searchKeyword = ''
  chapterPipelineFilter = 'all'
  selectedChapterId = null
  isCreating = false
  chapterDetailTab = 'editor'
  store.currentChapterDetailTab = 'editor'
}

async function getNextChapterNumber() {
  return api.getNextChapterNumber(store.currentNovelId)
}

function bindChapterProcessActions(root) {
  root.querySelectorAll('[data-process-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.processAction === 'logs') return
      const actionLabel = button.textContent?.trim() || '当前操作'
      toastSuccess(`${actionLabel} 的真实执行控制后续再接入，当前先完成流程监控 UI。`)
    })
  })
}

function renderChapterDetailTabs(root) {
  const mount = root.querySelector('#chapter-detail-tabs-mount')
  if (!mount) return

  if (chapterDetailTabsComponent) {
    chapterDetailTabsComponent.destroy()
    chapterDetailTabsComponent = null
  }

  mount.innerHTML = ''

  if (isCreating || !selectedChapterId) {
    chapterDetailTab = 'editor'
    return
  }

  chapterDetailTabsComponent = createSimpleTabs({
    containerId: 'chapter-detail-tabs',
    tabs: [
      { key: 'editor', label: '编辑', icon: icon('edit', 16) },
      { key: 'process', label: '流水线', icon: icon('pipeline', 16) },
    ],
    activeKey: chapterDetailTab,
    onChange: (key) => {
      chapterDetailTab = key
      destroyCurrentEditor()
      renderChapterEditor(root).catch((error) => {
        console.error('渲染章节面板失败:', error)
      })
    },
  })

  mount.appendChild(chapterDetailTabsComponent.element)
}
