import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import ProjectTeam from './pages/ProjectTeam'
import TeamAvailability from './pages/TeamAvailability'
import Analytics from './pages/Analytics'
import SettingsPage from './pages/Settings'
import ApprovalHandler from './pages/ApprovalHandler'
import ProjectCreator from './pages/ProjectCreator'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/approve/:token" element={<ApprovalHandler />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:sessionId" element={<Chat />} />
          <Route path="project-creator" element={<ProjectCreator />} />
          <Route path="teams" element={<ProjectTeam />} />
          <Route path="availability" element={<TeamAvailability />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
