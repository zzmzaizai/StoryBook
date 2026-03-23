import { api } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { confirm } from '../../lib/modal.js'
import { createMarkdownEditor } from '../../lib/markdown-editor.js'

let timelineList = []
let editingTimeline = null
let timelineOutlineEditor = null
let timelineCharactersEditor = null

export async function loadTimelines(novelId) {
  try {
    timelineList = await api.listTimelines(novelId)
  } catch (e) {
    console.error('加载时间线失败:', e)
    timelineList = []
  }
  return timelineList
}

export function getTimelineList() {
  return timelineList
}

export async function render(content, novelInfo) {
  const timelines = timelineList

  content.innerHTML = `
    <div class="meta-layout">
      <div class="card meta-list-card">
        <div class="flex justify-between items-center mb-md">
          <h3 class="card-title">${ICONS.timeline} 时间线列表</h3>
          <button id="add-timeline-btn" class="btn btn-primary btn-sm">${ICONS.plus}<span>添加</span></button>
        </div>
        
        <div id="timeline-list-content" class="meta-list-content">
          ${timelines.length === 0 ? `
            <div class="text-center text-tertiary p-lg">暂无时间线</div>
          ` : timelines.map(tl => `
            <div class="timeline-item" data-timeline-id="${tl.id}">
              <div class="timeline-item-header">
                <span class="timeline-item-name">${tl.title || '未命名时间线'}</span>
                <div class="timeline-item-badges">
                  <span class="timeline-chapter-badge-small">${tl.start_chapter_number || 1}</span>
                  <span class="timeline-arrow-small">→</span>
                  <span class="timeline-chapter-badge-small">${tl.end_chapter_number || 10}</span>
                </div>
                <button class="btn-icon btn-icon-danger" data-action="delete-timeline" data-timeline-id="${tl.id}">
                  ${ICONS.delete}
                </button>
              </div>
              <p class="timeline-item-preview">${(tl.description || '暂无描述').substring(0, 60)}...</p>
            </div>
          `).join('')}
        </div>
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

  content.querySelector('#add-timeline-btn')?.addEventListener('click', async () => {
    try {
      let startChapter = 1
      let endChapter = 10
      
      if (timelineList.length > 0) {
        const maxEndChapter = Math.max(...timelineList.map(t => t.end_chapter_number || 0))
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
      render(content, novelInfo)
      if (editingTimeline) {
        renderEditor(content, novelInfo)
      }
    } catch (err) {
      toastError('创建失败: ' + err.message)
    }
  })

  content.querySelectorAll('[data-action="delete-timeline"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const timelineId = Number(btn.dataset.timelineId)
      const confirmed = await confirm('确定要删除这个时间线吗？', '删除确认')
      if (confirmed) {
        try {
          await api.deleteTimeline(timelineId)
          timelineList = timelineList.filter(t => t.id !== timelineId)
          if (editingTimeline && editingTimeline.id === timelineId) {
            editingTimeline = null
          }
          toastSuccess('删除成功')
          render(content, novelInfo)
        } catch (err) {
          toastError('删除失败: ' + err.message)
        }
      }
    })
  })

  content.querySelectorAll('.timeline-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="delete-timeline"]')) {
        return
      }
      const timelineId = Number(item.dataset.timelineId)
      editingTimeline = timelines.find(t => t.id === timelineId)
      if (editingTimeline) {
        renderEditor(content, novelInfo)
      }
    })
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
    <div class="meta-editor">
      <div class="meta-editor-header">
        <div>
          <h3 class="meta-editor-title">${editingTimeline.title || '未命名时间线'}</h3>
          <p class="meta-editor-desc">第${editingTimeline.start_chapter_number || 1}章 → 第${editingTimeline.end_chapter_number || 10}章</p>
        </div>
      </div>
      <div class="timeline-editor-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">时间线标题</label>
            <input id="timeline-title" class="form-input" value="${editingTimeline.title || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">起始章节</label>
            <input id="timeline-start" class="form-input" type="number" value="${editingTimeline.start_chapter_number || 1}" />
          </div>
          <div class="form-group">
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
      <div class="flex justify-end gap-md mt-md">
        <button id="save-timeline-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
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
        toolbar: [
          'headings', 'bold', 'italic', 'strike', '|',
          'list', 'ordered-list', 'check', '|',
          'quote', 'code', 'inline-code', '|',
          'table', 'line', '|',
          'undo', 'redo', '|',
          'edit-mode', 'preview', 'fullscreen',
        ],
      })
    }
    
    const charactersContainer = editorContent.querySelector('#timeline-characters-editor')
    if (charactersContainer) {
      timelineCharactersEditor = createMarkdownEditor(charactersContainer, {
        placeholder: '输入角色描述...',
        height: 200,
        minHeight: 150,
        value: editingTimeline.characters_description || '',
        toolbar: [
          'headings', 'bold', 'italic', 'strike', '|',
          'list', 'ordered-list', 'check', '|',
          'quote', 'code', 'inline-code', '|',
          'table', 'line', '|',
          'undo', 'redo', '|',
          'edit-mode', 'preview', 'fullscreen',
        ],
      })
    }
  }, 50)

  editorContent.querySelector('#save-timeline-btn')?.addEventListener('click', async () => {
    const title = editorContent.querySelector('#timeline-title').value
    const description = editorContent.querySelector('#timeline-desc').value
    const startChapterNumber = parseInt(editorContent.querySelector('#timeline-start').value) || 1
    const endChapterNumber = parseInt(editorContent.querySelector('#timeline-end').value) || 10
    const timelineOutline = timelineOutlineEditor ? timelineOutlineEditor.getValue() : ''
    const charactersDescription = timelineCharactersEditor ? timelineCharactersEditor.getValue() : ''

    try {
      await api.updateTimeline(
        editingTimeline.id,
        title,
        description,
        timelineOutline,
        startChapterNumber,
        endChapterNumber,
        charactersDescription,
        null
      )
      const tl = timelineList.find(t => t.id === editingTimeline.id)
      if (tl) {
        tl.title = title
        tl.description = description
        tl.start_chapter_number = startChapterNumber
        tl.end_chapter_number = endChapterNumber
        tl.timeline_outline = timelineOutline
        tl.characters_description = charactersDescription
        editingTimeline = { ...tl }
      }
      toastSuccess('保存成功')
      
      if (timelineOutlineEditor) {
        timelineOutlineEditor.destroy()
        timelineOutlineEditor = null
      }
      if (timelineCharactersEditor) {
        timelineCharactersEditor.destroy()
        timelineCharactersEditor = null
      }
      
      render(content, novelInfo)
      renderEditor(content, novelInfo)
    } catch (err) {
      toastError('保存失败: ' + err.message)
    }
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
  timelineList = []
  editingTimeline = null
}
