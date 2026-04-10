import '../style/editor.css'

import { createNovelPageShell, loadCurrentNovelInfo, renderNovelSelectionState } from './novel-page.js'
import * as metaPage from './meta-editor.js'

export async function render() {
  const novelInfo = await loadCurrentNovelInfo()

  if (!novelInfo) {
    const el = document.createElement('div')
    el.className = 'page'
    return renderNovelSelectionState(el, {
      title: '元数据',
      subtitle: '管理小说世界观、设定与补充信息',
      iconName: 'meta',
    })
  }

  await metaPage.loadMeta(novelInfo.id)

  const { el, content } = createNovelPageShell('元数据', `正在管理"${novelInfo.title}"小说元数据`)
  await metaPage.render(content, novelInfo)
  return el
}

export function cleanup() {
  metaPage.cleanup()
}
