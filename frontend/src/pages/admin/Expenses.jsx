import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ event_id: '', category: '', description: '', amount: '', paid_by: '' })

  function load() {
    api.get('/admin/expenses').then((r) => setExpenses(r.data))
  }
  useEffect(load, [])

  async function handleSubmit(e) {
    e.preventDefault()
    await api.post('/admin/expenses', { ...form, event_id: form.event_id ? Number(form.event_id) : null })
    setForm({ event_id: '', category: '', description: '', amount: '', paid_by: '' })
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Expenses</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
          {expenses.map((e) => (
            <div key={e.id} className="px-5 py-3 flex justify-between">
              <div>
                <p className="font-medium text-stone-800">{e.description || e.category}</p>
                <p className="text-xs text-stone-500">
                  {e.event_id ? `Event #${e.event_id}` : 'General overhead'}
                </p>
              </div>
              <span className="font-medium">KES {Number(e.amount).toLocaleString()}</span>
            </div>
          ))}
          {expenses.length === 0 && <p className="px-5 py-6 text-stone-400">No expenses logged yet.</p>}
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 h-fit">
          <h2 className="font-semibold text-stone-800">Log an Expense</h2>
          <input placeholder="Event ID (leave blank for overhead)" value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input required type="number" placeholder="Amount (KES)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="Paid by" value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <button className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700">Log Expense</button>
        </form>
      </div>
    </div>
  )
}
