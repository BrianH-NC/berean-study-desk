import { supabase } from './supabase'

export const ITEM_COLUMNS = 'id,list_id,position,title,author,author_surname,publisher,pub_year,edition_note,series,series_name,section,subsection,topic,bible_books,bible_scope,is_first_pick,level_codes,levels,language'

export async function loadLists() {
  const { data, error } = await supabase.from('reading_lists').select('*').order('created_at')
  if (error) throw error
  return data || []
}

// A list can run to a couple of thousand rows and the API returns at most 1,000 per request.
export async function loadListItems(listId) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('reading_list_items').select(ITEM_COLUMNS).eq('list_id', listId).order('position').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

// Entries about one Bible book, for the passage panel.
export async function loadItemsForBook(bibleBook) {
  const { data, error } = await supabase.from('reading_list_items').select(ITEM_COLUMNS).contains('bible_books', [bibleBook]).order('position').limit(500)
  if (error) throw error
  return data || []
}

export async function addToWishlist(userId, item, listName) {
  const { data, error } = await supabase.from('wishlist').insert({
    user_id: userId,
    title: item.title,
    author: item.author || null,
    publisher: item.publisher || null,
    pub_date: item.pub_year ? String(item.pub_year) : null,
    priority: item.is_first_pick ? 'high' : 'medium',
    notes: `From the ${listName}`,
  }).select('id,title,author').single()
  if (error) throw error
  return data
}

export async function addToLibrary(userId, item) {
  const { data, error } = await supabase.from('books').insert({
    user_id: userId,
    title: item.title,
    author: item.author || null,
    publisher: item.publisher || null,
    pub_date: item.pub_year ? String(item.pub_year) : null,
    tags: [],
    reading_status: 'unread',
  }).select('id,title,author').single()
  if (error) throw error
  return data
}

export async function removeFromWishlist(userId, id) {
  const { error } = await supabase.from('wishlist').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}
