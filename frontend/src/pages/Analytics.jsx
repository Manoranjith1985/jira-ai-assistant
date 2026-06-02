import { useState } from 'react'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { BarChart3, TrendingUp, Loader2 } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

const CHART_OPTIONS = { responsive: true, plugins: { legend: { position: 'top' } } }

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function Analytics() {
  const [projectKey, setProjectKey] = useState('')
  const [boardId, setBoardId] = useState('')
  const [sprintId, setSprintId] = useState('')
  const [workload, setWorkload] = useState(null)
  const [velocity, setVelocity] = useState(null)
  const [burndown, setBurndown] = useState(null)
  const [loading, setLoading] = useState({})

  const load = async (type) => {
    setLoading(l => ({ ...l, [type]: true }))
    try {
      if (type === 'workload') {
        const { data } = await api.get(`/analytics/workload?project_key=${projectKey}`)
        setWorkload(data)
      } else if (type === 'velocity') {
        const { data } = await api.get(`/analytics/velocity/${boardId}`)
        setVelocity(data)
      } else if (type === 'burndown') {
        const { data } = await api.get(`/analytics/burndown/${boardId}/${sprintId}`)
        setBurndown(data)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to load ${type}`)
    } finally {
      setLoading(l => ({ ...l, [type]: false }))
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">JIRA velocity, burndown, and workload charts.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Load Charts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Workload */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Workload by Assignee</label>
            <div className="flex gap-2">
              <input value={projectKey} onChange={e => setProjectKey(e.target.value.toUpperCase())}
                placeholder="Project key" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <button onClick={() => load('workload')} disabled={loading.workload || !projectKey}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium">
                {loading.workload ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
              </button>
            </div>
          </div>
          {/* Velocity */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Velocity Chart</label>
            <div className="flex gap-2">
              <input value={boardId} onChange={e => setBoardId(e.target.value)}
                placeholder="Board ID" type="number" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <button onClick={() => load('velocity')} disabled={loading.velocity || !boardId}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium">
                {loading.velocity ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
              </button>
            </div>
          </div>
          {/* Burndown */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Burndown Chart</label>
            <div className="flex gap-2">
              <input value={boardId} onChange={e => setBoardId(e.target.value)}
                placeholder="Board ID" type="number" className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <input value={sprintId} onChange={e => setSprintId(e.target.value)}
                placeholder="Sprint ID" type="number" className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <button onClick={() => load('burndown')} disabled={loading.burndown || !boardId || !sprintId}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg text-sm font-medium">
                {loading.burndown ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Workload Distribution">
          {workload ? (
            <Bar data={workload.data} options={CHART_OPTIONS} />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-200">
              <BarChart3 className="w-10 h-10 mb-2" />
              <p className="text-sm">No data loaded</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Sprint Velocity">
          {velocity ? (
            <Bar data={velocity.data} options={CHART_OPTIONS} />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-200">
              <TrendingUp className="w-10 h-10 mb-2" />
              <p className="text-sm">No data loaded</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Burndown Chart">
          {burndown ? (
            <Line data={burndown.data} options={{ ...CHART_OPTIONS, elements: { line: { tension: 0.4 } } }} />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-200">
              <TrendingUp className="w-10 h-10 mb-2" />
              <p className="text-sm">No data loaded</p>
            </div>
          )}
        </ChartCard>

        {/* Summary stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Charts Loaded', value: [workload, velocity, burndown].filter(Boolean).length, color: 'text-primary-600' },
              { label: 'Project Key', value: projectKey || '—', color: 'text-gray-900' },
              { label: 'Board ID', value: boardId || '—', color: 'text-gray-900' },
              { label: 'Sprint ID', value: sprintId || '—', color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
