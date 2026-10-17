// Restore content only. Identity, numbering, ownership and lifecycle stay intact.
export const RESTORABLE_NOTE_FIELDS = ['title','body','rich_doc','ref','tags','note_type','page','photos','video_url','stance','resource_title','resource_url','shelf_book_id','doctrine_check_id','sermon_id']
export function revisionFields(snapshot) {
  return Object.fromEntries(RESTORABLE_NOTE_FIELDS.filter(key => Object.hasOwn(snapshot, key)).map(key => [key, snapshot[key]]))
}
