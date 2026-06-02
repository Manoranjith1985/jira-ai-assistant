import { useState, useEffect } from 'react'
import { Plus, Users, FolderKanban, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

function CreateTeamModal({ allUsers, onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', jira_project_key: '', description: '', member_ids: [] })
  const [saving, setSaving] = useState(false)

  const toggleMember = (id) => {
    setForm(f => ({
      ...f,
      member_ids: f.member_ids.includes(id) ? f.member_ids.filter(m => m !== id) : [...f.member_ids, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Create Team</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Team Name *</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">JIRA Project Key</label>
            <input placeholder="e.g. PROJ" value={form.jira_project_key} onChange={e => setForm({ ...form, jira_project_key: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Members</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {allUsers.map(u => (
                <label key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={form.member_ids.includes(u.id)} onChange={() => toggleMember(u.id)} className="rounded" />
                  <span className="text-sm text-gray-700 truncate">{u.full_name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
              {saving ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectTeam() {
  const [teams, setTeams] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/users/teams'),
      api.get('/users/').catch(() => ({ data: [] })),
    ]).then(([teamsRes, usersRes]) => {
      setTeams(teamsRes.data)
      setAllUsers(usersRes.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      api.get(`/users/teams/${selectedTeam.id}`).then(({ data }) => setSelectedTeam(data)).catch(() => {})
    }
  }, [selectedTeam?.id])

  const createTeam = async (form) => {
    const { data } = await api.post('/users/teams', form)
    const { data: team } = await api.get(`/users/teams/${data.id}`)
    setTeams(prev => [{ ...data, member_count: form.member_ids.length }, ...prev])
    toast.success('Team created!')
  }

  const removeMember = async (userId) => {
    await api.delete(`/users/teams/${selectedTeam.id}/members/${userId}`)
    setSelectedTeam(t => ({ ...t, members: t.members.filter(m => m.id !== userId) }))
    toast.success('Member removed')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Teams</h1>
          <p className="text-gray-500 text-sm mt-0.5">{teams.length} teams</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : teams.length === 0 ? (
            <div className="text-center py-10">
              <FolderKanban className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No teams yet</p>
            </div>
          ) : teams.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTeam(t)}
              className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${selectedTeam?.id === t.id ? 'border-primary-400 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  {t.jira_project_key && <p className="text-xs text-gray-400 font-mono">{t.jira_project_key}</p>}
                </div>
                <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t.member_count}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Team detail */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-1">{selectedTeam.name}</h2>
              {selectedTeam.jira_project_key && (
                <p className="text-sm text-gray-400 mb-4">JIRA: <span className="font-mono text-primary-600">{selectedTeam.jira_project_key}</span></p>
              )}
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Members ({selectedTeam.members?.length || 0})</h3>
              <div className="space-y-2">
                {selectedTeam.members?.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
                      {m.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                      <p className="text-xs text-gray-400">{m.email} · <span className="capitalize">{m.role_in_team}</span></p>
                    </div>
                    <button onClick={() => removeMember(m.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!selectedTeam.members || selectedTeam.members.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No members yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select a team to view details</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateTeamModal
          allUsers={allUsers}
          onClose={() => setShowModal(false)}
          onCreate={createTeam}
        />
      )}
    </div>
  )
}
