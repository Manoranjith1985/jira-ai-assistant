import { useState } from 'react'
import { Wand2, ChevronDown, ChevronRight, CheckCircle, Loader2, Rocket } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

function EpicTree({ structure }) {
  const [openEpics, setOpenEpics] = useState({})
  if (!structure?.epics) return null

  return (
    <div className="space-y-2">
      {structure.epics.map((epic, ei) => (
        <div key={ei} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenEpics(p => ({ ...p, [ei]: !p[ei] }))}
            className="w-full flex items-center gap-3 px-4 py-3 bg-violet-50 hover:bg-violet-100 text-left transition-colors"
          >
            {openEpics[ei] ? <ChevronDown className="w-4 h-4 text-violet-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-violet-500 flex-shrink-0" />}
            <span className="text-sm font-semibold text-violet-900">Epic: {epic.name}</span>
            <span className="ml-auto text-xs text-violet-400">{epic.stories?.length || 0} stories</span>
          </button>
          {openEpics[ei] && (
            <div className="px-4 py-2 space-y-2 bg-white">
              {epic.stories?.map((story, si) => (
                <div key={si} className="ml-4 border-l-2 border-blue-200 pl-4">
                  <p className="text-sm font-medium text-blue-800">Story: {story.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{story.description}</p>
                  {story.story_points && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-1 inline-block">{story.story_points} pts</span>}
                  {story.tasks?.map((task, ti) => (
                    <div key={ti} className="ml-4 mt-1 border-l-2 border-emerald-200 pl-3">
                      <p className="text-xs font-medium text-emerald-700">Task: {task.name}</p>
                      {task.subtasks?.map((st, sti) => (
                        <p key={sti} className="text-xs text-gray-400 ml-3">↳ {st}</p>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function ProjectCreator() {
  const [description, setDescription] = useState('')
  const [structure, setStructure] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [leadId, setLeadId] = useState('')
  const [created, setCreated] = useState(null)

  const generate = async () => {
    if (!description.trim()) return toast.error('Please describe your project')
    setGenerating(true)
    setStructure(null)
    try {
      const { data } = await api.post('/projects/generate', { description })
      setStructure(data.structure)
      toast.success('Project structure generated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const createInJira = async () => {
    if (!structure) return
    setCreating(true)
    try {
      const { data } = await api.post('/projects/create-from-structure', {
        structure,
        lead_account_id: leadId,
      })
      setCreated(data)
      toast.success(`Project ${data.project?.key} created with ${data.issues_created} issues!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Creation failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Project Creator</h1>
        <p className="text-gray-500 mt-1">Describe your project and AI will generate a full JIRA structure: Epics → Stories → Tasks → Sub-tasks.</p>
      </div>

      {created ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-emerald-900">Project Created! 🎉</h2>
          <p className="text-emerald-700 mt-2">{created.message}</p>
          <p className="text-sm text-emerald-600 mt-1">{created.issues_created} issues created in JIRA</p>
          <button onClick={() => { setCreated(null); setStructure(null); setDescription('') }}
            className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            Create Another Project
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Description input */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Project Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. Build a mobile banking app with features for account management, money transfers, bill payments, and transaction history. It should have a React Native frontend and Node.js backend with PostgreSQL database."
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            <button
              onClick={generate}
              disabled={generating}
              className="mt-3 flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? 'Generating…' : 'Generate Structure with AI'}
            </button>
          </div>

          {/* Generated structure */}
          {structure && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{structure.project_name}</h2>
                  <p className="text-sm text-gray-400">Key: <span className="font-mono text-primary-600">{structure.project_key}</span> · {structure.epics?.length} epics</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    placeholder="Lead account ID (optional)"
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                  <button
                    onClick={createInJira}
                    disabled={creating}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    {creating ? 'Creating in JIRA…' : 'Create in JIRA'}
                  </button>
                </div>
              </div>
              <EpicTree structure={structure} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
