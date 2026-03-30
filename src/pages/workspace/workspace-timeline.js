import { api } from '../../api/tauri.js'
import { icon } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { confirm } from '../../lib/modal.js'
import { Modal } from '../../lib/modal.js'
import { createMarkdownEditor } from '../../lib/markdown-editor.js'
import { createPagedList } from '../../lib/virtual-list.js'
import '../../style/virtual-list.css'

let timelineList = []
let editingTimeline = null
let timelineContentEditor = null
let timelineListComponent = null
let timelineAiGenerating = false

const TIMELINE_AI_ACTIONS = [
  { value: 'generate', label: '直接生成' },
  { value: 'improve', label: '优化现有内容' },
  { value: 'rewrite', label: '重写现有内容' },
  { value: 'expand', label: '扩展现有内容' },
  { value: 'condense', label: '精简整理' },
]

function getTimelineAiDefaultAction(currentContent) {
  return currentContent.trim() ? 'improve' : 'generate'
}

function getTimelineAiConfirmText(action) {
  switch (action) {
    case 'improve': return '优化内容'
    case 'rewrite': return '重写内容'
    case 'expand': return '扩展内容'
    case 'condense': return '精简整理'
    default: return '直接生成'
  }
}

function updateTimelineAiButtonState() {
  const aiButton = document.querySelector('#ai-generate-timeline-btn')
  if (!aiButton) return

  aiButton.disabled = timelineAiGenerating
  aiButton.classList.toggle('btn-loading', timelineAiGenerating)
  const label = aiButton.querySelector('span')
  if (label) {
    label.textContent = timelineAiGenerating ? 'AI生成中...' : 'AI生成'
  }
}

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
          <h3 class="card-title">${icon('timeline', 16)} 时间线列表</h3>
          <button id="add-timeline-btn" class="btn btn-primary btn-sm">${icon('plus', 16)}<span>添加</span></button>
        </div>
        <div id="timeline-list-mount" class="meta-list-mount"></div>
      </div>

      <div class="card meta-editor-card">
        <div id="timeline-editor-content">
          <div class="empty-state">
            <div class="empty-state-icon">${icon('timeline', 20)}</div>
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

      const preview = tl.content || '暂未填写时间线正文'
      div.innerHTML = `
        <div class="timeline-item-header">
          <div class="timeline-item-badges">
            <span class="timeline-chapter-badge-small">${tl.start_chapter_number || 1}</span>
            <span class="timeline-arrow-small">→</span>
            <span class="timeline-chapter-badge-small">${tl.end_chapter_number || 10}</span>
          </div>
          <button class="list-item-delete-btn list-item-delete-btn-visible" data-action="delete-timeline" data-timeline-id="${tl.id}" aria-label="删除时间线">
            ${icon('delete', 14)}
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
    onItemClick: (tl, index, el) => {
      editingTimeline = tl

      const listContainer = el.closest('.paged-list-content')
      if (listContainer) {
        listContainer.querySelectorAll('.timeline-list-item').forEach(item => item.classList.remove('active'))
        el.querySelector('.timeline-list-item')?.classList.add('active')
      }

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

      const title = `第${startChapter}-${endChapter}章时间线`
      const newTimeline = await api.createTimeline(novelInfo.id, title)

      if (newTimeline && newTimeline.id) {
        await api.updateTimeline(
          newTimeline.id,
          title,
          '',
          startChapter,
          endChapter
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

  if (!editingTimeline) {
    editorContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon('timeline', 20)}</div>
        <div class="empty-state-title">选择时间线</div>
        <div class="empty-state-desc">从左侧列表选择时间线进行编辑</div>
      </div>
    `
    return
  }

  if (timelineContentEditor) {
    timelineContentEditor.destroy()
    timelineContentEditor = null
  }

  editorContent.innerHTML = `
    <div class="meta-editor timeline-editor-shell">
      <div class="meta-editor-header">
        <div>
          <h3 class="meta-editor-title">${editingTimeline.title || '未命名时间线'}</h3>
          <p class="meta-editor-desc">第${editingTimeline.start_chapter_number || 1}章 → 第${editingTimeline.end_chapter_number || 10}章</p>
        </div>
        <div class="timeline-editor-header-actions">
          <button id="ai-generate-timeline-btn" class="btn btn-secondary${timelineAiGenerating ? ' btn-loading' : ''}" ${timelineAiGenerating ? 'disabled' : ''}>${icon('sparkles', 16)}<span>${timelineAiGenerating ? 'AI生成中...' : 'AI生成'}</span></button>
          <button id="save-timeline-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
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
            <label class="form-label">时间线正文</label>
            <div id="timeline-content-editor" class="markdown-editor-container" style="height: 360px;"></div>
          </div>
        </div>
      </div>
    </div>
  `

  setTimeout(() => {
    const contentContainer = editorContent.querySelector('#timeline-content-editor')
    if (contentContainer) {
      timelineContentEditor = createMarkdownEditor(contentContainer, {
        placeholder: '输入时间线正文...',
        height: 360,
        minHeight: 240,
        value: editingTimeline.content || '',
        toolbar: ['headings', 'bold', 'italic', '|', 'list', 'ordered-list', '|', 'quote', 'code', '|', 'undo', 'redo'],
      })
    }
  }, 50)

  editorContent.querySelector('#save-timeline-btn')?.addEventListener('click', async () => {
    const title = editorContent.querySelector('#timeline-title')?.value || ''
    const startChapter = parseInt(editorContent.querySelector('#timeline-start')?.value || '1')
    const endChapter = parseInt(editorContent.querySelector('#timeline-end')?.value || '10')
    const timelineContent = timelineContentEditor ? timelineContentEditor.getValue() : ''

    try {
      await api.updateTimeline(
        editingTimeline.id,
        title,
        timelineContent,
        startChapter,
        endChapter
      )

      editingTimeline.title = title
      editingTimeline.start_chapter_number = startChapter
      editingTimeline.end_chapter_number = endChapter
      editingTimeline.content = timelineContent

      const tl = timelineList.find(t => t.id === editingTimeline.id)
      if (tl) {
        tl.title = title
        tl.start_chapter_number = startChapter
        tl.end_chapter_number = endChapter
        tl.content = timelineContent
      }

      toastSuccess('保存成功')
      timelineListComponent.refresh()
    } catch (err) {
      toastError('保存失败: ' + err.message)
    }
  })

  editorContent.querySelector('#ai-generate-timeline-btn')?.addEventListener('click', () => {
    openTimelineAiModal(novelInfo, editorContent)
  })
}

function openTimelineAiModal(novelInfo, editorContent) {
  const currentContent = timelineContentEditor ? timelineContentEditor.getValue() : ''
  const defaultAction = getTimelineAiDefaultAction(currentContent)
  const body = document.createElement('div')
  body.innerHTML = `
    <div class="meta-preview-note" style="margin-top: 0; margin-bottom: var(--space-md);">
      <div>
        <div class="meta-preview-note__title">${currentContent.trim() ? '将基于当前时间线继续处理' : '当前时间线为空，可直接生成初稿'}</div>
        <div class="meta-preview-note__desc">你可以直接生成、优化、重写或精简当前时间线。补充要求是可选项。</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">操作类型</label>
      <div class="meta-ai-actions">
        ${TIMELINE_AI_ACTIONS.map(action => `
          <label class="meta-ai-action-option">
            <input type="radio" name="timeline-ai-action" value="${action.value}" ${action.value === defaultAction ? 'checked' : ''}>
            <span>${action.label}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">补充要求（可选）</label>
      <textarea id="timeline-ai-requirement" class="form-input" rows="6" placeholder="例如：节奏更快、强化主角动机、让结尾留下更强钩子"></textarea>
    </div>
  `

  const modal = new Modal({
    title: 'AI生成时间线',
    content: body,
    size: 'md',
    confirmText: getTimelineAiConfirmText(defaultAction),
    cancelText: '取消',
    onConfirm: async (instance) => {
      const action = instance.contentEl.querySelector('input[name="timeline-ai-action"]:checked')?.value || defaultAction
      const requirement = instance.contentEl.querySelector('#timeline-ai-requirement')?.value?.trim() || ''
      instance.setLoading(true)

      try {
        timelineAiGenerating = true
        updateTimelineAiButtonState()
        const result = await api.aiGenerateTimeline({
          novelId: novelInfo.id,
          timelineId: editingTimeline?.id ?? null,
          currentTitle: editorContent.querySelector('#timeline-title')?.value || '',
          action,
          currentContent: timelineContentEditor ? timelineContentEditor.getValue() : '',
          startChapterNumber: parseInt(editorContent.querySelector('#timeline-start')?.value || '1'),
          endChapterNumber: parseInt(editorContent.querySelector('#timeline-end')?.value || '10'),
          requirement,
        })

        instance.close({ action: 'confirm' })

        editorContent.querySelector('#timeline-title').value = result.title || ''
        timelineContentEditor?.setValue(result.content || '')
        timelineAiGenerating = false
        updateTimelineAiButtonState()
        toastSuccess('AI生成完成')
      } catch (err) {
        timelineAiGenerating = false
        updateTimelineAiButtonState()
        toastError('AI生成失败: ' + err)
        return false
      }
    }
  })

  const syncConfirmText = () => {
    const action = modal.contentEl.querySelector('input[name="timeline-ai-action"]:checked')?.value || defaultAction
    modal.setButtons([
      { text: '取消', type: 'default', onClick: () => modal.cancel() },
      { text: getTimelineAiConfirmText(action), type: 'primary', onClick: () => modal.confirm() },
    ])
  }

  modal.open()
  setTimeout(() => {
    modal.contentEl.querySelectorAll('input[name="timeline-ai-action"]').forEach(input => {
      input.addEventListener('change', syncConfirmText)
    })
  }, 0)
}

export function cleanup() {
  if (timelineContentEditor) {
    timelineContentEditor.destroy()
    timelineContentEditor = null
  }
  if (timelineListComponent) {
    timelineListComponent.destroy()
    timelineListComponent = null
  }
  timelineAiGenerating = false
  editingTimeline = null
  timelineList = []
}
