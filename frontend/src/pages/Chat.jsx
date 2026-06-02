import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Plus, Trash2, Bot, User, BarChart3 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bar, Line, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import toast from 'react-hot-toast'
import api from '../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend)

const SUGGESTIONS = [
  'What is the status of my current sprint?',
  'Show workload distribution for project PROJ',
  'Create a project for an e-commerce platform',
  'List all open bugs in project ABC',
  'Show velocity chart for board 1',
]

function ChartMessage({ metadata }) {
  if (!metadata?.chart_data) return null
  const ChartComp = metadata.chart_type === 'line' ? Line : metadata.chart_type === 'pie' ? Pie : Bar
  return (
    <div className="mt-3 bg-white border border-gray-100 rounded-xl p-4 max-w-lg">
      <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
        <BarChart3 className="w-4 h-4 text-primary-500" />
        {metadata.title || 'Chart'}
      </p>
      <ChartComp
        data={metadata.chart_data}
        options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
      />
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-primary-500' : 'bg-gray-100'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gray-600" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-primary-500 text-white' : 'bg-white border border-gray-100'}`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <>
            <div className="chat-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
            {msg.metadata && <ChartMessage metadata={msg.metadata} />}
          </>
        )}
      </div>
    </div>
  )
}

export default function Chat() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(sessionId ? parseInt(sessionId) : null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    api.get('/chat/sessions').then(({ data }) => setSessions(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeSession) {
      api.get(`/chat/sessions/${activeSession}/messages`).then(({ data }) => setMessages(data)).catch(() => {})
      navigate(`/chat/${activeSession}`, { replace: true })
    }
  }, [activeSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const newSession = async () => {
    const { data } = await api.post('/chat/sessions')
    setSessions(prev => [data, ...prev])
    setActiveSession(data.id)
    setMessages([])
  }

  const deleteSession = async (id, e) => {
    e.stopPropagation()
    await api.delete(`/chat/sessions/${id}`)
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeSession === id) {
      setActiveSession(null)
      setMessages([])
      navigate('/chat')
    }
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setLoading(true)

    // Optimistic user message
    const userMsg = { id: Date.now(), role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])

    try {
      const { data } = await api.post('/chat/message', {
        session_id: activeSession,
        message: msg,
      })
      if (!activeSession) {
        setActiveSession(data.session_id)
        api.get('/chat/sessions').then(({ data: s }) => setSessions(s)).catch(() => {})
      }
      setMessages(prev => [...prev, data.message])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sessions sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <button onClick={newSession} className="flex items-center gap-2 w-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group text-sm transition-colors ${activeSession === s.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-600'}`}
            >
              <span className="flex-1 truncate">{s.title}</span>
              <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">JIRA AI Assistant</h2>
              <p className="text-gray-400 text-sm mt-1 mb-6">Ask me anything about your JIRA projects</p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left text-sm bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-xl px-4 py-2.5 text-gray-600 hover:text-primary-700 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Ask about your JIRA projects… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm focus:outline-none text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-9 h-9 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
