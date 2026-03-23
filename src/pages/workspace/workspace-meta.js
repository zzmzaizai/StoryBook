import { api } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { confirm } from '../../lib/modal.js'
import { createMarkdownEditor } from '../../lib/markdown-editor.js'
import { createTabs } from '../../lib/tabs.js'
import { createPagedList } from '../../lib/virtual-list.js'
import '../../style/virtual-list.css'

let activeMetaTab = 'added'
let editingMeta = null
let metaDataList = []
let metaProperties = []
let metaEditorInstance = null
let metaTabsComponent = null
let metaListComponent = null

export async function loadMeta(novelId) {
  try {
    metaProperties = await api.getNovelMetaProperties()
  } catch (e) {
    console.error('加载元数据属性失败:', e)
    metaProperties = []
  }
  return { metaProperties }
}

export function getMetaDataList() {
  return metaDataList
}

export async function render(content, novelInfo) {
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
      { key: 'added', label: `已添加`, color: '#10b981' },
      { key: 'available', label: `可添加`, color: '#6366f1' }
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
        div.innerHTML = `
          <div class="meta-item-header">
            <span class="meta-item-name">${meta.property_name}</span>
            <button class="btn-icon btn-icon-danger" data-action="delete-meta" data-meta-id="${meta.id}">
              ${ICONS.delete}
            </button>
          </div>
          <p class="meta-item-preview">${(meta.property_value || '').substring(0, 50)}${(meta.property_value || '').length > 50 ? '...' : ''}</p>
        `
        return div
      },
      onItemClick: (meta, index, el) => {
        // 处理删除按钮点击
        const deleteBtn = el.querySelector('[data-action="delete-meta"]')
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            const confirmed = await confirm('确定要删除这个元数据吗？', '删除确认')
            if (confirmed) {
              try {
                await api.deleteMeta(meta.id)
                metaDataList = metaDataList.filter(m => m.id !== meta.id)
                toastSuccess('删除成功')
                // 刷新列表
                metaListComponent.refresh()
              } catch (err) {
                toastError('删除失败: ' + err.message)
              }
            }
          })
        }

        // 选中编辑
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
        div.innerHTML = `
          <div class="meta-item-header">
            <span class="meta-item-name">${prop.property_name}</span>
            <button class="btn-icon" data-action="add-meta">${ICONS.plus}</button>
          </div>
          <p class="meta-item-preview">${prop.property_description || ''}</p>
        `
        return div
      },
      onItemClick: (prop, index, el) => {
        // 处理添加按钮点击
        const addBtn = el.querySelector('[data-action="add-meta"]')
        if (addBtn) {
          addBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            try {
              await api.createMeta(novelInfo.id, prop.property_name, '')
              const newMetaList = await api.listMeta(novelInfo.id)
              metaDataList = newMetaList
              activeMetaTab = 'added'
              editingMeta = metaDataList.find(m => m.property_name === prop.property_name)

              // 重新渲染整个页面
              render(content, novelInfo)
              if (editingMeta) {
                renderEditor(content, novelInfo)
              }
              toastSuccess('添加成功')
            } catch (err) {
              toastError('添加失败: ' + err.message)
            }
          })
        }
      },
      emptyText: '所有元数据已添加'
    })
  }

  listMount.appendChild(metaListComponent.element)
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
    toastSuccess('AI生成功能开发中...')
  })
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
  metaDataList = []
  metaProperties = []
}
