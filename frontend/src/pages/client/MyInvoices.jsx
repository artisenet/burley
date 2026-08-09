import { useEffect, useState } from 'react'
import api, { downloadFile } from '../../api/client'

export default function MyInvoices() {
  const [invoices, setInvoices] = useState([])
  const [payingId, setPayingId] = useState(null)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState(null)

  function load() {
    api.get('/client/invoices').then((r) => setInvoices(r.data))
  }
  useEffect(load, [])

  async function pay(scheduleItemId) {
    setStatus('sending')
    try {
      const res = await api.post(`/client/invoices/schedule-items/${scheduleItemId}/pay`, { phone_number: phone })
      setStatus('pending')
      poll(res.data.transaction_id)
    } catch (err) {
      setStatus(null)
      alert(err.response?.data?.error || 'Could not start payment.')
    }
  }

  function poll(txnId) {
    const interval = setInterval(async () => {
      const res = await api.get(`/payments/${txnId}/status`)
      if (res.data.status === 'success') {
        clearInterval(interval)
        setStatus('success')
        setPayingId(null)
        load()
      } else if (res.data.status === 'failed') {
        clearInterval(interval)
        setStatus('failed')
      }
    }, 3000)
    setTimeout(() => clearInterval(interval), 120000)
  }

  async function downloadInvoice(invoiceId) {
    try {
      await downloadFile(`/client/invoices/${invoiceId}/pdf`, `invoice-${invoiceId}.pdf`)
    } catch (err) {
      alert(err.message)
    }
  }

  async function downloadReceipt(scheduleItemId) {
    try {
      await downloadFile(`/client/invoices/schedule-items/${scheduleItemId}/receipt.pdf`, `receipt-${scheduleItemId}.pdf`)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-6">My Invoices</h1>
      <div className="grid gap-4">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white rounded-lg border border-stone-200 p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="font-medium text-stone-800">Invoice #{inv.id}</p>
              <span className="font-semibold">KES {Number(inv.total_amount).toLocaleString()}</span>
            </div>
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {inv.schedule_items.map((s) => (
                <div key={s.id} className="py-2 flex justify-between items-center text-sm">
                  <span className="capitalize text-stone-600">
                    {s.label} - KES {Number(s.amount_due).toLocaleString()}
                  </span>
                  {s.status === 'paid' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 text-xs">Paid</span>
                      <button onClick={() => downloadReceipt(s.id)} className="text-burley-600 text-xs hover:underline">
                        Receipt
                      </button>
                    </div>
                  ) : payingId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        placeholder="2547XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="rounded border border-stone-300 px-2 py-1 text-xs w-32"
                      />
                      <button onClick={() => pay(s.id)} className="text-burley-600 text-xs hover:underline">
                        {status === 'pending' ? 'Waiting...' : 'Send Prompt'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setPayingId(s.id)} className="text-burley-600 text-xs hover:underline">
                      Pay Now
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => downloadInvoice(inv.id)}
              className="mt-3 text-xs text-stone-500 hover:text-burley-600 hover:underline"
            >
              Download Invoice PDF
            </button>
          </div>
        ))}
        {invoices.length === 0 && <p className="text-stone-400">No invoices yet.</p>}
      </div>
    </div>
  )
}
