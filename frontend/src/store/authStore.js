import { create } from 'zustand'

const safeGetUser = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw || raw === 'undefined') return null
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

const useAuthStore = create((set) => ({
  user: safeGetUser(),
  token: localStorage.getItem('token') || null,

  login: (user, token) => {
    if (user) localStorage.setItem('user', JSON.stringify(user))
    if (token) localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
