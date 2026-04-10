import '../style/editor.css'

import { createNovelPageShell, loadCurrentNovelInfo, renderNovelSelectionState } from './novel-page.js'
import * as timelinePage from './timeline-editor.js'

export async function render() {
  const novelInfo = await loadCurrentNovelInfo()

  if (!novelInfo) {
    const el = document.createElement('div')
    el.className = 'page'
    return renderNovelSelectionState(el, {
      title: '时间线',
      subtitle: '管理章节范围、情节推进与阶段安排',
      iconName: 'timeline',
    })
  }

  await timelinePage.loadTimelines(novelInfo.id)

  const { el, content } = createNovelPageShell('时间线', `正在管理"${novelInfo.title}"小说时间线`)
  await timelinePage.render(content, novelInfo)
  return el
}

export function cleanup() {
  timelinePage.cleanup()
}
