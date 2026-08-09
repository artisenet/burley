import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import api from '../../api/client'

const PIPELINE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  consultation_booked: 'Consultation',
  quoted: 'Quoted',
  won: 'Won',
}

const ATTENTION_COPY = {
  overdue_invoices: (item) => `${item.count} invoice${item.count > 1 ? 's' : ''} overdue - KES ${item.total.toLocaleString()}`,
  pending_quotes: (item) => `${item.count} quote${item.count > 1 ? 's' : ''} awaiting client decision`,
  pending_payouts: (item) => `KES ${item.total.toLocaleString()} owed across ${item.count} pending payout${item.count > 1 ? 's' : ''}`,
}

const ATTENTION_LINKS = {
  overdue_invoices: '/admin/invoices',
  pending_quotes: '/admin/quotes',
  pending_payouts: '/admin/payouts',
}

const ACTIVITY_COLOR = {
  quote_accepted: 'text-green-600',
  payment_received: 'text-burley-600',
  event_confirmed: 'text-stone-500',
}

export default function Overview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/admin/overview').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!data || !chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: data.revenue_trend.map((t) => t.label),
        datasets: [
          {
            data: data.revenue_trend.map((t) => t.revenue),
            borderColor: '#c2692f',
            backgroundColor: 'rgba(194,105,47,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#c2692f',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: (v) => `${(v / 1000).toFixed(0)}K` } },
          x: { grid: { display: false } },
        },
      },
    })

    return () => {
      if (chartInstance.current) chartInstance.current.destroy()
    }
  }, [data])

  if (loading) return <p className="text-stone-500">Loading dashboard...</p>
  if (!data) return null

  const { stats, needs_attention, pipeline, upcoming_events, top_clients, recent_activity } = data
  const pipelineMax = Math.max(1, ...Object.values(pipeline))

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-6">Overview</h1>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => navigate('/admin/quotes')}
          className="flex-1 rounded-lg border border-stone-300 py-2 text-sm hover:bg-stone-50"
        >
          + New quote
        </button>
        <button
          onClick={() => navigate('/admin/leads')}
          className="flex-1 rounded-lg border border-stone-300 py-2 text-sm hover:bg-stone-50"
        >
          + Add lead
        </button>
        <button
          onClick={() => navigate('/admin/expenses')}
          className="flex-1 rounded-lg border border-stone-300 py-2 text-sm hover:bg-stone-50"
        >
          + Log expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active events"
          value={stats.active_events.value}
          delta={stats.active_events.delta_count !== 0 ? `${stats.active_events.delta_count > 0 ? '+' : ''}${stats.active_events.delta_count} vs last month` : null}
          good={stats.active_events.delta_count >= 0}
        />
        <StatCard
          label="Leads in pipeline"
          value={stats.leads_pipeline.value}
          delta={stats.leads_pipeline.delta_count !== 0 ? `${stats.leads_pipeline.delta_count > 0 ? '+' : ''}${stats.leads_pipeline.delta_count} vs last month` : null}
          good={stats.leads_pipeline.delta_count >= 0}
        />
        <StatCard
          label="Revenue this month"
          value={`KES ${stats.revenue_this_month.value.toLocaleString()}`}
          delta={stats.revenue_this_month.delta_pct !== null ? `${stats.revenue_this_month.delta_pct > 0 ? '+' : ''}${stats.revenue_this_month.delta_pct}% vs last month` : null}
          good={stats.revenue_this_month.delta_pct === null || stats.revenue_this_month.delta_pct >= 0}
        />
        <StatCard
          label="Avg margin"
          value={stats.avg_margin_pct !== null ? `${stats.avg_margin_pct}%` : '-'}
          delta={stats.avg_margin_pct !== null ? (stats.avg_margin_pct < 35 ? `${(35 - stats.avg_margin_pct).toFixed(1)}pts below target` : 'At or above target') : null}
          good={stats.avg_margin_pct === null || stats.avg_margin_pct >= 35}
        />
      </div>

      {needs_attention.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-lg text-stone-800 mb-3">Needs attention today</h2>
          <div className="bg-white rounded-lg border border-amber-200 divide-y divide-amber-100">
            {needs_attention.map((item) => (
              <button
                key={item.type}
                onClick={() => navigate(ATTENTION_LINKS[item.type])}
                className="w-full text-left px-5 py-3 flex justify-between items-center hover:bg-amber-50"
              >
                <span className="text-sm text-stone-700">{ATTENTION_COPY[item.type](item)}</span>
                <span className="text-stone-400">&rarr;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">Lead pipeline</h2>
          <div className="grid gap-2.5">
            {Object.entries(pipeline).map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs text-stone-500 w-24">{PIPELINE_LABELS[stage]}</span>
                <div className="flex-1 bg-stone-100 rounded h-4">
                  <div
                    className="bg-burley-500 h-4 rounded"
                    style={{ width: `${(count / pipelineMax) * 100}%` }}
                  />
                </div>
                <span className="text-xs w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">Upcoming events</h2>
          <div className="divide-y divide-stone-100">
            {upcoming_events.map((e) => (
              <div key={e.id} className="py-2">
                <p className="text-sm font-medium text-stone-800">{e.venue || 'Venue TBC'}</p>
                <p className="text-xs text-stone-500">{e.event_date}</p>
              </div>
            ))}
            {upcoming_events.length === 0 && (
              <p className="text-stone-400 text-sm py-2">Nothing scheduled yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-5 mb-8">
        <h2 className="font-semibold text-stone-800 mb-4">Revenue, last 6 months</h2>
        <div style={{ position: 'relative', height: '220px' }}>
          <canvas ref={chartRef} role="img" aria-label="Line chart of revenue over the last six months" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">Top clients</h2>
          <div className="divide-y divide-stone-100">
            {top_clients.map((c) => (
              <div key={c.client_id} className="py-2 flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="text-stone-500">
                  KES {c.total_invoiced.toLocaleString()} - {c.invoice_count} invoice{c.invoice_count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
            {top_clients.length === 0 && <p className="text-stone-400 text-sm py-2">No client data yet.</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">Recent activity</h2>
          <div className="grid gap-2.5">
            {recent_activity.map((a, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className={ACTIVITY_COLOR[a.type]}>{a.message}</span>
                <span className="text-stone-400 text-xs whitespace-nowrap ml-2">
                  {new Date(a.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
            {recent_activity.length === 0 && <p className="text-stone-400 text-sm">No activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, delta, good }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <p className="text-stone-500 text-sm mb-1">{label}</p>
      <p className="text-2xl font-semibold text-stone-800">{value}</p>
      {delta && (
        <p className={`text-xs mt-1 ${good ? 'text-green-600' : 'text-red-600'}`}>{delta}</p>
      )}
    </div>
  )
}
