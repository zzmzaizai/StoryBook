import { api } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { confirm } from '../../lib/modal.js'
import { createMarkdownEditor } from '../../lib/markdown-editor.js'
import { createPagedList } from '../../lib/virtual-list.js'
import '../../style/virtual-list.css'

let timelineList = []
let editingTimeline = null
let timelineOutlineEditor = null
let timelineCharactersEditor = null
let timelineListComponent = null

export async function loadTimelines(novelId) {
  try {
    timelineList = await api.listTimelines(novelId)
  } catch (e) {
    console.error('加载时间线失败:', e)
    timelineList = []
  }
  return { timelineList }
}

export function getTimelineList() {
  return timelineList
}

export async function render(content, novelInfo) {
  content.innerHTML = `
    <div class="meta-layout">
      <div class="card meta-list-card">
        <div class="flex justify-between items-center mb-md">
          <h3 class="card-title">${ICONS.timeline} 时间线列表</h3>
          <button id="add-timeline-btn" class="btn btn-primary btn-sm">${ICONS.plus}<span>添加</span></button>
        </div>
        <div id="timeline-list-mount" class="meta-list-mount"></div>
      </div>

      <div class="card meta-editor-card">
        <div id="timeline-editor-content">
          <div class="empty-state">
            <div class="empty-state-icon">${ICONS.timeline}</div>
            <div class="empty-state-title">选择时间线</div>
            <div class="empty-state-desc">从左侧列表选择时间线进行编辑</div>
          </div>
        </div>
      </div>
    </div>
  `

  // 创建分页列表
  const listMount = content.querySelector('#timeline-list-mount')
  timelineListComponent = createPagedList({
    containerId: 'timeline-list',
    pageSize: 20,
    loadMore: async (page, pageSize) => {
      const result = await api.listTimelinesPaged(novelInfo.id, page, pageSize)
      return {
        items: result.items,
        hasMore: result.has_more
      }
    },
    renderItem: (tl) => {
      const div = document.createElement('div')
      div.className = 'timeline-list-item'
      if (editingTimeline?.id === tl.id) {
        div.classList.add('active')
      }

      const preview = tl.description || tl.timeline_outline || '暂未填写时间线概述'
      div.innerHTML = `
        <div class="timeline-item-header">
          <div class="timeline-item-badges">
            <span class="timeline-chapter-badge-small">${tl.start_chapter_number || 1}</span>
            <span class="timeline-arrow-small">→</span>
            <span class="timeline-chapter-badge-small">${tl.end_chapter_number || 10}</span>
          </div>
          <button class="list-item-delete-btn list-item-delete-btn-visible" data-action="delete-timeline" data-timeline-id="${tl.id}" aria-label="删除时间线">
            ${ICONS.delete}
          </button>
        </div>
        <div class="timeline-item-title">${tl.title || '未命名时间线'}</div>
        <p class="timeline-item-preview">${preview.substring(0, 72)}${preview.length > 72 ? '...' : ''}</p>
      `

      const deleteBtn = div.querySelector('[data-action="delete-timeline"]')
      deleteBtn?.addEventListener('click', async (e) => {
        e.stopPropagation()
        const confirmed = await confirm('确定要删除这个时间线吗？', '删除确认')
        if (!confirmed) return

        try {
          await api.deleteTimeline(tl.id)
          timelineList = timelineList.filter(t => t.id !== tl.id)
          if (editingTimeline && editingTimeline.id === tl.id) {
            editingTimeline = null
            renderEditor(content, novelInfo)
          }
          toastSuccess('删除成功')
          timelineListComponent.refresh()
        } catch (err) {
          toastError('删除失败: ' + err.message)
        }
      })

      return div
    },
    onItemClick: (tl) => {
      // 选中编辑
      editingTimeline = tl
      renderEditor(content, novelInfo)
    },
    emptyText: '暂无时间线'
  })
  listMount.appendChild(timelineListComponent.element)

  // 添加按钮
  content.querySelector('#add-timeline-btn')?.addEventListener('click', async () => {
    try {
      let startChapter = 1
      let endChapter = 10

      // 获取当前列表中的最大章节
      const allTimelines = await api.listTimelines(novelInfo.id)
      if (allTimelines.length > 0) {
        const maxEndChapter = Math.max(...allTimelines.map(t => t.end_chapter_number || 0))
        startChapter = maxEndChapter + 1
        endChapter = startChapter + 9
      }

      const title = `第${startChapter}-${endChapter}章大纲`
      const newTimeline = await api.createTimeline(novelInfo.id, title)

      if (newTimeline && newTimeline.id) {
        await api.updateTimeline(
          newTimeline.id,
          title,
          null,
          null,
          startChapter,
          endChapter,
          null,
          null
        )
        timelineList = await api.listTimelines(novelInfo.id)
        editingTimeline = timelineList.find(t => t.id === newTimeline.id)
      }

      toastSuccess('创建成功')
      timelineListComponent.refresh()
      if (editingTimeline) {
        renderEditor(content, novelInfo)
      }
    } catch (err) {
      toastError('创建失败: ' + err.message)
    }
  })

  if (editingTimeline) {
    renderEditor(content, novelInfo)
  }
}

function renderEditor(content, novelInfo) {
  const editorContent = content.querySelector('#timeline-editor-content')

  if (timelineOutlineEditor) {
    timelineOutlineEditor.destroy()
    timelineOutlineEditor = null
  }
  if (timelineCharactersEditor) {
    timelineCharactersEditor.destroy()
    timelineCharactersEditor = null
  }

  editorContent.innerHTML = `
    <div class="meta-editor timeline-editor-shell">
      <div class="meta-editor-header">
        <div>
          <h3 class="meta-editor-title">${editingTimeline.title || '未命名时间线'}</h3>
          <p class="meta-editor-desc">第${editingTimeline.start_chapter_number || 1}章 → 第${editingTimeline.end_chapter_number || 10}章</p>
        </div>
        <div class="timeline-editor-header-actions">
          <button id="ai-generate-timeline-btn" class="btn btn-secondary">${ICONS.sparkles}<span>AI生成</span></button>
          <button id="save-timeline-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
        </div>
      </div>
      <div class="timeline-editor-form">
        <div class="form-grid timeline-form-grid">
          <div class="form-group timeline-field-title">
            <label class="form-label">时间线标题</label>
            <input id="timeline-title" class="form-input" value="${editingTimeline.title || ''}" />
          </div>
          <div class="form-group timeline-field-start">
            <label class="form-label">起始章节</label>
            <input id="timeline-start" class="form-input" type="number" value="${editingTimeline.start_chapter_number || 1}" />
          </div>
          <div class="form-group timeline-field-end">
            <label class="form-label">结束章节</label>
            <input id="timeline-end" class="form-input" type="number" value="${editingTimeline.end_chapter_number || 10}" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">描述</label>
            <textarea id="timeline-desc" class="form-input" rows="3">${editingTimeline.description || ''}</textarea>
          </div>
          <div class="form-group full-width">
            <label class="form-label">时间线大纲</label>
            <div id="timeline-outline-editor" class="markdown-editor-container" style="height: 200px;"></div>
          </div>
          <div class="form-group full-width">
            <label class="form-label">角色描述</label>
            <div id="timeline-characters-editor" class="markdown-editor-container" style="height: 200px;"></div>
          </div>
        </div>
      </div>
    </div>
  `

  setTimeout(() => {
    const outlineContainer = editorContent.querySelector('#timeline-outline-editor')
    if (outlineContainer) {
      timelineOutlineEditor = createMarkdownEditor(outlineContainer, {
        placeholder: '输入时间线大纲...',
        height: 200,
        minHeight: 150,
        value: editingTimeline.timeline_outline || '',
        toolbar: ['headings', 'bold', 'italic', '|', 'list', 'ordered-list', '|', 'quote', 'code', '|', 'undo', 'redo'],
      })
    }

    const charactersContainer = editorContent.querySelector('#timeline-characters-editor')
    if (charactersContainer) {
      timelineCharactersEditor = createMarkdownEditor(charactersContainer, {
        placeholder: '输入角色描述...',
        height: 200,
        minHeight: 150,
        value: editingTimeline.characters_description || '',
        toolbar: ['headings', 'bold', 'italic', '|', 'list', 'ordered-list', '|', 'quote', 'code', '|', 'undo', 'redo'],
      })
    }
  }, 50)

  editorContent.querySelector('#save-timeline-btn')?.addEventListener('click', async () => {
    const title = editorContent.querySelector('#timeline-title')?.value || ''
    const startChapter = parseInt(editorContent.querySelector('#timeline-start')?.value || '1')
    const endChapter = parseInt(editorContent.querySelector('#timeline-end')?.value || '10')
    const description = editorContent.querySelector('#timeline-desc')?.value || ''
    const timelineOutline = timelineOutlineEditor ? timelineOutlineEditor.getValue() : ''
    const charactersDescription = timelineCharactersEditor ? timelineCharactersEditor.getValue() : ''

    try {
      await api.updateTimeline(
        editingTimeline.id,
        title,
        description,
        timelineOutline,
        startChapter,
        endChapter,
        charactersDescription,
        null
      )

      editingTimeline.title = title
      editingTimeline.start_chapter_number = startChapter
      editingTimeline.end_chapter_number = endChapter
      editingTimeline.description = description
      editingTimeline.timeline_outline = timelineOutline
      editingTimeline.characters_description = charactersDescription

      const tl = timelineList.find(t => t.id === editingTimeline.id)
      if (tl) {
        tl.title = title
        tl.start_chapter_number = startChapter
        tl.end_chapter_number = endChapter
        tl.description = description
      }

      toastSuccess('保存成功')
      timelineListComponent.refresh()
    } catch (err) {
      toastError('保存失败: ' + err.message)
    }
  })

  editorContent.querySelector('#ai-generate-timeline-btn')?.addEventListener('click', () => {
    toastSuccess('AI生成功能开发中...')
  })
}

export function cleanup() {
  if (timelineOutlineEditor) {
    timelineOutlineEditor.destroy()
    timelineOutlineEditor = null
  }
  if (timelineCharactersEditor) {
    timelineCharactersEditor.destroy()
    timelineCharactersEditor = null
  }
  if (timelineListComponent) {
    timelineListComponent.destroy()
    timelineListComponent = null
  }
  editingTimeline = null
  timelineList = []
}
