import { api, ENUMS } from '../api/tauri.js'
import { store } from '../state/store.js'
import { navigate } from '../router.js'
import { ICONS } from '../lib/icons.js'
import { createMarkdownEditor, destroyEditor } from '../lib/markdown-editor.js'
import { createModal, confirm } from '../lib/modal.js'
import { toastSuccess, toastError } from '../lib/toast.js'
import '../style/editor.css'

let searchKeyword = ''
let selectedChapterId = null
let isCreating = false
let editorInstance = null
let chaptersList = []

export async function render() {
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
        <div class="empty-state-icon">${ICONS.chapters}</div>
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
          <h3 class="card-title">${ICONS.chapters} 章节列表</h3>
          <span class="chapter-count" id="chapter-count">共 0 章</span>
        </div>
        
        <div class="chapter-toolbar">
          <button id="create-chapter-btn" class="btn btn-primary btn-sm">${ICONS.plus}</button>
          <div class="search-box search-box-sm">
            <span class="search-icon">${ICONS.search}</span>
            <input id="search-chapter" class="search-input" placeholder="搜索章节..." value="${searchKeyword}" />
          </div>
        </div>
        
        <div id="chapter-list" class="chapter-list"></div>
      </div>
      
      <div class="card chapter-editor-card">
        <div id="chapter-editor"></div>
      </div>
    </div>
  `

  await loadChapters(el)

  el.querySelector('#create-chapter-btn')?.addEventListener('click', () => {
    destroyCurrentEditor()
    isCreating = true
    selectedChapterId = null
    renderChapterEditor(el)
  })

  el.querySelector('#search-chapter')?.addEventListener('input', (e) => {
    searchKeyword = e.target.value
    renderChapterList(el)
  })

  return el
}

function destroyCurrentEditor() {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
}

async function loadChapters(root) {
  const listEl = root.querySelector('#chapter-list')
  listEl.innerHTML = `
    <div class="text-center text-tertiary p-lg">
      <div class="spinner"></div>
      <p style="margin-top: var(--space-sm);">加载中...</p>
    </div>
  `

  try {
    chaptersList = await api.listChapters(store.currentNovelId, 0, 1000)
    renderChapterList(root)
  } catch (e) {
    console.error('加载章节列表失败:', e)
    listEl.innerHTML = `
      <div class="text-center text-tertiary p-lg">
        <p>加载失败: ${e}</p>
        <button class="btn btn-secondary btn-sm mt-md" id="retry-chapters">重试</button>
      </div>
    `
    root.querySelector('#retry-chapters')?.addEventListener('click', () => loadChapters(root))
  }
}

function renderChapterList(root) {
  let list = chaptersList
  
  if (searchKeyword) {
    list = list.filter(c => 
      c.chapter_name?.includes(searchKeyword) || 
      String(c.chapter_number).includes(searchKeyword)
    )
  }

  const listEl = root.querySelector('#chapter-list')
  const countEl = root.querySelector('#chapter-count')
  
  if (countEl) {
    countEl.textContent = `共 ${chaptersList.length} 章`
  }

  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="text-center text-tertiary p-lg">
        <p>${searchKeyword ? '未找到匹配的章节' : '暂无章节'}</p>
      </div>
    `
    return
  }

  listEl.innerHTML = list.map(item => `
    <div class="chapter-item ${selectedChapterId === item.id ? 'active' : ''}" data-id="${item.id}">
      <div class="chapter-item-number">${item.chapter_number}</div>
      <div class="chapter-item-content">
        <div class="chapter-item-title">${item.chapter_name || '未命名章节'}</div>
        <div class="chapter-item-meta">
          <span class="badge badge-sm ${getStatusBadgeClass(item.status)}">${ENUMS.NovelChapterStatus[item.status] || '起草'}</span>
          <span class="chapter-item-words">${formatWordCount(item.word_count)}</span>
          ${item.version > 1 ? `<span class="chapter-item-version">v${item.version}</span>` : ''}
        </div>
      </div>
      <button class="btn-icon btn-icon-danger chapter-delete-btn" data-action="delete" data-id="${item.id}">
        ${ICONS.delete}
      </button>
    </div>
  `).join('')

  listEl.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete"]')) {
        const id = Number(e.target.closest('[data-action="delete"]').dataset.id)
        handleDeleteChapter(id, root)
        return
      }
      
      selectedChapterId = Number(item.dataset.id)
      isCreating = false
      listEl.querySelectorAll('.chapter-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      destroyCurrentEditor()
      renderChapterEditor(root)
    })
  })

  if (!selectedChapterId && !isCreating && list.length > 0) {
    selectedChapterId = list[0].id
    renderChapterEditor(root)
  }
}

async function renderChapterEditor(root) {
  const editorEl = root.querySelector('#chapter-editor')
  
  if (isCreating) {
    const nextChapter = chaptersList.length > 0 
      ? Math.max(...chaptersList.map(c => c.chapter_number || 0)) + 1 
      : 1
      
    editorEl.innerHTML = `
      <div class="chapter-editor-header">
        <h3 class="card-title">创建章节</h3>
        <div class="chapter-editor-actions">
          <button id="save-chapter-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
        </div>
      </div>
      
      <div class="form-grid mb-lg">
        <div class="form-group">
          <label class="form-label">章节序号</label>
          <input id="chapter-number" class="form-input" type="number" value="${nextChapter}" />
        </div>
        <div class="form-group flex-2">
          <label class="form-label">章节名称</label>
          <input id="chapter-name" class="form-input" placeholder="输入章节名称" />
        </div>
        <div class="form-group">
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
        const status = parseInt(editorEl.querySelector('#chapter-status').value)
        
        if (content) {
          await api.saveChapter(newChapter.id, chapterName, content, status)
        }
        
        isCreating = false
        selectedChapterId = newChapter.id
        destroyCurrentEditor()
        await loadChapters(root)
        toastSuccess('章节创建成功！')
      } catch (e) {
        console.error('创建章节失败:', e)
        toastError('创建失败: ' + e)
      }
    })
    return
  }

  const chapter = chaptersList.find(c => c.id === selectedChapterId)
  
  if (!chapter) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.chapters}</div>
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
        <button id="save-chapter-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
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
    
    <div class="form-grid mb-lg">
      <div class="form-group">
        <label class="form-label">章节序号</label>
        <input id="chapter-number" class="form-input" type="number" value="${chapter.chapter_number}" />
      </div>
      <div class="form-group flex-2">
        <label class="form-label">章节名称</label>
        <input id="chapter-name" class="form-input" value="${chapter.chapter_name || ''}" />
      </div>
      <div class="form-group">
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
      const content = editorInstance ? editorInstance.getValue() : ''
      const status = parseInt(editorEl.querySelector('#chapter-status').value)
      
      await api.saveChapter(chapter.id, chapterName, content, status)
      
      const idx = chaptersList.findIndex(c => c.id === chapter.id)
      if (idx > -1) {
        chaptersList[idx].chapter_name = chapterName
        chaptersList[idx].content = content
        chaptersList[idx].status = status
        chaptersList[idx].word_count = content.length
      }
      
      toastSuccess('保存成功！')
      renderChapterList(root)
    } catch (e) {
      console.error('保存章节失败:', e)
      toastError('保存失败: ' + e)
    }
  })
}

async function handleDeleteChapter(id, root) {
  const result = await confirm('确定删除此章节？', '删除确认')
  if (result.result?.action === 'confirm') {
    try {
      await api.deleteChapter(id)
      
      const index = chaptersList.findIndex(c => c.id === id)
      if (index > -1) {
        chaptersList.splice(index, 1)
      }
      
      if (selectedChapterId === id) {
        selectedChapterId = null
        destroyCurrentEditor()
      }
      
      renderChapterList(root)
      renderChapterEditor(root)
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
  searchKeyword = ''
  selectedChapterId = null
  isCreating = false
  chaptersList = []
}
