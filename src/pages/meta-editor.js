import { api } from '../api/tauri.js'
import { icon } from '../lib/icons.js'
import { toastSuccess, toastError } from '../lib/toast.js'
import { confirm } from '../lib/modal.js'
import { listen } from '@tauri-apps/api/event'
import { createMarkdownEditor } from '../lib/markdown-editor.js'
import { createTabs } from '../lib/tabs.js'
import { createPagedList } from '../lib/virtual-list.js'
import { applyAiPhaseUpdate, applyAiToolEvent } from '../lib/ai-execution-state.js'
import '../style/virtual-list.css'

let activeMetaTab = 'added'
let editingMeta = null
let previewMetaProperty = null
let metaDataList = []
let metaProperties = []
let metaEditorInstance = null
let metaTabsComponent = null
let metaListComponent = null
let metaAiUnlisteners = []
let activeMetaAiRequestId = null
let metaAiGenerating = false
let metaAiOriginalContent = ''
let activeMetaAiModal = null
let activeMetaPriorityFilter = 'required'

const META_AI_ACTIONS = [
  { value: 'generate', label: '生成' },
  { value: 'improve', label: '优化现有内容' },
  { value: 'rewrite', label: '重写现有内容' },
  { value: 'expand', label: '扩展现有内容' },
  { value: 'condense', label: '精简整理' },
]

const META_PRIORITY_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'required', label: '基础必填' },
  { key: 'recommended', label: '推荐补充' },
  { key: 'advanced', label: '高级扩展' },
]

function getMetaPriorityMeta(priority) {
  switch (priority) {
    case 'required':
      return { label: '基础必填', badge: '必填', description: '建议优先补齐这类元数据，先建立最小创作骨架。', className: 'required' }
    case 'recommended':
      return { label: '推荐补充', badge: '推荐', description: '补充后可以显著提升角色、剧情和长线连贯性。', className: 'recommended' }
    case 'advanced':
      return { label: '高级扩展', badge: '扩展', description: '适合在主线稳定后继续细化世界深度和复杂度。', className: 'advanced' }
    default:
      return { label: '全部', badge: '全部', description: '查看全部可添加元数据。', className: 'all' }
  }
}

function filterMetaPropertiesByPriority(properties, priority) {
  if (priority === 'all') return properties
  return properties.filter(prop => prop.priority_level === priority)
}

function buildMetaPriorityToolbar(items, priority) {
  const priorityMeta = getMetaPriorityMeta(priority)
  return `
    <div class="meta-list-toolbar">
      ${renderMetaPriorityFilters()}
      <div class="meta-priority-summary">${priorityMeta.label} · ${items.length}</div>
    </div>
    <div class="meta-priority-hint">${priorityMeta.description}</div>
  `
}

function bindMetaPriorityFilters(listMount, content, novelInfo) {
  listMount.querySelectorAll('[data-priority-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeMetaPriorityFilter = button.dataset.priorityFilter || 'all'
      renderMetaList(content, novelInfo)
    })
  })
}

function renderMetaListItemHeader(prop, actionHtml) {
  return `
    <div class="meta-item-header">
      <div class="meta-item-title-wrap">
        <span class="meta-item-name">${prop.property_name}</span>
        <span class="meta-item-group">${prop.group_name}</span>
        ${renderMetaPriorityBadge(prop.priority_level)}
      </div>
      ${actionHtml}
    </div>
  `
}

function renderMetaPriorityFilters() {
  return `
    <div class="meta-priority-filters">
      ${META_PRIORITY_FILTERS.map(filter => `
        <button type="button" class="meta-priority-filter${activeMetaPriorityFilter === filter.key ? ' active' : ''}" data-priority-filter="${filter.key}">${filter.label}</button>
      `).join('')}
    </div>
  `
}

function renderMetaPriorityBadge(priority) {
  const meta = getMetaPriorityMeta(priority)
  return `<span class="meta-priority-badge meta-priority-badge--${meta.className}">${meta.badge}</span>`
}

function getMetaAiDefaultAction(currentContent) {
  return currentContent.trim() ? 'improve' : 'generate'
}

function getMetaAiConfirmText(action) {
  switch (action) {
    case 'improve': return '优化内容'
    case 'rewrite': return '重写内容'
    case 'expand': return '扩展内容'
    case 'condense': return '精简整理'
    default: return '生成'
  }
}

function updateMetaAiButtonState() {
  const aiButton = document.querySelector('#ai-generate-btn')
  if (!aiButton) return

  aiButton.disabled = metaAiGenerating
  aiButton.classList.toggle('btn-loading', metaAiGenerating)
  const label = aiButton.querySelector('span')
  if (label) {
    label.textContent = metaAiGenerating ? 'AI生成中...' : 'AI生成'
  }
}

export async function loadMeta(novelId) {
  try {
    metaProperties = await api.getNovelMetaProperties()
    metaDataList = await api.listMeta(novelId)
  } catch (e) {
    console.error('加载元数据属性失败:', e)
    metaProperties = []
    metaDataList = []
  }
  return { metaProperties }
}

export function getMetaDataList() {
  return metaDataList
}

export async function render(content, novelInfo) {
  await ensureMetaAiListeners()
  const unaddedProps = metaProperties.filter(p => !metaDataList.find(m => m.property_name === p.property_name))

  content.innerHTML = `
    <div class="meta-layout">
      <div class="card meta-list-card">
        <div id="meta-tabs-mount"></div>
        <div id="meta-list-mount" class="meta-list-mount"></div>
      </div>

      <div class="card meta-editor-card">
        <div id="meta-editor-content">
          <div class="empty-state">
            <div class="empty-state-icon">${icon('meta', 20)}</div>
            <div class="empty-state-title">选择元数据</div>
            <div class="empty-state-desc">从左侧列表选择元数据进行编辑</div>
          </div>
        </div>
      </div>
    </div>
  `

  const tabsMount = content.querySelector('#meta-tabs-mount')
  metaTabsComponent = createTabs({
    containerId: 'meta-tabs',
    tabs: [
      { key: 'added', label: `已添加(${metaDataList.length})`, color: '#10b981' },
      { key: 'available', label: `可添加(${unaddedProps.length})`, icon: icon('plus', 16), color: '#6366f1' }
    ],
    activeKey: activeMetaTab,
    onChange: (key) => {
      activeMetaTab = key
      renderMetaList(content, novelInfo)
    }
  })
  tabsMount.appendChild(metaTabsComponent.element)

  renderMetaList(content, novelInfo)

  if (editingMeta) {
    renderEditor(content, novelInfo)
  }
}

function renderMetaList(content, novelInfo) {
  const listMount = content.querySelector('#meta-list-mount')

  if (metaListComponent) {
    metaListComponent.destroy()
    metaListComponent = null
  }

  if (activeMetaTab === 'added') {
    const allAddedMeta = metaDataList
      .map(meta => ({ meta, propDef: metaProperties.find(p => p.property_name === meta.property_name) }))
      .filter(item => item.propDef)
    const filteredAddedMeta = allAddedMeta
      .filter(item => activeMetaPriorityFilter === 'all' || item.propDef.priority_level === activeMetaPriorityFilter)
      .map(item => item.meta)

    listMount.innerHTML = buildMetaPriorityToolbar(filteredAddedMeta, activeMetaPriorityFilter)
    bindMetaPriorityFilters(listMount, content, novelInfo)

    metaListComponent = createPagedList({
      containerId: 'meta-added-list',
      pageSize: 20,
      loadMore: async (page, pageSize) => {
        const start = page * pageSize
        const end = start + pageSize
        const items = filteredAddedMeta.slice(start, end)
        return {
          items,
          hasMore: end < filteredAddedMeta.length
        }
      },
      renderItem: (meta) => {
        const div = document.createElement('div')
        div.className = 'meta-list-item'
        if (editingMeta?.id === meta.id) {
          div.classList.add('active')
        }
        const propDef = metaProperties.find(p => p.property_name === meta.property_name)
        const previewText = propDef?.property_description || '点击继续编辑该元数据内容'
        div.innerHTML = `
          ${renderMetaListItemHeader(
            propDef || { property_name: meta.property_name, group_name: '未分组', priority_level: 'recommended' },
            `<button class="list-item-delete-btn list-item-delete-btn-visible" data-action="delete-meta" data-meta-id="${meta.id}" aria-label="删除元数据">${icon('delete', 14)}</button>`
          )}
          <p class="meta-item-preview">${previewText}</p>
        `

        const deleteBtn = div.querySelector('[data-action="delete-meta"]')
        deleteBtn?.addEventListener('click', async (e) => {
          e.stopPropagation()
          const confirmed = await confirm('确定要删除这个元数据吗？', '删除确认')
          if (!confirmed) return

          try {
            await api.deleteMeta(meta.id)
            metaDataList = metaDataList.filter(m => m.id !== meta.id)
            if (editingMeta?.id === meta.id) {
              editingMeta = null
              previewMetaProperty = null
              const editorContent = content.querySelector('#meta-editor-content')
              if (editorContent) {
                editorContent.innerHTML = `
                  <div class="empty-state">
                    <div class="empty-state-icon">${icon('meta', 20)}</div>
                    <div class="empty-state-title">选择元数据</div>
                    <div class="empty-state-desc">从左侧列表选择元数据进行编辑</div>
                  </div>
                `
              }
            }
            toastSuccess('删除成功')
            await render(content, novelInfo)
            if (activeMetaTab === 'added' && editingMeta) {
              renderEditor(content, novelInfo)
            }
          } catch (err) {
            toastError('删除失败: ' + err.message)
          }
        })

        return div
      },
      onItemClick: (meta, index, el) => {
        previewMetaProperty = null
        editingMeta = meta

        const listContainer = el.closest('.paged-list-content')
        if (listContainer) {
          listContainer.querySelectorAll('.meta-list-item').forEach(item => item.classList.remove('active'))
          el.querySelector('.meta-list-item')?.classList.add('active')
        }

        renderEditor(content, novelInfo)
      },
      emptyText: '暂无元数据'
    })
  } else {
    const allUnaddedProps = metaProperties.filter(p => !metaDataList.find(m => m.property_name === p.property_name))
    const filteredUnaddedProps = filterMetaPropertiesByPriority(allUnaddedProps, activeMetaPriorityFilter)
    listMount.innerHTML = buildMetaPriorityToolbar(filteredUnaddedProps, activeMetaPriorityFilter)
    bindMetaPriorityFilters(listMount, content, novelInfo)

    metaListComponent = createPagedList({
      containerId: 'meta-available-list',
      pageSize: 50,
      loadMore: async (page, pageSize) => {
        const start = page * pageSize
        const end = start + pageSize
        const items = filteredUnaddedProps.slice(start, end)
        return {
          items,
          hasMore: end < filteredUnaddedProps.length
        }
      },
      renderItem: (prop) => {
        const div = document.createElement('div')
        div.className = 'meta-list-item'
        if (previewMetaProperty?.property_name === prop.property_name) {
          div.classList.add('active')
        }
        div.innerHTML = `
          ${renderMetaListItemHeader(
            prop,
            `<button class="list-item-add-btn" data-action="add-meta" aria-label="添加元数据">${icon('plus', 12)}</button>`
          )}
          <p class="meta-item-preview">${prop.property_description || ''}</p>
        `

        const addBtn = div.querySelector('[data-action="add-meta"]')
        addBtn?.addEventListener('click', async (e) => {
          e.stopPropagation()
          try {
            await api.createMeta(novelInfo.id, prop.property_name, '')
            const newMetaList = await api.listMeta(novelInfo.id)
            metaDataList = newMetaList
            previewMetaProperty = null

            await render(content, novelInfo)
            toastSuccess('添加成功')
          } catch (err) {
            toastError('添加失败: ' + err.message)
          }
        })

        return div
      },
      onItemClick: (prop) => {
        editingMeta = null
        previewMetaProperty = prop
        renderMetaPreview(content, prop, novelInfo)
        renderMetaList(content, novelInfo)
      },
      emptyText: '所有元数据已添加'
    })
  }

  listMount.appendChild(metaListComponent.element)
}

async function addMetaFromPreview(content, novelInfo, prop) {
  try {
    await api.createMeta(novelInfo.id, prop.property_name, '')
    const newMetaList = await api.listMeta(novelInfo.id)
    metaDataList = newMetaList
    previewMetaProperty = null

    await render(content, novelInfo)
    toastSuccess('添加成功')
  } catch (err) {
    toastError('添加失败: ' + err.message)
  }
}

function renderMetaPreview(content, prop, novelInfo) {
  const editorContent = content.querySelector('#meta-editor-content')
  if (!editorContent) return

  if (metaEditorInstance) {
    metaEditorInstance.destroy()
    metaEditorInstance = null
  }

  editorContent.innerHTML = `
    <div class="meta-editor meta-preview-panel">
      <div class="meta-editor-header">
        <div>
          <h3 class="meta-editor-title">${prop.property_name}</h3>
          <div class="meta-editor-meta-row">
            <span class="meta-item-group">${prop.group_name}</span>
            ${renderMetaPriorityBadge(prop.priority_level)}
          </div>
          <p class="meta-editor-desc">${prop.property_description || '该元数据暂无详细描述。'}</p>
        </div>
      </div>
      <div class="meta-preview-note">
        <button id="add-preview-meta-btn" class="meta-preview-note__icon" aria-label="立即添加这个元数据">${icon('plus', 14)}</button>
        <div>
          <div class="meta-preview-note__title">立即添加这个元数据</div>
          <div class="meta-preview-note__desc">${getMetaPriorityMeta(prop.priority_level).description} 添加后，这个元数据会进入“已添加”列表，并可在这里继续编辑具体内容。</div>
        </div>
      </div>
    </div>
  `

  editorContent.querySelector('#add-preview-meta-btn')?.addEventListener('click', () => {
    addMetaFromPreview(content, novelInfo, prop)
  })
}

function renderEditor(content, novelInfo) {
  const editorContent = content.querySelector('#meta-editor-content')
  const propDef = metaProperties.find(p => p.property_name === editingMeta.property_name)
  const propDesc = propDef ? propDef.property_description : ''

  if (metaEditorInstance) {
    metaEditorInstance.destroy()
    metaEditorInstance = null
  }

  editorContent.innerHTML = `
    <div class="meta-editor">
      <div class="meta-editor-header">
        <div>
          <h3 class="meta-editor-title">${editingMeta.property_name}</h3>
          ${propDef ? `<div class="meta-editor-meta-row"><span class="meta-item-group">${propDef.group_name}</span>${renderMetaPriorityBadge(propDef.priority_level)}</div>` : ''}
          ${propDesc ? `<p class="meta-editor-desc">${propDesc}</p>` : ''}
        </div>
      </div>
      <div id="meta-md-editor" class="markdown-editor-container" style="height: 350px;"></div>
      <div class="flex justify-end gap-md mt-md">
        <button id="ai-generate-btn" class="btn btn-secondary${metaAiGenerating ? ' btn-loading' : ''}" ${metaAiGenerating ? 'disabled' : ''}>${icon('sparkles', 16)}<span>${metaAiGenerating ? 'AI生成中...' : 'AI生成'}</span></button>
        <button id="save-meta-btn" class="btn btn-primary">${icon('save', 16)}<span>保存</span></button>
      </div>
    </div>
  `

  setTimeout(() => {
    const container = editorContent.querySelector('#meta-md-editor')
    if (container) {
      metaEditorInstance = createMarkdownEditor(container, {
        placeholder: '输入元数据内容...',
        height: 350,
        minHeight: 250,
        value: editingMeta.property_value || '',
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

  editorContent.querySelector('#save-meta-btn')?.addEventListener('click', async () => {
    const value = metaEditorInstance ? metaEditorInstance.getValue() : ''
    try {
      await api.updateMeta(editingMeta.id, value)
      editingMeta.property_value = value
      const meta = metaDataList.find(m => m.id === editingMeta.id)
      if (meta) {
        meta.property_value = value
      }
      toastSuccess('保存成功')

      if (metaEditorInstance) {
        metaEditorInstance.destroy()
        metaEditorInstance = null
      }

      render(content, novelInfo)
      renderEditor(content, novelInfo)
    } catch (err) {
      toastError('保存失败: ' + err.message)
    }
  })

  editorContent.querySelector('#ai-generate-btn')?.addEventListener('click', () => {
    openMetaAiModal(novelInfo)
  })
}

async function openMetaAiModal(novelInfo) {
  const { openAiGenerateModal } = await import('../components/ai-generate-modal.js')
  const currentContent = metaEditorInstance ? metaEditorInstance.getValue() : ''
  const defaultAction = getMetaAiDefaultAction(currentContent)
  const modal = openAiGenerateModal({
    title: `AI生成 - ${editingMeta.property_name}`,
    currentContent,
    currentContextTitle: '补充要求现在是可选项。你可以生成、优化、重写、扩展或精简当前元数据内容。',
    modeLabel: '操作类型',
    modes: META_AI_ACTIONS,
    defaultMode: defaultAction,
    requirementPlaceholder: '例如：更黑暗一点、加入更多权谋细节、语气更克制',
    getConfirmText: getMetaAiConfirmText,
    onSubmit: async ({ mode, requirement, modal: instance }) => {
      const requestId = `meta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      activeMetaAiRequestId = requestId
      const currentEditorContent = metaEditorInstance ? metaEditorInstance.getValue() : ''
      metaAiOriginalContent = currentEditorContent
      try {
        activeMetaAiModal = instance
        metaAiGenerating = true
        updateMetaAiButtonState()
        instance.startExecution()
        if (metaEditorInstance) {
          metaEditorInstance.setValue('')
        }
        await api.aiGenerateMetaStream({
          requestId,
          novelId: novelInfo.id,
          propertyName: editingMeta.property_name,
          propertyDescription: metaProperties.find(p => p.property_name === editingMeta.property_name)?.property_description || '',
          action: mode,
          currentContent: currentEditorContent,
          requirement,
        })
      } catch (err) {
        metaAiGenerating = false
        activeMetaAiRequestId = null
        activeMetaAiModal = null
        updateMetaAiButtonState()
        instance.finishExecution('error', `AI生成失败：${err.message || err}`)
        if (metaEditorInstance) {
          metaEditorInstance.setValue(metaAiOriginalContent)
        }
        toastError('AI生成失败: ' + err)
      }
    }
  })

  activeMetaAiModal = modal
}

function updateMetaModalPhase(payload, status) {
  applyAiPhaseUpdate(activeMetaAiModal, activeMetaAiRequestId, payload, status)
}

function appendMetaToolEvent(payload, isResult = false) {
  applyAiToolEvent(activeMetaAiModal, activeMetaAiRequestId, payload, isResult)
}

async function ensureMetaAiListeners() {
  if (metaAiUnlisteners.length > 0) return

  metaAiUnlisteners.push(
    await listen('meta-ai-phase-start', (event) => {
      updateMetaModalPhase(event.payload, 'running')
    }),
    await listen('meta-ai-phase-end', (event) => {
      updateMetaModalPhase(event.payload, 'finished')
    }),
    await listen('meta-ai-tool-call-start', (event) => {
      appendMetaToolEvent(event.payload, false)
    }),
    await listen('meta-ai-tool-call-result', (event) => {
      appendMetaToolEvent(event.payload, true)
    }),
    await listen('meta-ai-stream-chunk', (event) => {
      const payload = event.payload
      if (!metaEditorInstance || !payload?.delta || payload.request_id !== activeMetaAiRequestId) return
      metaEditorInstance.setValueWithAiFollow((metaEditorInstance.getValue() || '') + payload.delta)
    }),
    await listen('meta-ai-stream-done', (event) => {
      const payload = event.payload
      if (!metaEditorInstance || !payload || payload.request_id !== activeMetaAiRequestId) return
      metaEditorInstance.setValueWithAiFollow(payload.content || '')
      activeMetaAiRequestId = null
      metaAiGenerating = false
      metaAiOriginalContent = ''
      activeMetaAiModal?.finishExecution('success', '元数据已生成')
      activeMetaAiModal = null
      updateMetaAiButtonState()
      toastSuccess('AI生成完成')
    }),
    await listen('meta-ai-stream-error', (event) => {
      const payload = event.payload
      if (payload?.request_id !== activeMetaAiRequestId) return
      activeMetaAiRequestId = null
      metaAiGenerating = false
      if (metaEditorInstance) {
        metaEditorInstance.setValue(metaAiOriginalContent)
      }
      metaAiOriginalContent = ''
      activeMetaAiModal?.finishExecution('error', payload?.error || '未知错误')
      activeMetaAiModal = null
      updateMetaAiButtonState()
      toastError('AI生成失败: ' + (payload?.error || '未知错误'))
    })
  )
}

export function cleanup() {
  if (metaEditorInstance) {
    metaEditorInstance.destroy()
    metaEditorInstance = null
  }
  if (metaTabsComponent) {
    metaTabsComponent.destroy()
    metaTabsComponent = null
  }
  if (metaListComponent) {
    metaListComponent.destroy()
    metaListComponent = null
  }
  activeMetaTab = 'added'
  activeMetaPriorityFilter = 'required'
  editingMeta = null
  previewMetaProperty = null
  metaDataList = []
  metaProperties = []
  activeMetaAiRequestId = null
  metaAiGenerating = false
  metaAiOriginalContent = ''
  activeMetaAiModal = null
  metaAiUnlisteners.forEach(fn => fn())
  metaAiUnlisteners = []
}
