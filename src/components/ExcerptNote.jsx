import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus } from 'lucide-react'
import './ExcerptNote.css'
import SaveToNote from './SaveToNote'
import { paragraphs } from '../lib/commentaryBlocks'
import { commentaryExcerptNodes } from '../lib/excerpts'
import { linkTreasuryRefs } from '../lib/treasuryRefs'

// One scripture reference in a note, as a button that opens that verse.
function RefButton({ part, linkRefs, tabbable }) {
  const { ref } = part
  const label = `${linkRefs.nameFor(ref.book)} ${ref.chapter}:${ref.verse}${ref.endVerse ? `-${ref.endVerse}` : ''}`
  return <button type="button" className="tsk-ref" tabIndex={tabbable ? 0 : -1} title={`Open ${label}`} aria-label={label} onClick={() => linkRefs.onGoTo(linkRefs.nameFor(ref.book), ref.chapter, ref.verse, ref.endVerse)}>{part.text}</button>
}

// A commentary note, shown paragraph by paragraph, from which a paragraph or any selected text
// can be saved to a note with its citation.
//   source:     { citation, title, refs } -- what the saved excerpt is credited to and filed under
//   noteTarget: { userId, sessionRef, sessionNoteId, api? } -- without it the text is simply shown (api swaps
//               the data layer, for testing)
//   onSaving:   called with true while the save panel is open, so a folded note can open itself
//   linkRefs:   { book (1-66), chapter, nameFor(book), onGoTo(bookName, chapter, verse, endVerse) } -- for a Treasury of
//               Scripture Knowledge note, whose scripture references become buttons that open the verse
export default function ExcerptNote({ text, source, noteTarget, tabbable = true, onSaving, linkRefs }) {
  const box = useRef(null)
  const [selected, setSelected] = useState('')
  // The excerpt being saved and where its panel sits: under paragraph `at`, or at the top for a selection.
  const [saving, setSaving] = useState(null)
  const linkBook = linkRefs?.book, linkChapter = linkRefs?.chapter
  const items = useMemo(
    () => paragraphs(text).map((p) => ({ p, parts: linkBook ? linkTreasuryRefs(p, { book: linkBook, chapter: linkChapter }) : null })),
    [text, linkBook, linkChapter],
  )

  useEffect(() => { onSaving?.(Boolean(saving)) }, [saving, onSaving])

  useEffect(() => {
    if (!noteTarget) return
    function onSelectionChange() {
      const selection = window.getSelection()
      const el = box.current
      if (!selection || selection.isCollapsed || !el || !el.contains(selection.anchorNode) || !el.contains(selection.focusNode)) { setSelected(''); return }
      setSelected(selection.toString().trim())
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [noteTarget])

  const panel = saving && (
    <SaveToNote
      key={`${saving.at}:${saving.text}`}
      excerpt={{ title: source.title, refs: source.refs, preview: saving.text, build: () => commentaryExcerptNodes(saving.text, source.citation) }}
      target={noteTarget}
      api={noteTarget.api}
      onClose={() => setSaving(null)}
    />
  )
  return (
    <div className="xn" ref={box}>
      {noteTarget && selected && !saving && (
        <div className="xn-selection">
          {/* mousedown is cancelled so pressing the button doesn't clear the selection it is about */}
          <button type="button" className="btn btn-secondary" onMouseDown={(e) => e.preventDefault()} onClick={() => setSaving({ text: selected, at: 'top' })}>
            <BookmarkPlus size={14} aria-hidden="true" /> Save selected text to a note
          </button>
        </div>
      )}
      {saving?.at === 'top' && panel}
      {items.map(({ p, parts }, i) => (
        <Fragment key={i}>
          <p>
            {parts ? parts.map((part, k) => (part.ref ? <RefButton key={k} part={part} linkRefs={linkRefs} tabbable={tabbable} /> : part.text)) : p}
            {noteTarget && (
              <button type="button" className="xn-save" tabIndex={tabbable ? 0 : -1} title="Save this paragraph to a note" aria-label={`Save paragraph ${i + 1} to a note`} onClick={() => setSaving({ text: p, at: i })}>
                <BookmarkPlus size={15} aria-hidden="true" />
              </button>
            )}
          </p>
          {saving?.at === i && panel}
        </Fragment>
      ))}
    </div>
  )
}
