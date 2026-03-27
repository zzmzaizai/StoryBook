import { api, ENUMS } from '../api/tauri.js'
import { store } from '../state/store.js'
import { navigate } from '../router.js'
import { icon } from '../lib/icons.js'
import { renderSidebar } from '../components/sidebar.js'
import { showCreateNovelModal } from '../components/create-novel-modal.js'

let page = 0
const pageSize = 12
let totalCount = 0
let isLoading = false
let novelsList = []

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">小说项目</h1>
      <p class="page-subtitle">选择一个项目开始创作</p>
    </div>
    
    <div class="card" style="margin-bottom: var(--space-xl);">
      <div class="flex justify-between items-center gap-lg flex-wrap">
        <div class="flex gap-md items-center flex-wrap">
          <div class="search-box">
            <span class="search-icon">${icon('search', 16)}</span>
            <input id="search-title" class="search-input" placeholder="搜索小说标题..." />
          </div>
          <select id="filter-status" class="form-input" style="width: 120px;">
            <option value="">全部状态</option>
            ${Object.entries(ENUMS.NovelStatus).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select id="filter-style" class="form-input" style="width: 120px;">
            <option value="">全部风格</option>
            ${Object.entries(ENUMS.NovelStyle).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <button id="search-btn" class="btn btn-primary">${icon('search', 16)}<span>搜索</span></button>
        </div>
        <button id="create-novel-btn" class="btn btn-primary">${icon('plus', 16)}<span>新建小说</span></button>
      </div>
    </div>
    
    <div id="novel-grid" class="novel-grid"></div>
    
    <div id="pagination" class="flex justify-center gap-md mt-xl" style="display: none;">
      <button id="prev-page" class="btn btn-secondary" disabled>${icon('chevron-left', 16)}<span>上一页</span></button>
      <span id="page-info" class="flex items-center text-secondary">第 1 页</span>
      <button id="next-page" class="btn btn-secondary"><span>下一页</span>${icon('chevron-right', 16)}</button>
    </div>
  `

  await load(el)

  el.querySelector('#search-btn').addEventListener('click', async () => {
    page = 0
    await load(el)
  })

  el.querySelector('#search-title').addEventListener('keyup', async (e) => {
    if (e.key === 'Enter') {
      page = 0
      await load(el)
    }
  })

  el.querySelector('#create-novel-btn').addEventListener('click', () => {
    showCreateNovelModal({
      onConfirm: async (formData) => {
        try {
          const novel = await api.createNovel(formData.title)
          
          if (
            formData.description ||
            formData.original_description ||
            formData.style !== 1 ||
            formData.target_audience !== 4 ||
            formData.length_type !== 3 ||
            formData.estimated_chapter_count ||
            formData.estimated_total_word_count ||
            formData.estimated_words_per_chapter
          ) {
            await api.updateNovel({
              id: novel.id,
              title: formData.title,
              description: formData.description || null,
              original_description: formData.original_description || null,
              image: null,
              style: formData.style,
              target_audience: formData.target_audience,
              length_type: formData.length_type,
              estimated_chapter_count: formData.estimated_chapter_count,
              estimated_total_word_count: formData.estimated_total_word_count,
              estimated_words_per_chapter: formData.estimated_words_per_chapter,
              status: 1,
            })
          }
          
          await load(el)
        } catch (e) {
          console.error('创建小说失败:', e)
          alert('创建小说失败: ' + e)
        }
      }
    })
  })

  el.querySelector('#prev-page').addEventListener('click', async () => {
    if (page > 0 && !isLoading) {
      page--
      await load(el)
    }
  })

  el.querySelector('#next-page').addEventListener('click', async () => {
    if (!isLoading && (page + 1) * pageSize < totalCount) {
      page++
      await load(el)
    }
  })

  return el
}

async function load(root) {
  if (isLoading) return
  isLoading = true

  const grid = root.querySelector('#novel-grid')
  const pagination = root.querySelector('#pagination')

  grid.innerHTML = `
    <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: var(--space-xl);">
      <div class="spinner"></div>
      <p style="margin-top: var(--space-md); color: var(--text-secondary);">加载中...</p>
    </div>
  `

  try {
    const [list, count] = await Promise.all([
      api.listNovels(page, pageSize),
      api.countNovels()
    ])
    totalCount = count
    novelsList = list
    
    if (list.length === 0 && count === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">${icon('novels', 20)}</div>
          <div class="empty-state-title">暂无项目</div>
          <div class="empty-state-desc">创建你的第一个小说项目开始创作之旅</div>
        </div>
      `
      pagination.style.display = 'none'
      isLoading = false
      return
    }

    grid.innerHTML = list.map(item => {
      const isFocus = item.id === store.currentNovelId
      return `
      <div class="novel-card card${isFocus ? ' novel-card-focus' : ''}" data-id="${item.id}">
        ${isFocus ? `<div class="novel-focus-badge">${icon('star-filled', 16)}</div>` : ''}
        <div class="novel-cover">
          <div class="novel-cover-placeholder" style="background: linear-gradient(135deg, ${getGradient(item.style)});">
            <span class="novel-cover-text">${(item.title || 'N').charAt(0)}</span>
          </div>
        </div>
        <div class="novel-content">
          <h3 class="novel-title">${item.title}</h3>
          <p class="novel-desc">${item.description || '暂无简介'}</p>
          <div class="novel-tags">
            <span class="badge badge-primary">${ENUMS.NovelStyle[item.style] || '都市'}</span>
            <span class="badge badge-success">${ENUMS.NovelLengthType[item.length_type] || '中篇'}</span>
            <span class="badge">${ENUMS.NovelStatus[item.status] || '构思'}</span>
          </div>
          <div class="novel-footer">
            <div class="novel-stats">
              <span class="novel-stat">
                <span class="icon-sm">${icon('edit', 14)}</span>
                ${formatWordCount(item.total_word_count || 0)}
              </span>
            </div>
            <div class="novel-actions">
              <button class="btn-icon btn-icon-danger" data-action="delete" title="删除">
                ${icon('delete', 14)}
              </button>
            </div>
          </div>
        </div>
      </div>
    `}).join('')

    updatePagination(root)
    bindCardEvents(root)
  } catch (e) {
    console.error('加载小说列表失败:', e)
    grid.innerHTML = `
      <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: var(--space-xl);">
        <div class="error-icon" style="color: var(--danger);">${icon('alert-circle', 18)}</div>
        <p style="margin-top: var(--space-md); color: var(--text-secondary);">加载失败: ${e}</p>
        <button class="btn btn-secondary" style="margin-top: var(--space-md);" id="retry-btn">重试</button>
      </div>
    `
    const retryBtn = root.querySelector('#retry-btn')
    if (retryBtn) {
      retryBtn.addEventListener('click', () => load(root))
    }
  }

  isLoading = false
}

function updatePagination(root) {
  const pagination = root.querySelector('#pagination')
  const prevBtn = root.querySelector('#prev-page')
  const nextBtn = root.querySelector('#next-page')
  const pageInfo = root.querySelector('#page-info')

  const totalPages = Math.ceil(totalCount / pageSize)
  
  if (totalPages > 1) {
    pagination.style.display = 'flex'
    pageInfo.textContent = `第 ${page + 1} 页 / 共 ${totalPages} 页`
    prevBtn.disabled = page === 0
    nextBtn.disabled = (page + 1) * pageSize >= totalCount
  } else {
    pagination.style.display = 'none'
  }
}

function bindCardEvents(root) {
  const grid = root.querySelector('#novel-grid')
  
  grid.querySelectorAll('.novel-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action
      const id = Number(card.dataset.id)
      
      if (action === 'delete') {
        e.stopPropagation()
        await handleDelete(id, root)
      } else {
        await handleSelectNovel(id)
      }
    })
  })
}

async function handleSelectNovel(id) {
  const novel = novelsList.find(n => n.id === id)
  store.currentNovelId = id
  store.currentNovelName = novel?.title || null
  
  const sidebarEl = document.getElementById('sidebar')
  if (sidebarEl) {
    renderSidebar(sidebarEl)
  }
  
  navigate('/workspace')
}

async function handleDelete(id, root) {
  if (confirm('确定要删除这部小说吗？此操作不可恢复。')) {
    try {
      await api.deleteNovel(id)
      
      if (store.currentNovelId === id) {
        store.currentNovelId = null
        const sidebarEl = document.getElementById('sidebar')
        if (sidebarEl) {
          renderSidebar(sidebarEl)
        }
      }
      
      await load(root)
    } catch (e) {
      console.error('删除小说失败:', e)
      alert('删除失败: ' + e)
    }
  }
}

function getGradient(style) {
  const gradients = {
    1: '#667eea, #764ba2',
    2: '#f093fb, #f5576c',
    3: '#4facfe, #00f2fe',
    4: '#43e97b, #38f9d7',
    5: '#fa709a, #fee140',
    6: '#a18cd1, #fbc2eb',
    7: '#30cfd0, #330867',
    8: '#ffecd2, #fcb69f',
    9: '#a1c4fd, #c2e9fb',
    10: '#667eea, #764ba2',
    11: '#f5af19, #f12711',
    12: '#6a11cb, #2575fc',
    13: '#c471f5, #fa71cd',
    14: '#48c6ef, #6f86d6',
    15: '#feada6, #f5efef',
  }
  return gradients[style] || gradients[1]
}

function formatWordCount(count) {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`
  }
  return `${count}字`
}

export function cleanup() {
  page = 0
  totalCount = 0
  isLoading = false
}
