import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

export default function BookServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({}) // { service_id: quantity }
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/client/services').then((r) => setServices(r.data)).finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(services.map((s) => s.category || 'Other'))]

  function setQuantity(serviceId, quantity) {
    setCart((prev) => {
      const next = { ...prev }
      if (quantity <= 0) {
        delete next[serviceId]
      } else {
        next[serviceId] = quantity
      }
      return next
    })
  }

  const cartItems = Object.entries(cart).map(([serviceId, quantity]) => {
    const service = services.find((s) => s.id === Number(serviceId))
    return { service, quantity }
  }).filter((i) => i.service)

  const total = cartItems.reduce((sum, i) => sum + i.service.selling_price * i.quantity, 0)

  async function submitRequest() {
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/client/bookings', {
        items: cartItems.map((i) => ({ service_id: i.service.id, quantity: i.quantity })),
      })
      navigate('/portal/quotes')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit your booking request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-stone-500">Loading services...</p>

  return (
    <div>
      <h1 className="font-display text-2xl text-stone-800 mb-2">Book Services</h1>
      <p className="text-stone-500 text-sm mb-6">
        Already know what you need? Pick your services below and submit - we'll confirm pricing and send you a quote to accept, no consultation required.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid gap-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="font-semibold text-stone-700 mb-3">{cat}</h2>
              <div className="grid gap-3">
                {services.filter((s) => (s.category || 'Other') === cat).map((s) => (
                  <div key={s.id} className="bg-white rounded-lg border border-stone-200 p-4 flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-stone-800 text-sm">{s.name}</p>
                      {s.description && <p className="text-xs text-stone-500 mt-0.5">{s.description}</p>}
                      <p className="text-sm text-burley-700 mt-1">
                        KES {s.selling_price.toLocaleString()} {s.unit === 'per_guest' ? '/ guest' : s.unit === 'per_hour' ? '/ hour' : ''}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={cart[s.id] || ''}
                      onChange={(e) => setQuantity(s.id, Number(e.target.value))}
                      className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-center"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && <p className="text-stone-400">No services available right now.</p>}
        </div>

        <div className="bg-white rounded-lg border border-stone-200 p-5 h-fit sticky top-6">
          <h2 className="font-semibold text-stone-800 mb-3">Your Selection</h2>
          {cartItems.length === 0 ? (
            <p className="text-stone-400 text-sm">Nothing selected yet.</p>
          ) : (
            <div className="grid gap-2 mb-4">
              {cartItems.map((i) => (
                <div key={i.service.id} className="flex justify-between text-sm">
                  <span>{i.service.name} &times; {i.quantity}</span>
                  <span>KES {(i.service.selling_price * i.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t border-stone-100 pt-2 mt-1">
                <span>Total</span>
                <span>KES {total.toLocaleString()}</span>
              </div>
            </div>
          )}
          {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
          <button
            onClick={submitRequest}
            disabled={cartItems.length === 0 || submitting}
            className="w-full rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Booking Request'}
          </button>
          <p className="text-xs text-stone-400 mt-3">
            We'll review and send you a confirmed quote shortly - prices shown are final, no negotiation needed.
          </p>
        </div>
      </div>
    </div>
  )
}
