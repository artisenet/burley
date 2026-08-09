import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PublicLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl text-burley-700">
            Burley Events
          </Link>
          <nav className="flex items-center gap-6 text-sm text-stone-600">
            <Link to="/" className="hover:text-burley-600">Home</Link>
            <Link to="/book" className="hover:text-burley-600">Book a Consultation</Link>
            <Link to="/blog" className="hover:text-burley-600">Blog</Link>
            {user ? (
              <Link
                to={user.role === 'admin' ? '/admin' : '/portal'}
                className="rounded-full bg-burley-600 text-white px-4 py-2 hover:bg-burley-700"
              >
                {user.role === 'admin' ? 'Dashboard' : 'My Account'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-burley-600 text-white px-4 py-2 hover:bg-burley-700"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-sm text-stone-500 flex justify-between">
          <span>&copy; {new Date().getFullYear()} Burley Events. All rights reserved.</span>
          <span>Nairobi, Kenya</span>
        </div>
      </footer>
    </div>
  )
}
