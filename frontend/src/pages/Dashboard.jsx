import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, FolderKanban, BarChart3, PlusSquare, ArrowRight, TrendingUp, Users, CheckCircle } from 'lucide-react'
import api from '../api/client'
import useAuthStore from '../store/authStore'

const statCards = [
  { label: 'Total Projects', icon: FolderKanban, color: 'bg-blue-500', key: 'projects' },
  { label: 'Active Chats', icon: MessageSquare, color: 'bg-violet-500', key: 'chats' },
  { label: 'Team Members', icon: Users, color: 'bg-emerald-500', key: 'members' },
  { label: 'Completed Tasks', icon: CheckCircle, color: 'bg-amber-500', key: 'tasks' },
]

const quickLinks = [
  { to: '/chat', icon: MessageSquare, label: 'Start AI Chat', desc: 'Ask anything about your JIRA projects', color: 'text-violet-600 bg-violet-50' },
  { to: '/project-creator', icon: PlusSquare, label: 'Create Project', desc: 'AI-powered project structure generation', color: 'text-blue-600 bg-blue-50' },
  { to: '/analytics', icon: BarChart3, label: 'View Analytics', desc: 'Velocity, burndown, workload charts', color: 'text-emerald-600 bg-emerald-50' },
  { to: '/teams', icon: FolderKanban, label: 'Manage Teams', desc: 'Team allocation and assignments', color: 'text-amber-600 bg-amber-50' },
]

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({ projects: 0, chats: 0, members: 0, tasks: 0 })
  const [recentSessions, setRecentSessions] = useState([])

  useEffect(() => {
    // Load recent chat sessions
    api.get('/chat/sessions').then(({ data }) => {
      setRecentSessions(data.slice(0, 5))
      setStats(s => ({ ...s, chats: data.length }))
    }).catch(() => {})

    // Load teams for member count
    api.get('/users/teams').then(({ data }) => {
      const total = data.reduce((acc, t) => acc + (t.member_count || 0), 0)
      setStats(s => ({ ...s, members: total }))
    }).catch(() => {})

    // Try load projects
    api.get('/projects/').then(({ data }) => {
      setStats(s => ({ ...s, projects: Array.isArray(data) ? data.length : 0 }))
    }).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your projects today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, icon: Icon, color, key }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats[key]}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickLinks.map(({ to, icon: Icon, label, desc, color }) => (
              <Link
                key={to}
                to={to}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group"
              >
                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Chats */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Conversations</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {recentSessions.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No conversations yet</p>
                <Link to="/chat" className="text-xs text-primary-600 font-medium mt-1 block">Start chatting →</Link>
              </div>
            ) : (
              recentSessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/chat/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{new Date(s.updated_at).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Tips */}
      <div className="mt-6 bg-gradient-to-r from-primary-500 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">AI Tip of the day</p>
            <p className="text-sm text-primary-100 mt-1">
              Try asking: <span className="font-medium text-white">"Show me the burndown chart for my current sprint"</span> or <span className="font-medium text-white">"Create a project for a mobile banking app"</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
