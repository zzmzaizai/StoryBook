import { api } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'
import { confirm } from '../../lib/modal.js'
import { createMarkdownEditor } from '../../lib/markdown-editor.js'

let activeMetaTab = 'added'
let editingMeta = null
let metaDataList = []
let metaProperties = []
let metaEditorInstance = null

export async function loadMeta(novelId) {
  try {
    metaDataList = await api.listMeta(novelId)
  } catch (e) {
    console.error('加载元数据失败:', e)
    metaDataList = []
  }
  try {
    metaProperties = await api.getNovelMetaProperties()
  } catch (e) {
    console.error('加载元数据属性失败:', e)
    metaProperties = []
  }
  return { metaDataList, metaProperties }
}

export function getMetaDataList() {
  return metaDataList
}

export async function render(content, novelInfo) {
  const metas = metaDataList
  const unaddedProps = metaProperties.filter(p => !metas.find(m => m.property_name === p.property_name))

  content.innerHTML = `
    <div class="meta-layout">
      <div class="card meta-list-card">
        <div class="meta-tabs">
          <button class="meta-tab ${activeMetaTab === 'added' ? 'active' : ''}" data-meta-tab="added">已添加 (${metas.length})</button>
          <button class="meta-tab ${activeMetaTab === 'available' ? 'active' : ''}" data-meta-tab="available">可添加 (${unaddedProps.length})</button>
        </div>
        
        <div id="meta-list-content" class="meta-list-content"></div>
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

  const listContent = content.querySelector('#meta-list-content')
  
  if (activeMetaTab === 'added') {
    listContent.innerHTML = metas.length === 0 ? `
      <div class="text-center text-tertiary p-lg">暂无元数据</div>
    ` : metas.map(meta => `
      <div class="meta-item" data-meta-id="${meta.id}">
        <div class="meta-item-header">
          <span class="meta-item-name">${meta.property_name}</span>
          <button class="btn-icon btn-icon-danger" data-action="delete-meta" data-meta-id="${meta.id}">
            ${ICONS.delete}
          </button>
        </div>
        <p class="meta-item-preview">${(meta.property_value || '').substring(0, 50)}...</p>
      </div>
    `).join('')
  } else {
    listContent.innerHTML = unaddedProps.length === 0 ? `
      <div class="text-center text-tertiary p-lg">所有元数据已添加</div>
    ` : unaddedProps.map(prop => `
      <div class="meta-item meta-item-addable" data-prop-name="${prop.property_name}">
        <div class="meta-item-header">
          <span class="meta-item-name">${prop.property_name}</span>
          <button class="btn-icon" data-action="add-meta">${ICONS.plus}</button>
        </div>
        <p class="meta-item-desc">${prop.property_description}</p>
      </div>
    `).join('')
  }

  content.querySelectorAll('.meta-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeMetaTab = tab.dataset.metaTab
      content.querySelectorAll('.meta-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      render(content, novelInfo)
    })
  })

  listContent.querySelectorAll('.meta-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('[data-action="delete-meta"]')) {
        const metaId = Number(e.target.closest('[data-action="delete-meta"]').dataset.metaId)
        const confirmed = await confirm('确定要删除这个元数据吗？', '删除确认')
        if (confirmed) {
          try {
            await api.deleteMeta(metaId)
            metaDataList = metaDataList.filter(m => m.id !== metaId)
            toastSuccess('删除成功')
            render(content, novelInfo)
          } catch (err) {
            toastError('删除失败: ' + err.message)
          }
        }
        return
      }
      
      if (e.target.closest('[data-action="add-meta"]')) {
        const propName = item.dataset.propName
        try {
          await api.createMeta(novelInfo.id, propName, '')
          metaDataList = await api.listMeta(novelInfo.id)
          activeMetaTab = 'added'
          editingMeta = metaDataList.find(m => m.property_name === propName)
          render(content, novelInfo)
          if (editingMeta) {
            renderEditor(content, novelInfo)
          }
        } catch (err) {
          toastError('添加失败: ' + err.message)
        }
        return
      }
      
      const metaId = Number(item.dataset.metaId)
      editingMeta = metas.find(m => m.id === metaId)
      if (editingMeta) {
        renderEditor(content, novelInfo)
      }
    })
  })

  if (editingMeta) {
    renderEditor(content, novelInfo)
  }
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
  activeMetaTab = 'added'
  editingMeta = null
  metaDataList = []
  metaProperties = []
}
