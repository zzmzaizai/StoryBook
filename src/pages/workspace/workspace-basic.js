import { api, ENUMS } from '../../api/tauri.js'
import { ICONS } from '../../lib/icons.js'
import { toastSuccess, toastError } from '../../lib/toast.js'

export function render(content, novelInfo) {
  const totalWords = novelInfo.total_word_count || 0
  const estimatedTotalWords = novelInfo.estimated_total_word_count || 0
  const progressRatio = estimatedTotalWords > 0
    ? Math.min(100, Math.round((totalWords / estimatedTotalWords) * 100))
    : 0
  const styleName = ENUMS.NovelStyle[novelInfo.style] || '都市'
  const lengthName = ENUMS.NovelLengthType[novelInfo.length_type] || '中篇'
  const audienceName = ENUMS.TargetAudience[novelInfo.target_audience] || '全年龄'
  const statusName = ENUMS.NovelStatus[novelInfo.status] || '构思'
  const originalRequirementInline = normalizeInlineText(novelInfo.original_description || '')
  const writingSettings = novelInfo.settings || {}
  const styleOptions = Object.entries(ENUMS.NovelStyle)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.style == k ? 'selected' : ''}>${v}</option>`).join('')
  const statusOptions = Object.entries(ENUMS.NovelStatus)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.status == k ? 'selected' : ''}>${v}</option>`).join('')
  const lengthOptions = Object.entries(ENUMS.NovelLengthType)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.length_type == k ? 'selected' : ''}>${v}</option>`).join('')
  const audienceOptions = Object.entries(ENUMS.TargetAudience)
    .map(([k, v]) => `<option value="${k}" ${novelInfo.target_audience == k ? 'selected' : ''}>${v}</option>`).join('')
  const perspectiveValue = writingSettings.perspective || ''
  const languageStyleValue = writingSettings.language_style || ''
  const pacingValue = writingSettings.pacing || ''
  const complexityValue = writingSettings.structure_complexity || ''
  const toneValue = writingSettings.tone || ''
  const conflictTypeValue = writingSettings.core_conflict_type || ''
  const readerExpectationValue = writingSettings.reader_expectation || ''
  const relationshipFocusValue = writingSettings.relationship_focus || ''

  content.innerHTML = `
    <div class="basic-layout basic-layout--refined">
      <section class="workspace-basic-hero">
        <div class="workspace-basic-hero__glow"></div>
        <div class="workspace-basic-hero__content">
          <div class="workspace-basic-hero__eyebrow">Story Atelier</div>
          <div class="workspace-basic-hero__topline">
            <div>
              <div class="workspace-basic-hero__title-row">
                <h2 class="workspace-basic-hero__title">${escapeHtml(novelInfo.title || '未命名小说')}</h2>
                <div class="workspace-basic-hero__chips">
                  <span class="workspace-basic-chip">${styleName}</span>
                  <span class="workspace-basic-chip">${lengthName}</span>
                  <span class="workspace-basic-chip">${audienceName}</span>
                </div>
              </div>
              ${originalRequirementInline ? `<p class="workspace-basic-hero__origin">${escapeHtml(originalRequirementInline)}</p>` : ''}
            </div>
            <div class="workspace-basic-hero__status">${statusName}</div>
          </div>
          <div class="workspace-basic-metrics">
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">当前总字数</div>
              <div class="workspace-basic-metric__value">${formatNumber(totalWords)}</div>
            </div>
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">预估章节</div>
              <div class="workspace-basic-metric__value">${novelInfo.estimated_chapter_count || '--'}</div>
            </div>
            <div class="workspace-basic-metric">
              <div class="workspace-basic-metric__label">完成进度</div>
              <div class="workspace-basic-metric__value">${estimatedTotalWords ? `${progressRatio}%` : '--'}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="workspace-basic-shell">
        <div class="workspace-basic-main-column">
          <section class="card workspace-basic-panel workspace-basic-panel--main">
          <div class="workspace-basic-panel__header">
            <div>
              <div class="workspace-basic-panel__eyebrow">Novel Blueprint</div>
              <h3 class="workspace-basic-panel__title">基础设定</h3>
              <p class="workspace-basic-panel__hint">定义作品标题、简介与市场定位，这些设定会直接影响后续 AI 生成和创作节奏。</p>
            </div>
            <button id="save-basic-btn" class="btn btn-primary workspace-basic-save-btn">${ICONS.save}<span>保存基础信息</span></button>
          </div>

          <div class="workspace-basic-form-grid">
            <div class="form-group workspace-basic-field workspace-basic-field--title">
              <label class="form-label">小说标题</label>
              <input id="novel-title" class="form-input workspace-basic-input" value="${escapeHtml(novelInfo.title || '')}" />
            </div>
            <div class="form-group workspace-basic-field">
              <label class="form-label">小说状态</label>
              <select id="novel-status" class="form-input workspace-basic-input">${statusOptions}</select>
            </div>
            <div class="form-group full-width workspace-basic-field">
              <label class="form-label">小说简介</label>
              <textarea id="novel-desc" class="form-input workspace-basic-input workspace-basic-textarea" rows="5">${escapeHtml(novelInfo.description || '')}</textarea>
            </div>
            <div class="form-group workspace-basic-field">
              <label class="form-label">小说风格</label>
              <select id="novel-style" class="form-input workspace-basic-input">${styleOptions}</select>
            </div>
            <div class="form-group workspace-basic-field">
              <label class="form-label">篇幅类型</label>
              <select id="novel-length" class="form-input workspace-basic-input">${lengthOptions}</select>
            </div>
            <div class="form-group workspace-basic-field">
              <label class="form-label">目标读者</label>
              <select id="novel-audience" class="form-input workspace-basic-input">${audienceOptions}</select>
            </div>
          </div>

          </section>

          <div class="card settings-card workspace-settings-panel">
            <div class="workspace-basic-panel__header workspace-basic-panel__header--compact">
              <div>
                <div class="workspace-basic-panel__eyebrow">Writing Preferences</div>
                <h3 class="workspace-basic-panel__title">写作设置</h3>
                <p class="workspace-basic-panel__hint">这部分用于记录你当前希望维持的叙事风格和冲突方向，方便整个项目保持统一语感。</p>
              </div>
            </div>

            <div class="settings-grid workspace-settings-grid">
              <div class="form-group workspace-basic-field">
                <label class="form-label">叙事视角</label>
                <select id="setting-perspective" class="form-input workspace-basic-input">
                  ${renderOptions(['第一人称', '第三人称-限知', '第三人称-多视角', '全知视角'], perspectiveValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">语言风格</label>
                <select id="setting-language-style" class="form-input workspace-basic-input">
                  ${renderOptions(['克制写实', '轻快通俗', '诗性抒情', '冷峻锋利', '热血直给', '悬疑压迫'], languageStyleValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">节奏风格</label>
                <select id="setting-pacing" class="form-input workspace-basic-input">
                  ${renderOptions(['慢热铺陈', '稳步推进', '高频爆点', '张弛有度'], pacingValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">结构复杂度</label>
                <select id="setting-complexity" class="form-input workspace-basic-input">
                  ${renderOptions(['简单直线', '中等并行', '多线复杂'], complexityValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">情绪基调</label>
                <select id="setting-tone" class="form-input workspace-basic-input">
                  ${renderOptions(['明亮', '克制', '沉郁', '黑暗', '浪漫', '热血'], toneValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">核心冲突类型</label>
                <select id="setting-conflict-type" class="form-input workspace-basic-input">
                  ${renderOptions(['人物对抗', '命运压迫', '制度/时代', '生存危机', '情感拉扯', '谜题追查', '成长试炼'], conflictTypeValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">读者预期</label>
                <select id="setting-reader-expectation" class="form-input workspace-basic-input">
                  ${renderOptions(['剧情驱动', '角色驱动', '设定驱动', '情绪驱动', '爽点驱动'], readerExpectationValue)}
                </select>
              </div>
              <div class="form-group workspace-basic-field">
                <label class="form-label">角色关系重心</label>
                <select id="setting-relationship-focus" class="form-input workspace-basic-input">
                  ${renderOptions(['主角单核', '双主角', '群像', '强关系线'], relationshipFocusValue)}
                </select>
              </div>
            </div>

            <div class="workspace-settings-story-grid">
              <div class="form-group workspace-basic-field full-width">
                <label class="form-label">主题思想</label>
                <input id="setting-theme" class="form-input workspace-basic-input" value="${escapeHtml(novelInfo.settings?.theme || '')}" placeholder="例如：探索与成长" />
              </div>
              <div class="form-group workspace-basic-field full-width">
                <label class="form-label">核心冲突</label>
                <input id="setting-conflict" class="form-input workspace-basic-input" value="${escapeHtml(novelInfo.settings?.conflict || '')}" placeholder="例如：人与自然的对抗" />
              </div>
            </div>
          </div>
        </div>

        <aside class="card workspace-basic-panel workspace-basic-panel--aside">
          <div class="workspace-basic-panel__eyebrow">Scale Planning</div>
          <h3 class="workspace-basic-panel__title">篇幅与节奏</h3>
          <p class="workspace-basic-panel__hint">这些数字会帮助你快速判断项目规模，也方便 AI 在生成大纲和章节时保持节奏一致。</p>



          <div class="workspace-basic-side-grid">
            <div class="form-group workspace-basic-field">
              <label class="form-label">预估章节数</label>
              <input id="novel-chapters" class="form-input workspace-basic-input" type="number" value="${novelInfo.estimated_chapter_count || ''}" />
            </div>
            <div class="form-group workspace-basic-field">
              <label class="form-label">预估总字数</label>
              <input id="novel-words" class="form-input workspace-basic-input" type="number" value="${novelInfo.estimated_total_word_count || ''}" />
            </div>
            <div class="form-group workspace-basic-field">
              <label class="form-label">每章字数</label>
              <input id="novel-words-per-chapter" class="form-input workspace-basic-input" type="number" value="${novelInfo.estimated_words_per_chapter || ''}" />
            </div>
          </div>

          <div class="workspace-basic-progress-card">
            <div class="workspace-basic-progress-card__header">
              <span>创作推进感知</span>
              <strong>${estimatedTotalWords ? `${progressRatio}%` : '未设定'}</strong>
            </div>
            <div class="workspace-basic-progress-bar">
              <span style="width: ${estimatedTotalWords ? progressRatio : 0}%"></span>
            </div>
            <p class="workspace-basic-progress-card__desc">${estimatedTotalWords ? `当前已写 ${formatNumber(totalWords)} 字，目标约 ${formatNumber(estimatedTotalWords)} 字。` : '建议填写预估总字数，方便后续观察创作完成度。'}</p>
          </div>

          <div class="workspace-basic-note-card">
            <div class="workspace-basic-note-card__title">编辑提示</div>
            <div class="workspace-basic-note-card__text">如果你还没有完全确定设定，可以先保存一个方向明确但不追求完整的版本，后续在时间线、元数据和角色页继续细化。</div>
          </div>
        </aside>
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
      length_type: parseInt(content.querySelector('#novel-length').value),
      target_audience: parseInt(content.querySelector('#novel-audience').value),
      estimated_chapter_count: parseInt(content.querySelector('#novel-chapters').value) || null,
      estimated_total_word_count: parseInt(content.querySelector('#novel-words').value) || null,
      estimated_words_per_chapter: parseInt(content.querySelector('#novel-words-per-chapter').value) || null,
    }
    const settings = {
      perspective: content.querySelector('#setting-perspective').value,
      language_style: content.querySelector('#setting-language-style').value,
      pacing: content.querySelector('#setting-pacing').value,
      structure_complexity: content.querySelector('#setting-complexity').value,
      tone: content.querySelector('#setting-tone').value,
      core_conflict_type: content.querySelector('#setting-conflict-type').value,
      reader_expectation: content.querySelector('#setting-reader-expectation').value,
      relationship_focus: content.querySelector('#setting-relationship-focus').value,
      theme: content.querySelector('#setting-theme').value.trim(),
      conflict: content.querySelector('#setting-conflict').value.trim(),
    }
    try {
      await Promise.all([
        api.updateNovel(data),
        api.saveNovelSettings(novelInfo.id, settings),
      ])
      toastSuccess('保存成功')
    } catch (e) {
      toastError('保存失败: ' + e.message)
    }
  })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function normalizeInlineText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function renderOptions(options, currentValue) {
  return [{ value: '', label: '请选择' }, ...options.map(option => ({ value: option, label: option }))]
    .map(option => `<option value="${escapeHtml(option.value)}" ${option.value === currentValue ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
    .join('')
}

export function cleanup() {
}
