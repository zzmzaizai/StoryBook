import { api } from '../../api/tauri.js'
import { icon } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { confirm } from '../../lib/modal.js'
import { Modal } from '../../lib/modal.js'
import { listen } from '@tauri-apps/api/event'
import { createMarkdownEditor } from '../../lib/markdown-editor.js'
import { createTabs } from '../../lib/tabs.js'
import { createPagedList } from '../../lib/virtual-list.js'
import '../../style/virtual-list.css'

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

const META_AI_ACTIONS = [
  { value: 'generate', label: '直接生成' },
  { value: 'improve', label: '优化现有内容' },
  { value: 'rewrite', label: '重写现有内容' },
  { value: 'expand', label: '扩展现有内容' },
  { value: 'condense', label: '精简整理' },
]

function getMetaAiDefaultAction(currentContent) {
  return currentContent.trim() ? 'improve' : 'generate'
}

function getMetaAiConfirmText(action) {
  switch (action) {
    case 'improve': return '优化内容'
    case 'rewrite': return '重写内容'
    case 'expand': return '扩展内容'
    case 'condense': return '精简整理'
    default: return '直接生成'
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

  // 创建 Tabs 组件
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

  // 渲染列表
  renderMetaList(content, novelInfo)

  if (editingMeta) {
    renderEditor(content, novelInfo)
  }
}

function renderMetaList(content, novelInfo) {
  const listMount = content.querySelector('#meta-list-mount')

  // 销毁旧组件
  if (metaListComponent) {
    metaListComponent.destroy()
    metaListComponent = null
  }

  if (activeMetaTab === 'added') {
    // 已添加的元数据 - 使用分页加载
    metaListComponent = createPagedList({
      containerId: 'meta-added-list',
      pageSize: 20,
      loadMore: async (page, pageSize) => {
        const result = await api.listMetaPaged(novelInfo.id, page, pageSize)
        return {
          items: result.items,
          hasMore: result.has_more
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
          <div class="meta-item-header">
            <span class="meta-item-name">${meta.property_name}</span>
            <button class="list-item-delete-btn list-item-delete-btn-visible" data-action="delete-meta" data-meta-id="${meta.id}" aria-label="删除元数据">
              ${icon('delete', 14)}
            </button>
          </div>
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
    // 可添加的元数据 - 一次性加载（数量通常较少）
    const unaddedProps = metaProperties.filter(p => !metaDataList.find(m => m.property_name === p.property_name))

    metaListComponent = createPagedList({
      containerId: 'meta-available-list',
      pageSize: 50,
      loadMore: async (page, pageSize) => {
        const start = page * pageSize
        const end = start + pageSize
        const items = unaddedProps.slice(start, end)
        return {
          items: items,
          hasMore: end < unaddedProps.length
        }
      },
      renderItem: (prop) => {
        const div = document.createElement('div')
        div.className = 'meta-list-item'
        if (previewMetaProperty?.property_name === prop.property_name) {
          div.classList.add('active')
        }
        div.innerHTML = `
          <div class="meta-item-header">
            <span class="meta-item-name">${prop.property_name}</span>
            <button class="list-item-add-btn" data-action="add-meta" aria-label="添加元数据">${icon('plus', 12)}</button>
          </div>
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
          <p class="meta-editor-desc">${prop.property_description || '该元数据暂无详细描述。'}</p>
        </div>
      </div>
      <div class="meta-preview-note">
        <button id="add-preview-meta-btn" class="meta-preview-note__icon" aria-label="立即添加这个元数据">${icon('plus', 14)}</button>
        <div>
          <div class="meta-preview-note__title">立即添加这个元数据</div>
          <div class="meta-preview-note__desc">添加后，这个元数据会进入“已添加”列表，并可在这里继续编辑具体内容。</div>
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
  const currentContent = metaEditorInstance ? metaEditorInstance.getValue() : ''
  const defaultAction = getMetaAiDefaultAction(currentContent)
  const body = document.createElement('div')
  body.innerHTML = `
    <div class="meta-preview-note" style="margin-top: 0; margin-bottom: var(--space-md);">
      <div>
        <div class="meta-preview-note__title">${currentContent.trim() ? '将基于当前内容继续处理' : '当前内容为空，可直接生成初稿'}</div>
        <div class="meta-preview-note__desc">补充要求现在是可选项。你可以直接让 AI 生成、优化、重写或精简当前元数据内容。</div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">操作类型</label>
      <div class="meta-ai-actions">
        ${META_AI_ACTIONS.map(action => `
          <label class="meta-ai-action-option">
            <input type="radio" name="meta-ai-action" value="${action.value}" ${action.value === defaultAction ? 'checked' : ''}>
            <span>${action.label}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">补充要求（可选）</label>
      <textarea id="meta-ai-requirement" class="form-input" rows="6" placeholder="例如：更黑暗一点、加入更多权谋细节、语气更克制"></textarea>
    </div>
  `

  const modal = new Modal({
    title: `AI生成 - ${editingMeta.property_name}`,
    content: body,
    size: 'md',
    confirmText: getMetaAiConfirmText(defaultAction),
    cancelText: '取消',
    onConfirm: async (instance) => {
      const action = instance.contentEl.querySelector('input[name="meta-ai-action"]:checked')?.value || defaultAction
      const requirement = instance.contentEl.querySelector('#meta-ai-requirement')?.value?.trim() || ''
      const requestId = `meta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      activeMetaAiRequestId = requestId
      const currentEditorContent = metaEditorInstance ? metaEditorInstance.getValue() : ''
      metaAiOriginalContent = currentEditorContent
      instance.setLoading(true)
      try {
        metaAiGenerating = true
        updateMetaAiButtonState()
        if (metaEditorInstance) {
          metaEditorInstance.setValue('')
        }
        await api.aiGenerateMetaStream({
          requestId,
          novelId: novelInfo.id,
          propertyName: editingMeta.property_name,
          propertyDescription: metaProperties.find(p => p.property_name === editingMeta.property_name)?.property_description || '',
          action,
          currentContent: currentEditorContent,
          requirement,
        })
        instance.close({ action: 'confirm' })
      } catch (err) {
        metaAiGenerating = false
        activeMetaAiRequestId = null
        updateMetaAiButtonState()
        if (metaEditorInstance) {
          metaEditorInstance.setValue(metaAiOriginalContent)
        }
        toastError('AI生成失败: ' + err)
        instance.setLoading(false)
        return false
      }
    }
  })

  const syncConfirmText = () => {
    const action = modal.contentEl.querySelector('input[name="meta-ai-action"]:checked')?.value || defaultAction
    modal.setButtons([
      { text: '取消', type: 'default', onClick: () => modal.cancel() },
      { text: getMetaAiConfirmText(action), type: 'primary', onClick: () => modal.confirm() },
    ])
  }

  modal.open()
  setTimeout(() => {
    modal.contentEl.querySelectorAll('input[name="meta-ai-action"]').forEach(input => {
      input.addEventListener('change', syncConfirmText)
    })
  }, 0)
}

async function ensureMetaAiListeners() {
  if (metaAiUnlisteners.length > 0) return

  metaAiUnlisteners.push(
    await listen('meta-ai-stream-chunk', (event) => {
      const payload = event.payload
      if (!metaEditorInstance || !payload?.delta || payload.request_id !== activeMetaAiRequestId) return
      metaEditorInstance.setValue((metaEditorInstance.getValue() || '') + payload.delta)
    }),
    await listen('meta-ai-stream-done', (event) => {
      const payload = event.payload
      if (!metaEditorInstance || !payload || payload.request_id !== activeMetaAiRequestId) return
      metaEditorInstance.setValue(payload.content || '')
      activeMetaAiRequestId = null
      metaAiGenerating = false
      metaAiOriginalContent = ''
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
  editingMeta = null
  previewMetaProperty = null
  metaDataList = []
  metaProperties = []
  activeMetaAiRequestId = null
  metaAiGenerating = false
  metaAiOriginalContent = ''
  metaAiUnlisteners.forEach(fn => fn())
  metaAiUnlisteners = []
}
