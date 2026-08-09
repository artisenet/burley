import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [form, setForm] = useState({
    name: '', email: '', phone: '', employment_type: 'casual',
    pay_structure: 'per_event', rate_amount: '', mpesa_number: '',
  })
  const [error, setError] = useState(null)

  function load() {
    api.get('/admin/staff').then((r) => setStaff(r.data))
  }
  useEffect(load, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/admin/staff', form)
      setForm({ name: '', email: '', phone: '', employment_type: 'casual', pay_structure: 'per_event', rate_amount: '', mpesa_number: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add staff member.')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Staff & Casuals</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-stone-200 overflow-hidden h-fit">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Pay Structure</th>
                <th className="px-4 py-3">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 capitalize">{s.employment_type}</td>
                  <td className="px-4 py-3 capitalize">{s.pay_structure.replace('_', ' ')}</td>
                  <td className="px-4 py-3">KES {s.rate_amount}</td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-stone-400">No staff yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 h-fit">
          <h2 className="font-semibold text-stone-800">Add Staff Member</h2>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="M-Pesa number" value={form.mpesa_number} onChange={(e) => setForm({ ...form, mpesa_number: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="casual">Casual</option>
            <option value="permanent">Permanent</option>
          </select>
          <select value={form.pay_structure} onChange={(e) => setForm({ ...form, pay_structure: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="per_event">Per Event</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input required type="number" placeholder="Rate (KES)" value={form.rate_amount} onChange={(e) => setForm({ ...form, rate_amount: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <button className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700">Add Staff Member</button>
        </form>
      </div>
    </div>
  )
}
