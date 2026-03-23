import { api, ENUMS } from '../api/tauri.js'
import { store } from '../state/store.js'
import { navigate } from '../router.js'
import { ICONS } from '../lib/icons.js'
import { confirm } from '../lib/modal.js'
import { toastSuccess, toastError } from '../lib/toast.js'
import { createPagedList } from '../lib/virtual-list.js'
import '../style/virtual-list.css'

let searchKeyword = ''
let selectedCharacterId = null
let isCreating = false
let charactersList = []
let characterListComponent = null

export async function render() {
  const el = document.createElement('div')
  el.className = 'page'

  const novelId = store.currentNovelId

  if (!novelId) {
    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">角色管理</h1>
        <p class="page-subtitle">管理小说角色</p>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.characters}</div>
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
      <h1 class="page-title">角色</h1>
      <p class="page-subtitle">正在管理"${store.currentNovelName || '未知'}"小说角色内容</p>
    </div>

    <div class="characters-layout">
      <div class="card character-list-card">
        <div class="character-list-header">
          <h3 class="card-title">${ICONS.characters} 角色列表</h3>
          <span class="character-count" id="character-count">加载中...</span>
        </div>

        <div class="character-toolbar">
          <button id="create-character-btn" class="btn btn-primary btn-sm">${ICONS.plus}</button>
          <div class="search-box search-box-sm">
            <span class="search-icon">${ICONS.search}</span>
            <input id="search-character" class="search-input" placeholder="搜索角色..." value="${searchKeyword}" />
          </div>
        </div>

        <div id="character-list-mount" class="character-list-mount"></div>
      </div>

      <div class="card character-editor-card">
        <div id="character-editor"></div>
      </div>
    </div>
  `

  // 创建分页列表
  const listMount = el.querySelector('#character-list-mount')
  characterListComponent = createPagedList({
    containerId: 'character-list',
    pageSize: 20,
    loadMore: async (page, pageSize) => {
      const result = await api.listCharacters(store.currentNovelId, page, pageSize)
      // 更新总数显示
      const countEl = el.querySelector('#character-count')
      if (countEl) {
        countEl.textContent = `共 ${result.total_count} 人`
      }
      return {
        items: result.items,
        hasMore: result.has_more
      }
    },
    renderItem: (item) => {
      const div = document.createElement('div')
      div.className = `character-list-item ${selectedCharacterId === item.id ? 'active' : ''}`
      div.dataset.id = item.id
      const displayName = item.nickname 
        ? `${item.name || '未命名'}（${item.nickname}）` 
        : (item.name || '未命名')
      div.innerHTML = `
        <div class="character-item-header">
          <div class="character-item-name">${displayName}</div>
        </div>
        <div class="character-item-meta">
          <span class="badge badge-sm">${ENUMS.CharacterRoleAttribute[item.role_attribute] || '角色'}</span>
          <span class="badge badge-sm badge-secondary">${ENUMS.CharacterGender[item.gender] || '未知'}</span>
          <span class="badge badge-sm badge-secondary">${ENUMS.CharacterType[item.character_type] || '人类'}</span>
          ${item.age ? `<span class="badge badge-sm badge-secondary">${item.age}岁</span>` : ''}
          <span class="character-item-spacer"></span>
          <button class="list-item-delete-btn" data-action="delete" data-id="${item.id}" title="删除">
            ${ICONS.delete}
          </button>
        </div>
      `
      
      const deleteBtn = div.querySelector('[data-action="delete"]')
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation()
          await handleDeleteCharacter(item.id, document.querySelector('.page'))
        })
      }
      
      return div
    },
    onItemClick: (item, index, el) => {
      selectedCharacterId = item.id
      isCreating = false

      const listContainer = el.closest('.paged-list-content')
      if (listContainer) {
        listContainer.querySelectorAll('.character-list-item').forEach(i => i.classList.remove('active'))
        el.querySelector('.character-list-item')?.classList.add('active')
      }

      renderCharacterEditor(document.querySelector('.page'))
    },
    emptyText: '暂无角色'
  })
  listMount.appendChild(characterListComponent.element)

  el.querySelector('#create-character-btn')?.addEventListener('click', () => {
    isCreating = true
    selectedCharacterId = null
    renderCharacterEditor(el)
  })

  el.querySelector('#search-character')?.addEventListener('input', (e) => {
    searchKeyword = e.target.value
    // 搜索功能需要重新加载
    characterListComponent.refresh()
  })

  // 初始加载时如果有数据，选中第一个
  setTimeout(async () => {
    if (!selectedCharacterId && !isCreating) {
      const result = await api.listCharacters(store.currentNovelId, 0, 1)
      if (result.items && result.items.length > 0) {
        selectedCharacterId = result.items[0].id
        renderCharacterEditor(el)
      }
    }
  }, 100)

  return el
}

async function renderCharacterEditor(root) {
  const editorEl = root.querySelector('#character-editor')

  if (isCreating) {
    editorEl.innerHTML = `
      <div class="character-editor-header">
        <h3 class="card-title">创建角色</h3>
        <div class="character-editor-actions">
          <button id="save-character-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
        </div>
      </div>

      <div class="form-grid mb-lg">
        <div class="form-group">
          <label class="form-label">角色名称 *</label>
          <input id="character-name" class="form-input" placeholder="输入角色名称" />
        </div>
        <div class="form-group">
          <label class="form-label">角色昵称</label>
          <input id="character-nickname" class="form-input" placeholder="输入角色昵称" />
        </div>
        <div class="form-group">
          <label class="form-label">角色属性</label>
          <select id="character-role" class="form-input">
            ${Object.entries(ENUMS.CharacterRoleAttribute).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">性别</label>
          <select id="character-gender" class="form-input">
            ${Object.entries(ENUMS.CharacterGender).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">角色类型</label>
          <select id="character-type" class="form-input">
            ${Object.entries(ENUMS.CharacterType).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">年龄</label>
          <input id="character-age" class="form-input" placeholder="输入年龄" />
        </div>
      </div>

      <div class="form-group mb-lg">
        <label class="form-label">性格特点</label>
        <textarea id="character-personality" class="form-input" rows="4" placeholder="描述角色的性格特点..."></textarea>
      </div>
    `

    editorEl.querySelector('#save-character-btn')?.addEventListener('click', async () => {
      const name = editorEl.querySelector('#character-name').value.trim()
      if (!name) {
        toastError('请输入角色名称')
        return
      }

      try {
        const newCharacter = await api.createCharacter(store.currentNovelId, name)

        const nickname = editorEl.querySelector('#character-nickname').value.trim() || null
        const age = editorEl.querySelector('#character-age').value.trim() || null
        const personality = editorEl.querySelector('#character-personality').value.trim() || null
        const roleAttribute = parseInt(editorEl.querySelector('#character-role').value)
        const gender = parseInt(editorEl.querySelector('#character-gender').value)
        const characterType = parseInt(editorEl.querySelector('#character-type').value)

        await api.saveCharacter(
          newCharacter.id,
          name,
          nickname,
          age,
          personality,
          roleAttribute,
          gender,
          characterType,
          0
        )

        isCreating = false
        selectedCharacterId = newCharacter.id
        characterListComponent.refresh()
        toastSuccess('角色创建成功！')
      } catch (e) {
        console.error('创建角色失败:', e)
        toastError('创建失败: ' + e)
      }
    })
    return
  }

  const character = selectedCharacterId ? await api.getCharacter(selectedCharacterId) : null

  if (!character) {
    editorEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.characters}</div>
        <div class="empty-state-title">选择角色</div>
        <div class="empty-state-desc">从左侧列表选择角色进行编辑</div>
      </div>
    `
    return
  }

  const roleOptions = Object.entries(ENUMS.CharacterRoleAttribute)
    .map(([k, v]) => `<option value="${k}" ${character.role_attribute == k ? 'selected' : ''}>${v}</option>`).join('')
  const genderOptions = Object.entries(ENUMS.CharacterGender)
    .map(([k, v]) => `<option value="${k}" ${character.gender == k ? 'selected' : ''}>${v}</option>`).join('')
  const typeOptions = Object.entries(ENUMS.CharacterType)
    .map(([k, v]) => `<option value="${k}" ${character.character_type == k ? 'selected' : ''}>${v}</option>`).join('')

  editorEl.innerHTML = `
    <div class="character-editor-header">
      <h3 class="card-title">${character.name}</h3>
      <div class="character-editor-actions">
        <button id="save-character-btn" class="btn btn-primary">${ICONS.save}<span>保存</span></button>
      </div>
    </div>

    <div class="character-info-bar">
      <div class="character-info-item">
        <span class="character-info-label">属性</span>
        <span class="badge">${ENUMS.CharacterRoleAttribute[character.role_attribute] || '角色'}</span>
      </div>
      <div class="character-info-item">
        <span class="character-info-label">性别</span>
        <span>${ENUMS.CharacterGender[character.gender] || '未知'}</span>
      </div>
      <div class="character-info-item">
        <span class="character-info-label">年龄</span>
        <span>${character.age || '未知'}</span>
      </div>
      <div class="character-info-item">
        <span class="character-info-label">类型</span>
        <span>${ENUMS.CharacterType[character.character_type] || '人类'}</span>
      </div>
    </div>

    <div class="form-grid mb-lg">
      <div class="form-group">
        <label class="form-label">角色名称 *</label>
        <input id="character-name" class="form-input" value="${character.name || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">角色昵称</label>
        <input id="character-nickname" class="form-input" value="${character.nickname || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">角色属性</label>
        <select id="character-role" class="form-input">${roleOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">性别</label>
        <select id="character-gender" class="form-input">${genderOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">角色类型</label>
        <select id="character-type" class="form-input">${typeOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">年龄</label>
        <input id="character-age" class="form-input" value="${character.age || ''}" />
      </div>
    </div>

    <div class="form-group mb-lg">
      <label class="form-label">性格特点</label>
      <textarea id="character-personality" class="form-input" rows="4">${character.personality || ''}</textarea>
    </div>
  `

  editorEl.querySelector('#save-character-btn')?.addEventListener('click', async () => {
    try {
      const name = editorEl.querySelector('#character-name').value.trim()
      if (!name) {
        toastError('请输入角色名称')
        return
      }

      const nickname = editorEl.querySelector('#character-nickname').value.trim() || null
      const age = editorEl.querySelector('#character-age').value.trim() || null
      const personality = editorEl.querySelector('#character-personality').value.trim() || null
      const roleAttribute = parseInt(editorEl.querySelector('#character-role').value)
      const gender = parseInt(editorEl.querySelector('#character-gender').value)
      const characterType = parseInt(editorEl.querySelector('#character-type').value)

      await api.saveCharacter(
        character.id,
        name,
        nickname,
        age,
        personality,
        roleAttribute,
        gender,
        characterType,
        character.sort_order || 0
      )

      toastSuccess('保存成功！')
      characterListComponent.refresh()
    } catch (e) {
      console.error('保存角色失败:', e)
      toastError('保存失败: ' + e)
    }
  })
}

async function handleDeleteCharacter(id, root) {
  const result = await confirm('确定删除此角色？', '删除确认')
  if (result) {
    try {
      await api.deleteCharacter(id)

      if (selectedCharacterId === id) {
        selectedCharacterId = null
        renderCharacterEditor(root)
      }

      characterListComponent.refresh()
      toastSuccess('删除成功！')
    } catch (e) {
      console.error('删除角色失败:', e)
      toastError('删除失败: ' + e)
    }
  }
}

function getAvatarColor(id) {
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981', '#06B6D4', '#6366F1']
  return colors[id % colors.length]
}

export function cleanup() {
  if (characterListComponent) {
    characterListComponent.destroy()
    characterListComponent = null
  }
  searchKeyword = ''
  selectedCharacterId = null
  isCreating = false
  charactersList = []
}
