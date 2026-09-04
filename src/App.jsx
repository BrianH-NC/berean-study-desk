import { createContext, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import Home from './screens/Home'
import Shelf from './screens/Shelf'
import AddBooks from './screens/AddBooks'
import DoctrineCheckIndex from './screens/DoctrineCheckIndex'
import DoctrineCheckReport from './screens/DoctrineCheckReport'
import Composer from './screens/Composer'
import Entry from './screens/Entry'
import Reading from './screens/Reading'
import Search from './screens/Search'
import Topics from './screens/Topics'
import Settings from './screens/Settings'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function ProtectedLayout() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shelf" element={<Shelf />} />
          <Route path="/shelf/add" element={<AddBooks />} />
          <Route path="/checks" element={<DoctrineCheckIndex />} />
          <Route path="/checks/:id" element={<DoctrineCheckReport />} />
          <Route path="/notebook" element={<Navigate to="/notebook/new" replace />} />
          <Route path="/notebook/new" element={<Composer />} />
          <Route path="/notebook/:id" element={<Entry />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/reading/:bookId" element={<Reading />} />
          <Route path="/search" element={<Search />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-bg">
        <span style={{ opacity: 0.5, fontSize: 14 }}>Loading…</span>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={user}>
      <BrowserRouter>{user ? <ProtectedLayout /> : <Auth />}</BrowserRouter>
    </AuthContext.Provider>
  )
}
