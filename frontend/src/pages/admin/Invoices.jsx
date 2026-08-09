import { useEffect, useState } from 'react'
import api, { downloadFile } from '../../api/client'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    api.get('/admin/invoices').then((r) => setInvoices(r.data))
  }, [])

  async function collect(scheduleItemId) {
    const phone = prompt('Client M-Pesa phone number (2547XXXXXXXX):')
    if (!phone) return
    try {
      await api.post(`/admin/invoices/schedule-items/${scheduleItemId}/collect`, { phone_number: phone })
      alert('Payment prompt sent to the client.')
    } catch (err) {
      alert(err.response?.data?.error || 'Could not initiate payment.')
    }
  }

  async function markPaid(scheduleItemId) {
    if (!confirm('Mark this as paid via cash/bank transfer?')) return
    await api.post(`/admin/invoices/schedule-items/${scheduleItemId}/mark-paid-manual`)
    api.get('/admin/invoices').then((r) => setInvoices(r.data))
  }

  async function downloadInvoice(invoiceId) {
    try {
      await downloadFile(`/admin/invoices/${invoiceId}/pdf`, `invoice-${invoiceId}.pdf`)
    } catch (err) {
      alert(err.message)
    }
  }

  async function downloadReceipt(scheduleItemId) {
    try {
      await downloadFile(`/admin/invoices/schedule-items/${scheduleItemId}/receipt.pdf`, `receipt-${scheduleItemId}.pdf`)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Invoices</h1>
      <div className="grid gap-4">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white rounded-lg border border-stone-200 p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-medium text-stone-800">Invoice #{inv.id}</p>
                <p className="text-sm text-stone-500">Client #{inv.client_id}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">KES {Number(inv.total_amount).toLocaleString()}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    inv.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : inv.status === 'partial'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
            </div>
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {inv.schedule_items.map((s) => (
                <div key={s.id} className="py-2 flex justify-between items-center text-sm">
                  <span className="capitalize text-stone-600">
                    {s.label} - KES {Number(s.amount_due).toLocaleString()} (due {s.due_date || 'n/a'})
                  </span>
                  {s.status === 'paid' ? (
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 text-xs">Paid</span>
                      <button onClick={() => downloadReceipt(s.id)} className="text-burley-600 text-xs hover:underline">
                        Receipt
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => collect(s.id)} className="text-burley-600 text-xs hover:underline">
                        Collect via SasaPay
                      </button>
                      <button onClick={() => markPaid(s.id)} className="text-stone-500 text-xs hover:underline">
                        Mark paid manually
                      </button>
                    </div>
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
