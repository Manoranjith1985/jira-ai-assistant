import { useState, useEffect } from 'react'
import { Save, TestTube2, CheckCircle, XCircle, Eye, EyeOff, Key, Server } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function SettingsPage() {
  const [form, setForm] = useState({
    jira_base_url: '',
    jira_email: '',
    jira_api_token: '',
    openai_api_key: '',
    ai_model: 'gpt-4o',
  })
  const [showToken, setShowToken] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    api.get('/settings/').then(({ data }) => setForm(f => ({ ...f, ...data }))).catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/settings/', form)
      toast.success('Settings saved!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testJira = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Pass current form values so user can test before saving
      const { data } = await api.post('/settings/test-jira', {
        jira_base_url: form.jira_base_url || undefined,
        jira_email: form.jira_email || undefined,
        jira_api_token: (form.jira_api_token && form.jira_api_token !== '***') ? form.jira_api_token : undefined,
      })
      setTestResult({ success: true, message: `Connected as ${data.user} (${data.email})` })
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.detail || 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure JIRA credentials and AI API key.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* JIRA Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Server className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900">JIRA Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JIRA Base URL</label>
              <input value={form.jira_base_url} onChange={set('jira_base_url')}
                placeholder="https://yourcompany.atlassian.net"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JIRA Email</label>
              <input type="email" value={form.jira_email} onChange={set('jira_email')}
                placeholder="you@company.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JIRA API Token</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.jira_api_token}
                  onChange={set('jira_api_token')}
                  placeholder={form.jira_api_token === '***' ? 'Saved (enter new to update)' : 'Your JIRA API token'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 pr-10"
                />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Get it from: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" className="text-primary-600 hover:underline" rel="noreferrer">Atlassian Account → API tokens</a>
              </p>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {testResult.message}
              </div>
            )}

            <button type="button" onClick={testJira} disabled={testing}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              <TestTube2 className="w-4 h-4" />
              {testing ? 'Testing…' : 'Test JIRA Connection'}
            </button>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-5 h-5 text-violet-500" />
            <h2 className="font-semibold text-gray-900">AI Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.openai_api_key}
                  onChange={set('openai_api_key')}
                  placeholder={form.openai_api_key === '***' ? 'Saved (enter new to update)' : 'sk-…'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 pr-10"
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Get it from: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary-600 hover:underline" rel="noreferrer">OpenAI Platform → API Keys</a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
              <select value={form.ai_model} onChange={set('ai_model')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                <option value="gpt-4o">GPT-4o (Recommended)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Faster)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
