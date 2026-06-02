import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '../api/client'

export default function ApprovalHandler() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const action = searchParams.get('action') || 'approve'
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.post(`/approvals/token/${token}/action?action=${action}`)
      .then(({ data }) => {
        setStatus('success')
        setMessage(data.message || `Request ${data.status}`)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Failed to process request')
      })
  }, [token, action])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Processing approval…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">Done!</h2>
            <p className="text-gray-500 mt-1 text-sm">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900">Error</h2>
            <p className="text-gray-500 mt-1 text-sm">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
