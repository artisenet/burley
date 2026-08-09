import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mediaUrl } from '../../api/client'

const PACKAGES = [
  {
    name: 'Signature',
    description:
      'Full-service planning from concept to clean-up - venue sourcing, vendor coordination, decor, and a dedicated team on the day so you can simply be present.',
    anchor: 'signature',
  },
  {
    name: 'Bespoke',
    description:
      'A tailored package built around exactly what you need - perfect for couples and hosts who have some pieces in place and want expert hands on the rest.',
    anchor: 'bespoke',
  },
]

// Fallback shown only if no approved client reviews exist yet.
const FALLBACK_TESTIMONIAL = {
  content: 'Reviews from our clients will appear here once they come in.',
  name: 'Burley Events',
}

const SUBJECT_OPTIONS = [
  'I\'d like to book the Signature package',
  'I\'d like to book the Bespoke package',
  'I have a general question',
  'I\'d like to enquire about decor & rentals',
]

export default function Landing() {
  const [mailForm, setMailForm] = useState({ name: '', email: '' })
  const [mailStatus, setMailStatus] = useState(null)

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: SUBJECT_OPTIONS[2],
    notes: '',
  })
  const [contactStatus, setContactStatus] = useState(null)

  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [reviews, setReviews] = useState([])
  useEffect(() => {
    api.get('/public/reviews').then((r) => setReviews(r.data)).catch(() => {})
  }, [])
  const testimonials = reviews.length > 0 ? reviews : [FALLBACK_TESTIMONIAL]

  const [recentPosts, setRecentPosts] = useState([])
  useEffect(() => {
    api.get('/public/blog').then((r) => setRecentPosts(r.data.slice(0, 3))).catch(() => {})
  }, [])

  const [portfolioImages, setPortfolioImages] = useState([])
  useEffect(() => {
    api.get('/public/portfolio').then((r) => setPortfolioImages(r.data)).catch(() => {})
  }, [])

  const photoOnly = portfolioImages.filter((img) => img.media_type !== 'video')
  const heroVideo = portfolioImages.find(
    (img) => img.media_type === 'video' && img.category?.trim().toLowerCase() === 'hero video'
  )

  async function handleSubscribe(e) {
    e.preventDefault()
    setMailStatus('sending')
    try {
      await api.post('/public/mailing-list', { ...mailForm, source: 'landing_page' })
      setMailStatus('success')
      setMailForm({ name: '', email: '' })
    } catch {
      setMailStatus('error')
    }
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    setContactStatus('sending')
    try {
      await api.post('/public/leads', {
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        source: 'contact_form',
        notes: `Subject: ${contactForm.subject}\n\n${contactForm.notes}`,
      })
      setContactStatus('success')
      setContactForm({ name: '', email: '', phone: '', subject: SUBJECT_OPTIONS[2], notes: '' })
    } catch {
      setContactStatus('error')
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-burley-50 border-b border-burley-100">
        {heroVideo && (
          <>
            <video
              src={mediaUrl(heroVideo.url)}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}
        <div className={`relative max-w-5xl mx-auto px-6 py-28 text-center ${heroVideo ? 'text-white' : ''}`}>
          <h1 className={`font-display text-5xl md:text-6xl leading-tight mb-6 ${heroVideo ? 'text-white' : 'text-burley-900'}`}>
            We Plan Every Detail <br className="hidden md:block" />
            So You Can{' '}
            <span className={heroVideo ? 'italic text-burley-200' : 'italic text-burley-500'}>Treasure the Day</span>
          </h1>
          <p className={`max-w-xl mx-auto mb-10 ${heroVideo ? 'text-stone-100' : 'text-stone-600'}`}>
            From intimate gatherings to grand celebrations, Burley Events brings
            your vision to life - decor, coordination, and everything in between.
          </p>
          <Link
            to="/book"
            className="inline-block rounded-full bg-burley-600 text-white px-8 py-3 hover:bg-burley-700"
          >
            Book a Consultation
          </Link>
        </div>
      </section>

      {/* Packages */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <p className="text-center text-burley-500 uppercase tracking-wide text-sm mb-2">
          Our Packages
        </p>
        <h2 className="font-display text-3xl text-stone-800 text-center mb-16">
          The Perfect Fit for Your Event
        </h2>

        <div className="grid gap-16">
          {PACKAGES.map((pkg, i) => {
            const packageImage = photoOnly.find(
              (img) => img.category?.trim().toLowerCase() === pkg.name.toLowerCase()
            )
            return (
              <div
                key={pkg.name}
                className={`grid md:grid-cols-2 gap-8 items-center ${
                  i % 2 === 1 ? 'md:[direction:rtl]' : ''
                }`}
              >
                {packageImage ? (
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-stone-200 md:[direction:ltr]">
                    <img
                      src={mediaUrl(packageImage.url)}
                      alt={packageImage.caption || `${pkg.name} package`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-xl bg-stone-200 flex items-center justify-center text-stone-400 text-sm md:[direction:ltr]">
                    {pkg.name} package image
                  </div>
                )}
                <div className="md:[direction:ltr]">
                  <h3 className="font-display text-2xl text-burley-800 mb-3">{pkg.name} Package</h3>
                  <p className="text-stone-600 mb-5">{pkg.description}</p>
                  <Link
                    to="/book"
                    className="text-burley-600 font-medium hover:underline"
                  >
                    Enquire About This Package &rarr;
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Gallery */}
      <section id="portfolio" className="bg-stone-100 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <p className="text-center text-burley-500 uppercase tracking-wide text-sm mb-2">
            Gallery
          </p>
          <h2 className="font-display text-3xl text-stone-800 text-center mb-12">Our Work</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photoOnly.length > 0
              ? photoOnly.map((img) => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-stone-200">
                    <img
                      src={mediaUrl(img.url)}
                      alt={img.caption || 'Event photography'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              : [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-stone-200 flex items-center justify-center text-stone-400 text-xs"
                  >
                    Photo {i}
                  </div>
                ))}
          </div>
          {photoOnly.length === 0 && (
            <p className="text-stone-500 text-sm mt-6 text-center">
              Placeholder grid - real photos will appear here once uploaded from the admin dashboard.
            </p>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-burley-500 uppercase tracking-wide text-sm mb-2">Testimonials</p>
        <h2 className="font-display text-3xl text-stone-800 mb-10">What Our Clients Say</h2>

        <div className="bg-white rounded-xl border border-stone-200 p-10">
          <p className="text-stone-600 italic text-lg mb-6">
            &ldquo;{testimonials[activeTestimonial].content}&rdquo;
          </p>
          <p className="text-burley-700 font-medium">{testimonials[activeTestimonial].name}</p>
          {testimonials[activeTestimonial].rating && (
            <p className="text-amber-500 mt-1">
              {'★'.repeat(testimonials[activeTestimonial].rating)}
              {'☆'.repeat(5 - testimonials[activeTestimonial].rating)}
            </p>
          )}
        </div>

        {testimonials.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-2 w-2 rounded-full ${
                  i === activeTestimonial ? 'bg-burley-600' : 'bg-stone-300'
                }`}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Blog teaser */}
      {recentPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <p className="text-center text-burley-500 uppercase tracking-wide text-sm mb-2">
            From the Blog
          </p>
          <h2 className="font-display text-3xl text-stone-800 text-center mb-12">Latest Stories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                {post.cover_image_url ? (
                  <div className="aspect-video rounded-lg overflow-hidden bg-stone-100 mb-3">
                    <img src={mediaUrl(post.cover_image_url)} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg bg-stone-100 mb-3" />
                )}
                <h3 className="font-medium text-stone-800 group-hover:text-burley-600 mb-1">{post.title}</h3>
                <p className="text-stone-500 text-sm">{post.excerpt}</p>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/blog" className="text-burley-600 font-medium hover:underline">Read More on Our Blog &rarr;</Link>
          </div>
        </section>
      )}

      {/* Contact / qualifying enquiry form */}
      <section className="bg-burley-50 border-y border-burley-100">
        <div className="max-w-2xl mx-auto px-6 py-24">
          <p className="text-center text-burley-500 uppercase tracking-wide text-sm mb-2">
            Get In Touch
          </p>
          <h2 className="font-display text-3xl text-stone-800 text-center mb-10">
            Have a Question? We'd Love to Help
          </h2>

          <form onSubmit={handleContactSubmit} className="grid gap-4 bg-white rounded-xl border border-stone-200 p-8">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                required
                placeholder="Full name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="rounded-lg border border-stone-300 px-4 py-2"
              />
              <input
                placeholder="Phone number"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="rounded-lg border border-stone-300 px-4 py-2"
              />
            </div>
            <input
              required
              type="email"
              placeholder="Email address"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              className="rounded-lg border border-stone-300 px-4 py-2"
            />
            <select
              value={contactForm.subject}
              onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              className="rounded-lg border border-stone-300 px-4 py-2"
            >
              {SUBJECT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <textarea
              placeholder="Tell us a little about your event..."
              rows={4}
              value={contactForm.notes}
              onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
              className="rounded-lg border border-stone-300 px-4 py-2"
            />
            <button
              type="submit"
              disabled={contactStatus === 'sending'}
              className="rounded-full bg-burley-600 text-white px-6 py-3 hover:bg-burley-700 disabled:opacity-50"
            >
              {contactStatus === 'sending' ? 'Sending...' : 'Submit'}
            </button>
            {contactStatus === 'success' && (
              <p className="text-green-600 text-sm">Thank you - we'll be in touch shortly.</p>
            )}
            {contactStatus === 'error' && (
              <p className="text-red-600 text-sm">Something went wrong, please try again.</p>
            )}
          </form>
        </div>
      </section>

      {/* Mailing list */}
      <section className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-3xl text-stone-800 mb-3">Stay in the Loop</h2>
        <p className="text-stone-500 mb-6">
          Join our mailing list for the latest portfolio pieces, seasonal offers, and event inspiration.
        </p>
        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center">
          <input
            type="text"
            placeholder="Your name"
            value={mailForm.name}
            onChange={(e) => setMailForm({ ...mailForm, name: e.target.value })}
            className="rounded-full border border-stone-300 px-4 py-2 flex-1"
          />
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={mailForm.email}
            onChange={(e) => setMailForm({ ...mailForm, email: e.target.value })}
            className="rounded-full border border-stone-300 px-4 py-2 flex-1"
          />
          <button
            type="submit"
            disabled={mailStatus === 'sending'}
            className="rounded-full bg-burley-600 text-white px-6 py-2 hover:bg-burley-700 disabled:opacity-50"
          >
            {mailStatus === 'sending' ? 'Joining...' : 'Join'}
          </button>
        </form>
        {mailStatus === 'success' && (
          <p className="text-green-600 text-sm mt-3">You're on the list - thank you!</p>
        )}
        {mailStatus === 'error' && (
          <p className="text-red-600 text-sm mt-3">Something went wrong, please try again.</p>
        )}
      </section>
    </div>
  )
}
