import { useEffect, useState } from 'react'
import api, { downloadFile } from '../../api/client'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function Reports() {
  const [marginByCategory, setMarginByCategory] = useState([])
  const [topClients, setTopClients] = useState([])

  const now = new Date()
  const [statementYear, setStatementYear] = useState(now.getFullYear())
  const [statementMonth, setStatementMonth] = useState(now.getMonth() + 1)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.get('/admin/reports/margin-by-category').then((r) => setMarginByCategory(r.data))
    api.get('/admin/reports/top-clients').then((r) => setTopClients(r.data))
  }, [])

  async function downloadStatement() {
    setDownloading(true)
    try {
      await downloadFile(
        `/admin/reports/monthly-statement.pdf?year=${statementYear}&month=${statementMonth}`,
        `statement-${statementYear}-${String(statementMonth).padStart(2, '0')}.pdf`
      )
    } catch (err) {
      alert(err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Reports</h1>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Monthly Statement</h2>
      <div className="bg-white rounded-lg border border-stone-200 p-5 mb-10 flex items-center gap-3">
        <select
          value={statementMonth}
          onChange={(e) => setStatementMonth(Number(e.target.value))}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
        <input
          type="number"
          value={statementYear}
          onChange={(e) => setStatementYear(Number(e.target.value))}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm w-24"
        />
        <button
          onClick={downloadStatement}
          disabled={downloading}
          className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700 disabled:opacity-50"
        >
          {downloading ? 'Preparing...' : 'Download Statement PDF'}
        </button>
      </div>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Margin by Category</h2>
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-left">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Total Cost</th>
              <th className="px-4 py-3">Total Price</th>
              <th className="px-4 py-3">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {marginByCategory.map((row) => (
              <tr key={row.category} className={row.below_floor ? 'bg-amber-50' : ''}>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">KES {row.total_cost.toLocaleString()}</td>
                <td className="px-4 py-3">KES {row.total_price.toLocaleString()}</td>
                <td className={`px-4 py-3 font-medium ${row.below_floor ? 'text-amber-700' : 'text-green-700'}`}>
                  {row.margin_pct !== null ? `${row.margin_pct}%` : '-'}
                </td>
              </tr>
            ))}
            {marginByCategory.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-stone-400">No accepted quotes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold text-lg text-stone-800 mb-3">Top Clients</h2>
      <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
        {topClients.map((c) => (
          <div key={c.client_id} className="px-5 py-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-stone-800">{c.name}</p>
              <p className="text-xs text-stone-500">{c.email} - {c.invoice_count} invoice(s)</p>
            </div>
            <span className="font-medium">KES {c.total_invoiced.toLocaleString()}</span>
          </div>
        ))}
        {topClients.length === 0 && <p className="px-5 py-6 text-stone-400">No client data yet.</p>}
      </div>
    </div>
  )
}
