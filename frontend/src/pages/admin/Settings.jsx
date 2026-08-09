import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Settings() {
  const [form, setForm] = useState({
    client_id: '',
    client_secret: '',
    merchant_code: '',
    base_url: '',
    callback_base_url: '',
  })
  const [secretConfigured, setSecretConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    api.get('/admin/settings/sasapay').then((r) => {
      setForm({
        client_id: r.data.client_id,
        client_secret: '',
        merchant_code: r.data.merchant_code,
        base_url: r.data.base_url,
        callback_base_url: r.data.callback_base_url,
      })
      setSecretConfigured(r.data.client_secret_configured)
    }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await api.post('/admin/settings/sasapay', form)
      setSaved(true)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-stone-500">Loading settings...</p>

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-2">Settings</h1>
      <p className="text-stone-500 text-sm mb-8">
        Payment provider credentials. Changes here take effect immediately - no restart needed.
      </p>

      <div className="bg-white rounded-lg border border-stone-200 p-6 max-w-xl">
        <h2 className="font-semibold text-stone-800 mb-1">SasaPay</h2>
        <p className="text-stone-500 text-xs mb-5">
          Get these from your SasaPay Developer Portal (Sandbox or Production Apps tab).
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Client ID</label>
            <input
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              placeholder="e.g. zS7OLYfP7L96..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">
              Client Secret {secretConfigured && <span className="text-green-600 text-xs font-normal">(currently set)</span>}
            </label>
            <input
              type="password"
              value={form.client_secret}
              onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              placeholder={secretConfigured ? 'Leave blank to keep current secret' : 'Paste your client secret'}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Merchant Code</label>
            <input
              value={form.merchant_code}
              onChange={(e) => setForm({ ...form, merchant_code: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              placeholder="Shown on your SasaPay merchant dashboard"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">API Base URL</label>
            <input
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              placeholder="https://sandbox.sasapay.app"
            />
            <p className="text-xs text-stone-400 mt-1">
              Sandbox by default. SasaPay doesn't use one fixed production URL - once you
              create a Production App in their developer portal, paste the URL it gives you here.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 block mb-1">Callback Base URL</label>
            <input
              value={form.callback_base_url}
              onChange={(e) => setForm({ ...form, callback_base_url: e.target.value })}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              placeholder="https://your-ngrok-url.ngrok-free.app"
            />
            <p className="text-xs text-stone-400 mt-1">
              Must be a publicly reachable HTTPS URL - use ngrok (or similar) for local testing.
              SasaPay sends payment results here.
            </p>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {saved && <p className="text-green-600 text-sm">Settings saved.</p>}

          <button
            disabled={saving}
            className="rounded-full bg-burley-600 text-white px-6 py-2 text-sm hover:bg-burley-700 disabled:opacity-50 justify-self-start"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
