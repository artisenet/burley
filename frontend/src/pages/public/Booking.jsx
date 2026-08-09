import { useState } from 'react'
import api from '../../api/client'

const STEPS = {
  CHOOSE_INTENT: 'choose_intent',
  DETAILS: 'details',
  PAYMENT: 'payment',
  DONE: 'done',
}

export default function Booking() {
  const [step, setStep] = useState(STEPS.CHOOSE_INTENT)
  const [intent, setIntent] = useState(null) // 'consultation_only' | 'service_booking'
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', mode: 'virtual' })
  const [busyWindows, setBusyWindows] = useState([])
  const [businessHours, setBusinessHours] = useState({ start: 9, end: 17 })
  const [consultation, setConsultation] = useState(null)
  const [phoneForPayment, setPhoneForPayment] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function chooseIntent(chosen) {
    setIntent(chosen)
    setStep(STEPS.DETAILS)
  }

  async function handleDateChange(dateValue) {
    setForm({ ...form, date: dateValue })
    if (!dateValue) {
      setBusyWindows([])
      return
    }
    try {
      const res = await api.get('/public/availability', { params: { date: dateValue } })
      setBusyWindows(res.data.busy_windows)
      setBusinessHours(res.data.business_hours)
    } catch {
      setBusyWindows([])
    }
  }

  async function submitDetails(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const leadRes = await api.post('/public/leads', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        source: 'website_booking',
      })

      const bookingRes = await api.post('/public/consultations/book', {
        lead_id: leadRes.data.id,
        scheduled_at: new Date(`${form.date}T${form.time}`).toISOString(),
        mode: form.mode,
        intent,
        // quote_id would be supplied here for the service_booking path once
        // she's sent a quote and the client is accepting it with a deposit -
        // that flow typically starts from an emailed quote link, not this form.
      })
      setConsultation(bookingRes.data.consultation)

      if (bookingRes.data.requires_payment) {
        setStep(STEPS.PAYMENT)
      } else {
        setStep(STEPS.DONE)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong, please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function payConsultationFee(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post(`/public/consultations/${consultation.id}/pay`, {
        phone_number: phoneForPayment,
      })
      setPaymentStatus('pending')
      pollPaymentStatus(res.data.transaction_id)
    } catch (err) {
      setError(err.response?.data?.error || 'Payment could not be started, please try again.')
      setSubmitting(false)
    }
  }

  function pollPaymentStatus(txnId) {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payments/${txnId}/status`)
        if (res.data.status === 'success') {
          clearInterval(interval)
          setPaymentStatus('success')
          setSubmitting(false)
          setStep(STEPS.DONE)
        } else if (res.data.status === 'failed') {
          clearInterval(interval)
          setPaymentStatus('failed')
          setSubmitting(false)
        }
      } catch {
        // keep polling silently on transient errors
      }
    }, 3000)
    // stop polling after 2 minutes regardless
    setTimeout(() => clearInterval(interval), 120000)
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-stone-800 mb-8 text-center">Book a Consultation</h1>

      {step === STEPS.CHOOSE_INTENT && (
        <div className="grid gap-4">
          <button
            onClick={() => chooseIntent('consultation_only')}
            className="text-left rounded-xl border border-stone-200 p-6 hover:border-burley-400 hover:bg-burley-50"
          >
            <h2 className="font-semibold text-lg mb-1">Just want to talk first</h2>
            <p className="text-stone-500 text-sm">
              Book a paid consultation to discuss your event before committing to anything.
            </p>
          </button>
          <button
            onClick={() => chooseIntent('service_booking')}
            className="text-left rounded-xl border border-stone-200 p-6 hover:border-burley-400 hover:bg-burley-50"
          >
            <h2 className="font-semibold text-lg mb-1">I'm ready to book a service</h2>
            <p className="text-stone-500 text-sm">
              Already have a quote from us? Book your consultation free when you pay your deposit.
            </p>
          </button>
        </div>
      )}

      {step === STEPS.DETAILS && (
        <form onSubmit={submitDetails} className="grid gap-4">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-stone-300 px-4 py-2"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-stone-300 px-4 py-2"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-lg border border-stone-300 px-4 py-2"
          />
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg border border-stone-300 px-4 py-2"
          />
          {form.date && (
            <>
              <input
                required
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                min={`${String(businessHours.start).padStart(2, '0')}:00`}
                max={`${String(businessHours.end).padStart(2, '0')}:00`}
                className="rounded-lg border border-stone-300 px-4 py-2"
              />
              <p className="text-xs text-stone-500">
                Available {businessHours.start}:00-{businessHours.end}:00.
                {busyWindows.length > 0 && (
                  <>
                    {' '}Already booked:{' '}
                    {busyWindows
                      .map((w) => `${new Date(w.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}-${new Date(w.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
                      .join(', ')}
                  </>
                )}
              </p>
            </>
          )}
          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
            className="rounded-lg border border-stone-300 px-4 py-2"
          >
            <option value="virtual">Virtual</option>
            <option value="in_person">In person</option>
          </select>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-burley-600 text-white px-6 py-3 hover:bg-burley-700 disabled:opacity-50"
          >
            {submitting ? 'Booking...' : 'Continue'}
          </button>
        </form>
      )}

      {step === STEPS.PAYMENT && (
        <form onSubmit={payConsultationFee} className="grid gap-4">
          <p className="text-stone-600">
            A consultation fee of <strong>KES {consultation?.fee_amount}</strong> applies. Enter
            your M-Pesa number to complete payment.
          </p>
          <input
            required
            placeholder="2547XXXXXXXX"
            value={phoneForPayment}
            onChange={(e) => setPhoneForPayment(e.target.value)}
            className="rounded-lg border border-stone-300 px-4 py-2"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {paymentStatus === 'pending' && (
            <p className="text-burley-600 text-sm">
              Check your phone and enter your M-Pesa PIN to complete payment...
            </p>
          )}
          {paymentStatus === 'failed' && (
            <p className="text-red-600 text-sm">Payment did not go through. Please try again.</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-burley-600 text-white px-6 py-3 hover:bg-burley-700 disabled:opacity-50"
          >
            {submitting ? 'Waiting for payment...' : 'Pay Consultation Fee'}
          </button>
        </form>
      )}

      {step === STEPS.DONE && (
        <div className="text-center">
          <h2 className="font-display text-2xl text-stone-800 mb-2">You're all set!</h2>
          <p className="text-stone-500">
            Your consultation is confirmed. We'll be in touch shortly with the details.
          </p>
        </div>
      )}
    </div>
  )
}
