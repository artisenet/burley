import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import ClientLayout from './layouts/ClientLayout'

import Landing from './pages/public/Landing'
import Booking from './pages/public/Booking'
import BlogList from './pages/public/BlogList'
import BlogPostPage from './pages/public/BlogPost'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

import Overview from './pages/admin/Overview'
import Calendar from './pages/admin/Calendar'
import Leads from './pages/admin/Leads'
import Quotes from './pages/admin/Quotes'
import Invoices from './pages/admin/Invoices'
import Wallet from './pages/admin/Wallet'
import Events from './pages/admin/Events'
import AdminEventDetail from './pages/admin/EventDetail'
import Catalog from './pages/admin/Catalog'
import Media from './pages/admin/Media'
import Staff from './pages/admin/Staff'
import Payouts from './pages/admin/Payouts'
import Vendors from './pages/admin/Vendors'
import Expenses from './pages/admin/Expenses'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'
import Blog from './pages/admin/Blog'
import Reviews from './pages/admin/Reviews'

import MyEvents from './pages/client/MyEvents'
import BookServices from './pages/client/BookServices'
import LeaveReview from './pages/client/LeaveReview'
import MyInvoices from './pages/client/MyInvoices'
import MyQuotes from './pages/client/MyQuotes'
import EventDetail from './pages/client/EventDetail'
import Portfolio from './pages/client/Portfolio'
import RequestQuote from './pages/client/RequestQuote'
import ClientOverview from './pages/client/ClientOverview'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/book" element={<Booking />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="leads" element={<Leads />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<AdminEventDetail />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="media" element={<Media />} />
            <Route path="staff" element={<Staff />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="blog" element={<Blog />} />
            <Route path="reviews" element={<Reviews />} />
          </Route>

          {/* Client portal */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClientOverview />} />
            <Route path="events" element={<MyEvents />} />
            <Route path="book-services" element={<BookServices />} />
            <Route path="leave-review" element={<LeaveReview />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="quotes" element={<MyQuotes />} />
            <Route path="invoices" element={<MyInvoices />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="request-quote" element={<RequestQuote />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
