import { api } from '../api/tauri.js';
import { store } from '../state/store.js';

export async function renderCharacterPage(root, rerender) {
  if (!store.currentNovelId) {
    root.innerHTML = `
      <div class="page">
        <div class="page-header glass">
          <h1>角色管理</h1>
        </div>
        <div class="empty-state glass">
          <p>请先从小说列表选择一个小说</p>
          <button class="btn primary" id="go-novels">选择小说</button>
        </div>
      </div>
    `;
    root.querySelector('#go-novels').addEventListener('click', () => {
      store.route = 'novels';
      rerender();
    });
    return;
  }

  root.innerHTML = `
    <div class="page split-page">
      <div class="page-header glass">
        <h1>角色管理</h1>
      </div>
      <div class="split-container">
        <div class="split-left glass">
          <div class="list-header">
            <input id="new-character-name" class="input" placeholder="新角色名称" />
            <button id="create-character-btn" class="btn primary">添加</button>
          </div>
          <div id="character-list" class="scroll-list"></div>
        </div>
        <div class="split-right glass">
          <div id="character-editor" class="editor-container">
            <p class="placeholder">选择左侧角色进行编辑</p>
          </div>
        </div>
      </div>
    </div>
  `;

  let page = 0;
  const pageSize = 20;
  let loading = false;
  let hasMore = true;

  async function loadCharacters(append = false) {
    if (loading || !hasMore) return;
    loading = true;

    const list = await api.listCharacters(store.currentNovelId, page, pageSize);
    const listEl = root.querySelector('#character-list');

    if (list.length < pageSize) {
      hasMore = false;
    }

    const html = list.map(item => `
      <div class="list-item ${store.currentCharacterId === item.id ? 'active' : ''}" data-id="${item.id}">
        <div class="character-avatar">${item.name.charAt(0)}</div>
        <div class="character-info">
          <span class="item-title">${item.name}</span>
          <span class="item-desc">${item.description || '暂无描述'}</span>
        </div>
      </div>
    `).join('');

    if (append) {
      listEl.insertAdjacentHTML('beforeend', html);
    } else {
      listEl.innerHTML = html;
    }

    listEl.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', async () => {
        store.currentCharacterId = Number(item.dataset.id);
        listEl.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        await loadCharacterEditor();
      });
    });

    loading = false;
  }

  async function loadCharacterEditor() {
    const editorEl = root.querySelector('#character-editor');
    const character = await api.getCharacter(store.currentCharacterId);

    if (!character) {
      editorEl.innerHTML = '<p class="placeholder">角色不存在</p>';
      return;
    }

    editorEl.innerHTML = `
      <div class="editor-header">
        <input id="character-name-input" class="input" value="${character.name}" />
        <button id="save-character-btn" class="btn primary">保存</button>
        <button id="delete-character-btn" class="btn danger">删除</button>
      </div>
      <div class="editor-body">
        <div class="form-group">
          <label>头像 URL</label>
          <input id="character-avatar" class="input" value="${character.avatar || ''}" />
        </div>
        <div class="form-group">
          <label>角色描述</label>
          <textarea id="character-description" class="textarea" rows="3">${character.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>性格特点</label>
          <textarea id="character-personality" class="textarea" rows="3">${character.personality || ''}</textarea>
        </div>
        <div class="form-group">
          <label>背景故事</label>
          <textarea id="character-background" class="textarea" rows="5">${character.background || ''}</textarea>
        </div>
      </div>
    `;

    editorEl.querySelector('#save-character-btn').addEventListener('click', async () => {
      const name = editorEl.querySelector('#character-name-input').value.trim();
      const avatar = editorEl.querySelector('#character-avatar').value;
      const description = editorEl.querySelector('#character-description').value;
      const personality = editorEl.querySelector('#character-personality').value;
      const background = editorEl.querySelector('#character-background').value;

      if (!name) return;

      await api.saveCharacter({
        id: store.currentCharacterId,
        name,
        avatar,
        description,
        personality,
        background,
      });

      await loadCharacters();
    });

    editorEl.querySelector('#delete-character-btn').addEventListener('click', async () => {
      if (confirm('确定删除此角色？')) {
        await api.deleteCharacter(store.currentCharacterId);
        store.currentCharacterId = null;
        await loadCharacters();
        editorEl.innerHTML = '<p class="placeholder">选择左侧角色进行编辑</p>';
      }
    });
  }

  const listEl = root.querySelector('#character-list');
  listEl.addEventListener('scroll', async () => {
    if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 50) {
      if (hasMore && !loading) {
        page++;
        await loadCharacters(true);
      }
    }
  });

  root.querySelector('#create-character-btn').addEventListener('click', async () => {
    const name = root.querySelector('#new-character-name').value.trim();
    if (!name) return;
    await api.createCharacter(store.currentNovelId, name);
    root.querySelector('#new-character-name').value = '';
    page = 0;
    hasMore = true;
    await loadCharacters();
  });

  await loadCharacters();
}
