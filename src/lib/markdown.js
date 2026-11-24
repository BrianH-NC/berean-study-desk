// A small Markdown renderer for generated study documents: headings, paragraphs, lists,
// block quotes, bold and italic. Output is escaped here and sanitized again where it is shown.
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const inline = text => escape(text)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
  .replace(/(^|\W)_([^_\s][^_]*?)_(?=\W|$)/g, '$1<em>$2</em>')

export function markdownToHtml(markdown = '') {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let list = null
  let para = []
  let quote = []
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = [] } }
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null } }
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`); quote = [] } }
  const flush = () => { flushPara(); flushList(); flushQuote() }
  for (const raw of lines) {
    const line = raw.trimEnd()
    let m
    if (!line.trim()) { flush(); continue }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flush(); const level = m[1].length; out.push(`<h${level}>${inline(m[2].trim())}</h${level}>`); continue }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flush(); out.push('<hr>'); continue }
    if ((m = line.match(/^\s*>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue }
    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) { flushPara(); flushQuote(); if (list?.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] } } list.items.push(m[1]); continue }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); flushQuote(); if (list?.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] } } list.items.push(m[1]); continue }
    if (list && /^\s{2,}\S/.test(raw)) { list.items[list.items.length - 1] += ` ${line.trim()}`; continue }
    flushList(); flushQuote(); para.push(line.trim())
  }
  flush()
  return out.join('\n')
}
