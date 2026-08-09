import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { mediaUrl } from '../../api/client'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/public/blog/${slug}`)
      .then((r) => setPost(r.data))
      .catch(() => setError('This post could not be found.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-16"><p className="text-stone-500">Loading...</p></div>
  if (error || !post) return <div className="max-w-2xl mx-auto px-6 py-16"><p className="text-red-600">{error}</p></div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <Link to="/blog" className="text-sm text-burley-600 hover:underline mb-6 inline-block">&larr; Back to Blog</Link>

      {post.cover_image_url && (
        <div className="aspect-video rounded-lg overflow-hidden bg-stone-100 mb-8">
          <img src={mediaUrl(post.cover_image_url)} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <h1 className="font-display text-4xl text-stone-800 mb-2">{post.title}</h1>
      <p className="text-xs text-stone-400 mb-8">
        {post.author} - {new Date(post.published_at).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <div className="prose prose-stone text-stone-700 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>
    </div>
  )
}
