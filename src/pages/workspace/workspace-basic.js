import { api, ENUMS } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'

export function render(content, novelInfo) {
  const styleOptions = Object.entries(ENUMS.NovelStyle)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.style == k ? 'selected' : ''}>${v}</option>`).join('')
  const statusOptions = Object.entries(ENUMS.NovelStatus)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.status == k ? 'selected' : ''}>${v}</option>`).join('')
  const lengthOptions = Object.entries(ENUMS.NovelLengthType)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.length_type == k ? 'selected' : ''}>${v}</option>`).join('')
  const audienceOptions = Object.entries(ENUMS.TargetAudience)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.target_audience == k ? 'selected' : ''}>${v}</option>`).join('')

  content.innerHTML = `
    <div class="basic-layout">
      <div class="card basic-form-card">
        <h3 class="card-title">${ICONS.edit} 基础信息</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">小说标题</label>
            <input id="novel-title" class="form-input" value="${novelInfo.title || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">小说状态</label>
            <select id="novel-status" class="form-input">${statusOptions}</select>
          </div>
          <div class="form-group full-width">
            <label class="form-label">小说简介</label>
            <textarea id="novel-desc" class="form-input" rows="4">${novelInfo.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">小说风格</label>
            <select id="novel-style" class="form-input">${styleOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">篇幅类型</label>
            <select id="novel-length" class="form-input">${lengthOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">目标读者</label>
            <select id="novel-audience" class="form-input">${audienceOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">预估章节数</label>
            <input id="novel-chapters" class="form-input" type="number" value="${novelInfo.estimated_chapter_count || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">预估总字数</label>
            <input id="novel-words" class="form-input" type="number" value="${novelInfo.estimated_total_word_count || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">每章字数</label>
            <input id="novel-words-per-chapter" class="form-input" type="number" value="${novelInfo.estimated_words_per_chapter || ''}" />
          </div>
        </div>
        <div class="flex justify-end mt-lg">
          <button id="save-basic-btn" class="btn btn-primary">${ICONS.save}<span>保存基础信息</span></button>
        </div>
      </div>
      
      <div class="card settings-card">
        <h3 class="card-title">${ICONS.settings} 写作设置</h3>
        <div class="settings-grid">
          <div class="form-group">
            <label class="form-label">叙事视角</label>
            <select id="setting-perspective" class="form-input">
              <option>第一人称</option>
              <option selected>第三人称</option>
              <option>全知视角</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">写作风格</label>
            <select id="setting-style" class="form-input">
              <option>严肃深沉</option>
              <option selected>轻松幽默</option>
              <option>诗意唯美</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">节奏控制</label>
            <select id="setting-pacing" class="form-input">
              <option>慢节奏</option>
              <option selected>快节奏</option>
              <option>张弛有度</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">难度等级</label>
            <select id="setting-difficulty" class="form-input">
              <option>简单</option>
              <option selected>中等</option>
              <option>复杂</option>
            </select>
          </div>
        </div>
        
        <h4 class="card-subtitle mt-lg">主题与冲突</h4>
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">主题思想</label>
            <input id="setting-theme" class="form-input" value="${novelInfo.settings?.theme || ''}" placeholder="例如：探索与成长" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">核心冲突</label>
            <input id="setting-conflict" class="form-input" value="${novelInfo.settings?.conflict || ''}" placeholder="例如：人与自然的对抗" />
          </div>
        </div>
      </div>
    </div>
  `

  content.querySelector('#save-basic-btn')?.addEventListener('click', async () => {
    const data = {
      id: novelInfo.id,
      title: content.querySelector('#novel-title').value,
      description: content.querySelector('#novel-desc').value,
      status: parseInt(content.querySelector('#novel-status').value),
      style: parseInt(content.querySelector('#novel-style').value),
      lengthType: parseInt(content.querySelector('#novel-length').value),
      targetAudience: parseInt(content.querySelector('#novel-audience').value),
      estimatedChapterCount: parseInt(content.querySelector('#novel-chapters').value) || null,
      estimatedTotalWordCount: parseInt(content.querySelector('#novel-words').value) || null,
      estimatedWordsPerChapter: parseInt(content.querySelector('#novel-words-per-chapter').value) || null,
    }
    try {
      await api.updateNovel(data)
      toastSuccess('保存成功')
    } catch (e) {
      toastError('保存失败: ' + e.message)
    }
  })
}

export function cleanup() {
}
