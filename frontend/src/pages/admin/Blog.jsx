import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [portfolioImages, setPortfolioImages] = useState([])
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', cover_image_url: '', status: 'draft' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    api.get('/admin/blog').then((r) => setPosts(r.data))
    api.get('/admin/portfolio').then((r) => setPortfolioImages(r.data.filter((i) => i.media_type !== 'video')))
  }
  useEffect(load, [])

  function startEdit(postId) {
    api.get(`/admin/blog/${postId}`).then((r) => {
      setForm({
        title: r.data.title,
        excerpt: r.data.excerpt || '',
        content: r.data.content,
        cover_image_url: r.data.cover_image_url || '',
        status: r.data.status,
      })
      setEditingId(postId)
    })
  }

  function resetForm() {
    setForm({ title: '', excerpt: '', content: '', cover_image_url: '', status: 'draft' })
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) {
        await api.put(`/admin/blog/${editingId}`, form)
      } else {
        await api.post('/admin/blog', form)
      }
      resetForm()
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save this post.')
    }
  }

  async function togglePublish(post) {
    await api.put(`/admin/blog/${post.id}`, { status: post.status === 'published' ? 'draft' : 'published' })
    load()
  }

  async function deletePost(postId) {
    if (!confirm('Delete this post? This cannot be undone.')) return
    await api.delete(`/admin/blog/${postId}`)
    load()
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-8">Blog</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid gap-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg border border-stone-200 p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-stone-800 text-sm">{post.title}</p>
                <p className="text-xs text-stone-500">
                  {post.status === 'published' ? `Published ${new Date(post.published_at).toLocaleDateString()}` : 'Draft'}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => startEdit(post.id)} className="text-burley-600 hover:underline">Edit</button>
                <button onClick={() => togglePublish(post)} className="text-stone-500 hover:underline">
                  {post.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => deletePost(post.id)} className="text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {posts.length === 0 && <p className="text-stone-400">No posts yet.</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 h-fit">
          <h2 className="font-semibold text-stone-800">{editingId ? 'Edit Post' : 'New Post'}</h2>
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Short excerpt (shown in previews)"
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <select
            value={form.cover_image_url}
            onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">No cover image</option>
            {portfolioImages.map((img) => (
              <option key={img.id} value={img.url}>{img.caption || `Image #${img.id}`}</option>
            ))}
          </select>
          <textarea
            required
            rows={8}
            placeholder="Post content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700">
              {editingId ? 'Save Changes' : 'Create Post'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-full border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
