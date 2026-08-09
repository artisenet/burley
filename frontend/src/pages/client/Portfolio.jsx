import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { mediaUrl } from '../../api/client'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

export default function Portfolio() {
  const [images, setImages] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/public/portfolio').then((r) => setImages(r.data)).finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...new Set(images.map((img) => img.category).filter(Boolean))]
  const filtered = activeCategory === 'All' ? images : images.filter((img) => img.category === activeCategory)

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display text-2xl text-stone-800 mb-1">Portfolio</h1>
          <p className="text-stone-500 text-sm">Browse past work for inspiration.</p>
        </div>
        <button
          onClick={() => navigate('/portal/request-quote')}
          className="rounded-full bg-burley-600 text-white text-sm px-4 py-2 hover:bg-burley-700 whitespace-nowrap"
        >
          Request a quote
        </button>
      </div>

      {categories.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full ${
                activeCategory === cat ? 'bg-burley-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-stone-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((img) => (
            <div key={img.id} className="rounded-lg overflow-hidden bg-stone-100 aspect-square">
              <img
                src={mediaUrl(img.url)}
                alt={img.caption || 'Portfolio image'}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-stone-400 col-span-full">No images to show yet - check back soon.</p>
          )}
        </div>
      )}
    </div>
  )
}
