import { api, ENUMS } from '../api/tauri.js'
import { store } from '../state/store.js'
import { navigate } from '../router.js'
import { icon } from '../lib/icons.js'
import { createMarkdownEditor, destroyEditor } from '../lib/markdown-editor.js'
import { confirm } from '../lib/modal.js'
import { toastSuccess, toastError } from '../lib/toast.js'
import { createPagedList } from '../lib/virtual-list.js'
import { openAiGenerateModal } from '../components/ai-generate-modal.js'
import { listen } from '@tauri-apps/api/event'
import '../style/editor.css'
import '../style/virtual-list.css'

let searchKeyword = ''
let selectedChapterId = null
let isCreating = false
let editorInstance = null
let chaptersList = []
let chapterListComponent = null
let chapterAiUnlisteners = []
let activeChapterAiRequestId = null

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
  const el = document.createElement('div')
  el.className = 'page'

  const novelId = store.currentNovelId

  if (!novelId) {
    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">章节管理</h1>
        <p class="page-subtitle">编辑小说章节</p>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">${icon('chapters', 20)}</div>
        <div class="empty-state-title">未选择小说</div>
        <div class="empty-state-desc">请先从小说列表选择一部小说</div>
        <button class="btn btn-primary mt-lg" id="go-novels">选择小说</button>
      </div>
    `
    el.querySelector('#go-novels')?.addEventListener('click', () => {
      navigate('/novels')
    })
    return el
  }

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">章节</h1>
      <p class="page-subtitle">正在管理"${store.currentNovelName || '未知'}"小说章节内容</p>
    </div>

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

        <div id="chapter-list-mount" class="chapter-list-mount"></div>
      </div>

      <div class="card chapter-editor-card">
        <div id="chapter-editor"></div>
      </div>
    </div>
  `

  // 创建分页列表
  const listMount = el.querySelector('#chapter-list-mount')
  chapterListComponent = createPagedList({
    containerId: 'chapter-list',
    pageSize: 20,
    loadMore: async (page, pageSize) => {
      const result = await api.listChapters(store.currentNovelId, page, pageSize)
      // 更新总数显示
      const countEl = el.querySelector('#chapter-count')
      if (countEl) {
        countEl.textContent = `共 ${result.total_count} 章`
      }
      return {
        items: result.items,
        hasMore: result.has_more
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
            <div class="chapter-item-title">${item.chapter_name || '未命名章节'}</div>
          </div>
          <div class="chapter-item-meta">
            <div class="chapter-item-meta-main">
              <span class="badge badge-sm ${getStatusBadgeClass(item.status)}">${ENUMS.NovelChapterStatus[item.status] || '起草'}</span>
              <span class="chapter-item-words">${formatWordCount(item.word_count)}</span>
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
          await handleDeleteChapter(item.id, document.querySelector('.page'))
        })
      }
      
      return div
    },
    onItemClick: (item, index, el) => {
      selectedChapterId = item.id
      isCreating = false

      const listContainer = el.closest('.paged-list-content')
      if (listContainer) {
        listContainer.querySelectorAll('.chapter-list-item').forEach(i => i.classList.remove('active'))
        el.querySelector('.chapter-list-item')?.classList.add('active')
      }

      destroyCurrentEditor()
      renderChapterEditor(document.querySelector('.page'))
    },
    emptyText: '暂无章节'
  })
  listMount.appendChild(chapterListComponent.element)

  el.querySelector('#create-chapter-btn')?.addEventListener('click', () => {
    destroyCurrentEditor()
    isCreating = true
    selectedChapterId = null
    renderChapterEditor(el)
  })

  el.querySelector('#search-chapter')?.addEventListener('input', (e) => {
    searchKeyword = e.target.value
    // 搜索功能需要重新加载并过滤
    chapterListComponent.refresh()
  })

  // 初始加载时如果有数据，选中第一个
  setTimeout(async () => {
    if (!selectedChapterId && !isCreating) {
      isCreating = true
      renderChapterEditor(el)
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

        isCreating = true
        selectedChapterId = null
        destroyCurrentEditor()
        chapterListComponent.refresh()
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

function openChapterAiModal(editorEl, chapterInfo) {
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
  searchKeyword = ''
  selectedChapterId = null
  isCreating = false
  chaptersList = []
}

async function getNextChapterNumber() {
  return api.getNextChapterNumber(store.currentNovelId)
}
