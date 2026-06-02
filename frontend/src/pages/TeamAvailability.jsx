import { useState, useEffect } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Users, Activity } from 'lucide-react'
import api from '../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOURS = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm']

// Simple color coding for mock availability
const avail = (v) => v > 3 ? 'bg-emerald-200 text-emerald-800' : v > 1 ? 'bg-amber-200 text-amber-800' : 'bg-red-100 text-red-500'

export default function TeamAvailability() {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [workloadData, setWorkloadData] = useState(null)
  const [projectKey, setProjectKey] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/users/teams').then(({ data }) => {
      setTeams(data)
      if (data.length) setSelectedTeam(data[0])
    }).catch(() => {})
  }, [])

  const loadWorkload = async () => {
    if (!projectKey) return
    setLoading(true)
    try {
      const { data } = await api.get(`/analytics/workload?project_key=${projectKey}`)
      setWorkloadData(data)
    } catch {
      setWorkloadData(null)
    } finally {
      setLoading(false)
    }
  }

  // Mock capacity data for calendar view
  const mockCapacity = DAYS.map(day => ({
    day,
    slots: HOURS.map(() => Math.floor(Math.random() * 6)),
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Availability & Workload</h1>
        <p className="text-gray-500 text-sm mt-1">Capacity planning, workload distribution, and availability calendar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Workload chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Workload Distribution</h2>
          <div className="flex gap-2 mb-4">
            <input
              value={projectKey}
              onChange={e => setProjectKey(e.target.value.toUpperCase())}
              placeholder="Project key (e.g. PROJ)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              onClick={loadWorkload}
              disabled={loading}
              className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? '…' : 'Load'}
            </button>
          </div>
          {workloadData ? (
            <Bar data={workloadData.data} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-300">
              <Activity className="w-10 h-10 mb-2" />
              <p className="text-sm">Enter a project key to load workload</p>
            </div>
          )}
        </div>

        {/* Capacity summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Team Capacity</h2>
          <div className="flex gap-2 mb-4">
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTeam(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedTeam?.id === t.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          {selectedTeam ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Team Members</span>
                <span className="font-semibold">{selectedTeam.member_count}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Capacity (Story Points)</span>
                <span className="font-semibold">{selectedTeam.member_count * 8}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '65%' }} />
              </div>
              <p className="text-xs text-gray-400">65% allocated this sprint</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No teams found</p>
          )}
        </div>
      </div>

      {/* Availability calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Weekly Availability Calendar</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1 text-gray-400 font-medium text-left w-12">Time</th>
                {DAYS.map(d => (
                  <th key={d} className="px-2 py-1 text-gray-600 font-semibold text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour, hi) => (
                <tr key={hour}>
                  <td className="px-2 py-1 text-gray-400 whitespace-nowrap">{hour}</td>
                  {mockCapacity.map(({ day, slots }) => {
                    const v = slots[hi]
                    return (
                      <td key={day} className="px-1 py-1">
                        <div className={`rounded text-center py-1 px-0.5 font-medium ${avail(v)}`}>
                          {v > 0 ? `${v} avail` : 'busy'}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">* Availability counts based on team member capacity. Connect your calendar for real data.</p>
      </div>
    </div>
  )
}
