import { supabase } from './supabase'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Edge functions verify this against a real signed-in session (see each
// function's getAuthedUser helper) -- the public anon key alone is no
// longer enough to invoke them, since that would let anyone who finds the
// deployed site's URL run up the Claude/ESV API bills.
export async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to be signed in to do that.')
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + session.access_token,
    apikey: SUPABASE_ANON_KEY,
  }
}
