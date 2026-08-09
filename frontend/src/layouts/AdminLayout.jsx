import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/calendar', label: 'Calendar' },
  { to: '/admin/leads', label: 'Leads & CRM' },
  { to: '/admin/quotes', label: 'Quotes' },
  { to: '/admin/invoices', label: 'Invoices' },
  { to: '/admin/wallet', label: 'Wallet' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/catalog', label: 'Services & Pricing' },
  { to: '/admin/media', label: 'Portfolio & Media' },
  { to: '/admin/staff', label: 'Staff & Casuals' },
  { to: '/admin/payouts', label: 'Payouts' },
  { to: '/admin/vendors', label: 'Vendors' },
  { to: '/admin/expenses', label: 'Expenses' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/blog', label: 'Blog' },
  { to: '/admin/reviews', label: 'Reviews' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex bg-stone-50">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="px-6 py-5 border-b border-stone-200">
          <span className="font-display text-xl text-burley-700">Burley Events</span>
          <p className="text-xs text-stone-400 mt-1">Admin</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-6 py-2.5 text-sm ${
                  isActive
                    ? 'bg-burley-50 text-burley-700 font-medium border-r-2 border-burley-600'
                    : 'text-stone-600 hover:bg-stone-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-stone-200 text-sm">
          <p className="text-stone-700">{user?.name}</p>
          <button onClick={logout} className="text-stone-400 hover:text-burley-600 text-xs mt-1">
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 p-8 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
