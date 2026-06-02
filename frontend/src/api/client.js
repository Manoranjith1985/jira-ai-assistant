import axios from 'axios'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const api = axios.create({
  baseURL: `${BASE}/api`,
})

export default api
