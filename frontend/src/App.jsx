import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import UserManagement from './pages/UserManagement'
import ProjectTeam from './pages/ProjectTeam'
import TeamAvailability from './pages/TeamAvailability'
import Analytics from './pages/Analytics'
import SettingsPage from './pages/Settings'
import ApprovalHandler from './pages/ApprovalHandler'
import ProjectCreator from './pages/ProjectCreator'

// Auth bypassed for demo — all routes accessible
function PrivateRoute({ children }) {
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/approve/:token" element={<ApprovalHandler />} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:sessionId" element={<Chat />} />
          <Route path="project-creator" element={<ProjectCreator />} />
          <Route path="teams" element={<ProjectTeam />} />
          <Route path="availability" element={<TeamAvailability />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={
            <PrivateRoute adminOnly><UserManagement /></PrivateRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
