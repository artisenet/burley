import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ClientLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="font-display text-xl text-burley-700">Burley Events</span>
          <div className="flex items-center gap-6 text-sm">
            <NavLink to="/portal" end className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              Overview
            </NavLink>
            <NavLink to="/portal/events" className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              My Events
            </NavLink>
            <NavLink to="/portal/book-services" className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              Book Services
            </NavLink>
            <NavLink to="/portal/leave-review" className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              Leave a Review
            </NavLink>
            <NavLink to="/portal/quotes" className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              Quotes
            </NavLink>
            <NavLink to="/portal/invoices" className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              Invoices
            </NavLink>
            <NavLink to="/portal/portfolio" className={({ isActive }) => isActive ? 'text-burley-700 font-medium' : 'text-stone-600'}>
              Portfolio
            </NavLink>
            <NavLink
              to="/portal/request-quote"
              className={({ isActive }) => `rounded-full px-3 py-1.5 ${isActive ? 'bg-burley-700 text-white' : 'bg-burley-600 text-white hover:bg-burley-700'}`}
            >
              Request a quote
            </NavLink>
            <span className="text-stone-400">{user?.name}</span>
            <button onClick={logout} className="text-stone-400 hover:text-burley-600">Sign out</button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
