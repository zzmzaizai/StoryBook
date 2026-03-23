import { api } from '../api/tauri.js';
import { store } from '../state/store.js';

export async function renderNovelList(root, rerender) {
  root.innerHTML = `
    <div class="page">
      <div class="page-header glass">
        <h1>小说列表</h1>
        <div class="toolbar">
          <input id="new-novel-title" class="input" placeholder="输入小说名称" />
          <button id="create-novel-btn" class="btn primary">新建小说</button>
        </div>
      </div>
      <div id="novel-grid" class="novel-grid"></div>
      <div class="pager">
        <button id="prev-page" class="btn">上一页</button>
        <span id="page-info">第 1 页</span>
        <button id="next-page" class="btn">下一页</button>
      </div>
    </div>
  `;

  let page = 0;
  const pageSize = 9;

  async function load() {
    const list = await api.listNovels(page, pageSize);
    const grid = root.querySelector('#novel-grid');
    grid.innerHTML = list.map(item => `
      <div class="novel-card glass" data-id="${item.id}">
        <div class="novel-cover"></div>
        <div class="novel-meta">
          <h3>${item.title}</h3>
          <p>${item.summary || '暂无简介'}</p>
        </div>
      </div>
    `).join('');

    root.querySelector('#page-info').textContent = `第 ${page + 1} 页`;

    grid.querySelectorAll('.novel-card').forEach(card => {
      card.addEventListener('click', () => {
        store.currentNovelId = Number(card.dataset.id);
        store.route = 'workspace';
        rerender();
      });
    });
  }

  root.querySelector('#create-novel-btn').addEventListener('click', async () => {
    const title = root.querySelector('#new-novel-title').value.trim();
    if (!title) return;
    await api.createNovel(title);
    root.querySelector('#new-novel-title').value = '';
    await load();
  });

  root.querySelector('#prev-page').addEventListener('click', async () => {
    if (page > 0) {
      page--;
      await load();
    }
  });

  root.querySelector('#next-page').addEventListener('click', async () => {
    page++;
    await load();
  });

  await load();
}
