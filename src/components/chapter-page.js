import { api } from '../api/tauri.js';
import { store } from '../state/store.js';

export async function renderChapterPage(root, rerender) {
  if (!store.currentNovelId) {
    root.innerHTML = `
      <div class="page">
        <div class="page-header glass">
          <h1>章节管理</h1>
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
        <h1>章节管理</h1>
      </div>
      <div class="split-container">
        <div class="split-left glass">
          <div class="list-header">
            <input id="new-chapter-title" class="input" placeholder="新章节标题" />
            <button id="create-chapter-btn" class="btn primary">添加</button>
          </div>
          <div id="chapter-list" class="scroll-list"></div>
        </div>
        <div class="split-right glass">
          <div id="chapter-editor" class="editor-container">
            <p class="placeholder">选择左侧章节进行编辑</p>
          </div>
        </div>
      </div>
    </div>
  `;

  let page = 0;
  const pageSize = 20;
  let loading = false;
  let hasMore = true;

  async function loadChapters(append = false) {
    if (loading || !hasMore) return;
    loading = true;

    const list = await api.listChapters(store.currentNovelId, page, pageSize);
    const listEl = root.querySelector('#chapter-list');

    if (list.length < pageSize) {
      hasMore = false;
    }

    const html = list.map(item => `
      <div class="list-item ${store.currentChapterId === item.id ? 'active' : ''}" data-id="${item.id}">
        <span class="item-title">${item.title}</span>
        <span class="item-date">${new Date(item.updated_at).toLocaleDateString()}</span>
      </div>
    `).join('');

    if (append) {
      listEl.insertAdjacentHTML('beforeend', html);
    } else {
      listEl.innerHTML = html;
    }

    listEl.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('click', async () => {
        store.currentChapterId = Number(item.dataset.id);
        listEl.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        await loadChapterEditor();
      });
    });

    loading = false;
  }

  async function loadChapterEditor() {
    const editorEl = root.querySelector('#chapter-editor');
    const chapter = await api.getChapter(store.currentChapterId);

    if (!chapter) {
      editorEl.innerHTML = '<p class="placeholder">章节不存在</p>';
      return;
    }

    editorEl.innerHTML = `
      <div class="editor-header">
        <input id="chapter-title-input" class="input" value="${chapter.title}" />
        <button id="save-chapter-btn" class="btn primary">保存</button>
        <button id="delete-chapter-btn" class="btn danger">删除</button>
      </div>
      <div class="editor-body">
        <div class="form-group">
          <label>章节摘要</label>
          <textarea id="chapter-summary" class="textarea" rows="3">${chapter.summary || ''}</textarea>
        </div>
        <div class="form-group">
          <label>章节内容</label>
          <textarea id="chapter-content" class="textarea content-editor" rows="20">${chapter.content || ''}</textarea>
        </div>
      </div>
    `;

    editorEl.querySelector('#save-chapter-btn').addEventListener('click', async () => {
      const title = editorEl.querySelector('#chapter-title-input').value.trim();
      const summary = editorEl.querySelector('#chapter-summary').value;
      const content = editorEl.querySelector('#chapter-content').value;

      if (!title) return;

      await api.saveChapter({
        id: store.currentChapterId,
        title,
        summary,
        content,
      });

      await loadChapters();
    });

    editorEl.querySelector('#delete-chapter-btn').addEventListener('click', async () => {
      if (confirm('确定删除此章节？')) {
        await api.deleteChapter(store.currentChapterId);
        store.currentChapterId = null;
        await loadChapters();
        editorEl.innerHTML = '<p class="placeholder">选择左侧章节进行编辑</p>';
      }
    });
  }

  const listEl = root.querySelector('#chapter-list');
  listEl.addEventListener('scroll', async () => {
    if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 50) {
      if (hasMore && !loading) {
        page++;
        await loadChapters(true);
      }
    }
  });

  root.querySelector('#create-chapter-btn').addEventListener('click', async () => {
    const title = root.querySelector('#new-chapter-title').value.trim();
    if (!title) return;
    await api.createChapter(store.currentNovelId, title);
    root.querySelector('#new-chapter-title').value = '';
    page = 0;
    hasMore = true;
    await loadChapters();
  });

  await loadChapters();
}
