import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

const STAGES = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'consultation_booked', label: 'Consultation' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'won', label: 'Won' },
]

const SOURCE_LABELS = {
  website_booking: 'Website booking',
  contact_form: 'Contact form',
  client_portal: 'Existing client',
  manual: 'Manual entry',
}

const SOURCE_COLORS = {
  website_booking: 'bg-blue-100 text-blue-700',
  contact_form: 'bg-purple-100 text-purple-700',
  client_portal: 'bg-green-100 text-green-700',
  manual: 'bg-stone-100 text-stone-600',
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(isoString).toLocaleDateString()
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [showLost, setShowLost] = useState(false)
  const navigate = useNavigate()

  function load() {
    api.get('/admin/leads').then((r) => setLeads(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function updateStatus(leadId, status) {
    await api.put(`/admin/leads/${leadId}`, { status })
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)))
  }

  async function convertToClient(leadId) {
    try {
      const res = await api.post(`/admin/leads/${leadId}/convert`)
      if (res.data.created) {
        alert(
          `Client account created.\n\nEmail: ${res.data.user.email}\nTemporary password: ${res.data.temporary_password}\n\nShare these with the client directly - this password is shown only once.`
        )
      } else {
        alert(`This lead is already linked to an existing client account (${res.data.user.email}).`)
      }
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, client_user_id: res.data.user.id } : l)))
    } catch (err) {
      alert(err.response?.data?.error || 'Could not convert this lead.')
    }
  }

  function createQuoteFor(lead) {
    if (lead.client_user_id) {
      navigate(`/admin/quotes?client_id=${lead.client_user_id}`)
    } else {
      alert('Convert this lead to a client account first, then create a quote for them.')
    }
  }

  const sources = ['all', ...new Set(leads.map((l) => l.source).filter(Boolean))]

  const filtered = leads.filter((l) => {
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.name?.toLowerCase().includes(q) && !l.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const lostLeads = filtered.filter((l) => l.status === 'lost')
  const byStage = (stageKey) => filtered.filter((l) => l.status === stageKey)

  if (loading) return <p className="text-stone-500">Loading...</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl text-stone-800">Leads & CRM</h1>
        <span className="text-sm text-stone-500">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          {sources.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All sources' : (SOURCE_LABELS[s] || s)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {STAGES.map((stage) => {
          const stageLeads = byStage(stage.key)
          return (
            <div key={stage.key} className="bg-stone-50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-3 px-1">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{stage.label}</p>
                <span className="text-xs text-stone-400">{stageLeads.length}</span>
              </div>
              <div className="grid gap-2">
                {stageLeads.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-lg border border-stone-200 p-3">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <p className="font-medium text-sm text-stone-800">{lead.name}</p>
                      <span className="text-xs text-stone-400 whitespace-nowrap">{timeAgo(lead.created_at)}</span>
                    </div>
                    {lead.source && (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${SOURCE_COLORS[lead.source] || 'bg-stone-100 text-stone-600'}`}>
                        {SOURCE_LABELS[lead.source] || lead.source}
                      </span>
                    )}
                    {lead.notes && (
                      <button
                        onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        className="block text-xs text-stone-500 text-left mb-2 hover:text-stone-700"
                      >
                        {expandedId === lead.id ? (
                          <span className="whitespace-pre-wrap">{lead.notes}</span>
                        ) : (
                          <span className="line-clamp-2">{lead.notes.slice(0, 60)}{lead.notes.length > 60 ? '...' : ''}</span>
                        )}
                      </button>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-100">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="text-xs border border-stone-200 rounded px-1.5 py-1"
                      >
                        {[...STAGES.map((s) => s.key), 'lost'].map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                      {lead.client_user_id ? (
                        <button
                          onClick={() => createQuoteFor(lead)}
                          className="text-xs text-burley-600 hover:underline whitespace-nowrap"
                        >
                          + Quote
                        </button>
                      ) : (
                        <button
                          onClick={() => convertToClient(lead.id)}
                          className="text-xs text-stone-500 hover:underline whitespace-nowrap"
                        >
                          Convert
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <p className="text-xs text-stone-300 text-center py-4">Empty</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {lostLeads.length > 0 && (
        <div>
          <button
            onClick={() => setShowLost(!showLost)}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            {showLost ? 'Hide' : 'Show'} {lostLeads.length} lost lead{lostLeads.length !== 1 ? 's' : ''}
          </button>
          {showLost && (
            <div className="grid gap-2 mt-3">
              {lostLeads.map((lead) => (
                <div key={lead.id} className="bg-white rounded-lg border border-stone-200 p-3 flex justify-between items-center opacity-60">
                  <div>
                    <p className="text-sm text-stone-700">{lead.name}</p>
                    <p className="text-xs text-stone-400">{lead.email}</p>
                  </div>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="text-xs border border-stone-200 rounded px-1.5 py-1"
                  >
                    {[...STAGES.map((s) => s.key), 'lost'].map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
