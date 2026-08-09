import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Payouts() {
  const [pending, setPending] = useState([])
  const [payouts, setPayouts] = useState([])

  function load() {
    api.get('/admin/payouts/pending-by-staff').then((r) => setPending(r.data))
    api.get('/admin/payouts').then((r) => setPayouts(r.data))
  }
  useEffect(load, [])

  async function generate(userId) {
    try {
      await api.post('/admin/payouts/generate', { user_id: userId })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not generate payout.')
    }
  }

  async function disburse(payoutId) {
    const phone = prompt('Phone number to send payout to (2547XXXXXXXX):')
    if (!phone) return
    try {
      await api.post(`/admin/payouts/${payoutId}/disburse`, { phone_number: phone })
      alert('Payout initiated via SasaPay.')
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Could not disburse payout.')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Payouts</h1>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Pending by Staff Member</h2>
      <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100 mb-10">
        {pending.map((p) => (
          <div key={p.user_id} className="px-5 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-stone-800">{p.name}</p>
              <p className="text-xs text-stone-500 capitalize">
                {p.pay_structure?.replace('_', ' ')} - {p.assignment_count} unpaid assignment(s)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium">KES {p.total_owed.toLocaleString()}</span>
              <button
                onClick={() => generate(p.user_id)}
                className="rounded-full bg-burley-600 text-white text-xs px-4 py-2 hover:bg-burley-700"
              >
                Generate Payout
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="px-5 py-6 text-stone-400">Nothing owed right now.</p>}
      </div>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Payout Batches</h2>
      <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
        {payouts.map((p) => (
          <div key={p.id} className="px-5 py-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-stone-800">Payout #{p.id} - Staff #{p.user_id}</p>
              <p className="text-xs text-stone-500">
                {p.period_start ? `${p.period_start} to ${p.period_end}` : 'Per-event settlement'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium">KES {Number(p.total_amount).toLocaleString()}</span>
              {p.status === 'paid' ? (
                <span className="text-green-600 text-xs">Paid</span>
              ) : (
                <button onClick={() => disburse(p.id)} className="text-burley-600 text-xs hover:underline">
                  Disburse via SasaPay
                </button>
              )}
            </div>
          </div>
        ))}
        {payouts.length === 0 && <p className="px-5 py-6 text-stone-400">No payout batches yet.</p>}
      </div>
    </div>
  )
}
