import { api } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
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
            <div class="empty-state-icon">${ICONS.meta}</div>
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
      { key: 'available', label: `可添加(${unaddedProps.length})`, icon: ICONS.plus, color: '#6366f1' }
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
              ${ICONS.delete}
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
                    <div class="empty-state-icon">${ICONS.meta}</div>
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
        // 选中编辑
        previewMetaProperty = null
        editingMeta = meta
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
            <button class="list-item-add-btn" data-action="add-meta" aria-label="添加元数据">${ICONS.plus}</button>
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
        <button id="add-preview-meta-btn" class="meta-preview-note__icon" aria-label="立即添加这个元数据">${ICONS.plus}</button>
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
        <button id="ai-generate-btn" class="btn btn-secondary">${ICONS.sparkles}<span>AI生成</span></button>
        <button id="save-meta-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
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
  const body = document.createElement('div')
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">补充要求</label>
      <textarea id="meta-ai-requirement" class="form-input" rows="6" placeholder="输入你希望 AI 如何生成或修改这段元数据..."></textarea>
    </div>
  `

  const modal = new Modal({
    title: `AI生成 - ${editingMeta.property_name}`,
    content: body,
    size: 'md',
    confirmText: '确定生成',
    cancelText: '取消',
    onConfirm: async (instance) => {
      const requirement = instance.contentEl.querySelector('#meta-ai-requirement')?.value?.trim() || ''
      if (!requirement) return false

      const requestId = `meta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      activeMetaAiRequestId = requestId
      if (metaEditorInstance) {
        metaEditorInstance.setValue('')
      }
      instance.setLoading(true)
      try {
        await api.aiGenerateMetaStream({
          requestId,
          novelId: novelInfo.id,
          propertyName: editingMeta.property_name,
          propertyDescription: metaProperties.find(p => p.property_name === editingMeta.property_name)?.property_description || '',
          currentContent: metaEditorInstance ? metaEditorInstance.getValue() : '',
          requirement,
        })
      } catch (err) {
        toastError('AI生成失败: ' + err)
        instance.setLoading(false)
        return false
      }
    }
  })

  modal.open()
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
      toastSuccess('AI生成完成')
    }),
    await listen('meta-ai-stream-error', (event) => {
      const payload = event.payload
      if (payload?.request_id !== activeMetaAiRequestId) return
      activeMetaAiRequestId = null
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
  metaAiUnlisteners.forEach(fn => fn())
  metaAiUnlisteners = []
}
