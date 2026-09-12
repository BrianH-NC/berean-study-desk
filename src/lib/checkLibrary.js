import { supabase } from './supabase'
export async function loadCheckLibrary(userId) {
  const books = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('books').select('id,title,author,isbn').eq('user_id', userId).order('id').range(offset, offset + 999)
    if (error) throw error
    books.push(...data)
    if (data.length < 1000) return books
  }
}
