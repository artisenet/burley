import { useEffect, useState } from 'react'
import api from '../../api/client'

const DIRECTION_STYLES = {
  collection: 'text-green-700 bg-green-100',
  payout: 'text-red-700 bg-red-100',
}

export default function Wallet() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/wallet').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-stone-500">Loading wallet...</p>
  if (!data) return null

  const { live_balance, live_balance_error, ledger, recent_transactions } = data

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <p className="text-stone-500 text-sm mb-1">SasaPay Live Balance</p>
          {live_balance ? (
            <>
              <p className="text-3xl font-semibold text-stone-800">
                {live_balance.currency} {Number(live_balance.total_balance).toLocaleString()}
              </p>
              <div className="grid gap-1 mt-3">
                {live_balance.accounts.map((acc) => (
                  <div key={acc.account_label} className="flex justify-between text-xs text-stone-500">
                    <span>{acc.account_label}</span>
                    <span>{live_balance.currency} {Number(acc.account_balance).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="text-stone-400 text-sm">Not available</p>
              {live_balance_error && (
                <p className="text-xs text-amber-600 mt-1">
                  {live_balance_error.includes('401') || live_balance_error.includes('403')
                    ? 'SasaPay credentials not configured yet - add them to .env to see a live balance.'
                    : live_balance_error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <p className="text-stone-500 text-sm mb-3">Local Ledger (all-time)</p>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Money in ({ledger.collection_count} collections)</span>
              <span className="text-green-700 font-medium">+KES {ledger.total_in.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Money out ({ledger.payout_count} payouts)</span>
              <span className="text-red-700 font-medium">-KES {ledger.total_out.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-stone-100 pt-2 mt-1">
              <span>Net</span>
              <span>KES {ledger.net.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Recent Transactions</h2>
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-left">
            <tr>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {recent_transactions.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${DIRECTION_STYLES[t.direction] || ''}`}>
                    {t.direction}
                  </span>
                </td>
                <td className="px-4 py-3">KES {Number(t.amount).toLocaleString()}</td>
                <td className="px-4 py-3 capitalize">{t.status}</td>
                <td className="px-4 py-3 text-stone-500 text-xs">{t.account_reference || t.provider_ref || '-'}</td>
                <td className="px-4 py-3 text-stone-500 text-xs">
                  {t.confirmed_at ? new Date(t.confirmed_at).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
            {recent_transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-400">
                  No completed transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
