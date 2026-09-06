// Uploads for the Notebook composer's Photos field, backed by the
// entry-photos Storage bucket (public read, write restricted to the
// uploader's own auth.uid()-prefixed path -- see the entry_composer_fields
// migration). Unlike the original digging-deep-notebook app, where photos
// stayed device-local, these are real uploads so they sync across devices.
import { supabase } from './supabase'

export async function uploadEntryPhoto(userId, file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('entry-photos').upload(path, file)
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('entry-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteEntryPhoto(url) {
  const marker = '/entry-photos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = url.slice(idx + marker.length)
  await supabase.storage.from('entry-photos').remove([path])
}
