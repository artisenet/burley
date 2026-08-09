import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Vendors() {
  const [vendors, setVendors] = useState([])
  const [form, setForm] = useState({ name: '', category: '', contact_info: '', notes: '' })

  function load() {
    api.get('/admin/vendors').then((r) => setVendors(r.data))
  }
  useEffect(load, [])

  async function handleSubmit(e) {
    e.preventDefault()
    await api.post('/admin/vendors', form)
    setForm({ name: '', category: '', contact_info: '', notes: '' })
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Vendors</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
          {vendors.map((v) => (
            <div key={v.id} className="px-5 py-3">
              <p className="font-medium text-stone-800">{v.name}</p>
              <p className="text-xs text-stone-500">{v.category} - {v.contact_info}</p>
            </div>
          ))}
          {vendors.length === 0 && <p className="px-5 py-6 text-stone-400">No vendors yet.</p>}
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 h-fit">
          <h2 className="font-semibold text-stone-800">Add Vendor</h2>
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="Category (florist, caterer...)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input placeholder="Contact info" value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <button className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700">Add Vendor</button>
        </form>
      </div>
    </div>
  )
}
