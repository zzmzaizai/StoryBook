import MarkdownIt from 'markdown-it'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(code, lang) {
    return `<pre class="md-preview-code"><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code)}</code></pre>`
  },
})

export function renderMarkdown(markdown) {
  return md.render(markdown || '')
}

export function renderMarkdownInline(markdown) {
  return md.renderInline(markdown || '')
}

export function downloadMarkdownFile(content, filename = 'document.md') {
  const blob = new Blob([content ?? ''], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.md') ? filename : `${filename}.md`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
