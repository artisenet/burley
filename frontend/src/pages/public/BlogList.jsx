import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mediaUrl } from '../../api/client'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

export default function BlogList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/public/blog').then((r) => setPosts(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl text-stone-800 mb-2">Our Blog</h1>
      <p className="text-stone-500 mb-10">Stories, tips, and inspiration from Burley Events.</p>

      {loading ? (
        <p className="text-stone-500">Loading...</p>
      ) : (
        <div className="grid gap-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="grid md:grid-cols-3 gap-5 items-center group"
            >
              {post.cover_image_url ? (
                <div className="md:col-span-1 aspect-video md:aspect-square rounded-lg overflow-hidden bg-stone-100">
                  <img src={mediaUrl(post.cover_image_url)} alt={post.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="md:col-span-1 aspect-video md:aspect-square rounded-lg bg-stone-100" />
              )}
              <div className="md:col-span-2">
                <h2 className="font-display text-2xl text-stone-800 group-hover:text-burley-600 mb-1">{post.title}</h2>
                <p className="text-xs text-stone-400 mb-2">
                  {new Date(post.published_at).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-stone-600">{post.excerpt}</p>
              </div>
            </Link>
          ))}
          {posts.length === 0 && <p className="text-stone-400">No posts published yet - check back soon.</p>}
        </div>
      )}
    </div>
  )
}
