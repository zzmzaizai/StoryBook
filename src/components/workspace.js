import { store } from '../state/store.js';
import { api } from '../api/tauri.js';

export async function renderWorkspace(root, rerender) {
  let novelInfo = null;
  if (store.currentNovelId) {
    novelInfo = await api.getNovel(store.currentNovelId);
  }

  root.innerHTML = `
    <div class="page">
      <div class="page-header glass">
        <h1>工作台</h1>
      </div>

      <div class="workspace-grid">
        <div class="dashboard-card glass">
          <h3>当前小说</h3>
          <p>${novelInfo ? novelInfo.title : '未选择小说'}</p>
          ${novelInfo ? `<p class="novel-summary">${novelInfo.summary || '暂无简介'}</p>` : ''}
        </div>
        <div class="dashboard-card glass">
          <h3>章节管理</h3>
          <button class="btn primary" id="go-chapters">进入章节</button>
        </div>
        <div class="dashboard-card glass">
          <h3>角色管理</h3>
          <button class="btn primary" id="go-characters">进入角色</button>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#go-chapters').addEventListener('click', () => {
    store.route = 'chapters';
    rerender();
  });

  root.querySelector('#go-characters').addEventListener('click', () => {
    store.route = 'characters';
    rerender();
  });
}
