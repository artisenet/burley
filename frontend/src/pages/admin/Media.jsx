import { useEffect, useState } from 'react'
import api, { mediaUrl } from '../../api/client'

export default function Media() {
  const [images, setImages] = useState([])
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  function load() {
    api.get('/admin/portfolio').then((r) => setImages(r.data))
  }
  useEffect(load, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) {
      setError('Choose an image file first.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caption', caption)
      formData.append('category', category)
      await api.post('/admin/portfolio', formData)
      setCaption('')
      setCategory('')
      setFile(null)
      e.target.reset()
      load()
    } catch (err) {
      const serverMessage = typeof err.response?.data === 'string' ? err.response.data : err.response?.data?.error
      setError(serverMessage || 'Upload failed - try a smaller image or a different format.')
    } finally {
      setUploading(false)
    }
  }

  async function toggleActive(image) {
    await api.put(`/admin/portfolio/${image.id}`, { is_active: !image.is_active })
    load()
  }

  async function remove(imageId) {
    if (!confirm('Delete this image? This cannot be undone.')) return
    await api.delete(`/admin/portfolio/${imageId}`)
    load()
  }


  return (
    <div>
      <h1 className="font-display text-3xl text-stone-800 mb-2">Portfolio & Media</h1>
      <p className="text-stone-500 text-sm mb-8">
        Images uploaded here appear in the gallery on the public landing page. Only active images are shown to visitors.
      </p>

      <form onSubmit={handleUpload} className="bg-white rounded-lg border border-stone-200 p-5 grid gap-3 mb-8 max-w-md">
        <h2 className="font-semibold text-stone-800">Upload an Image</h2>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm"
        />
        <input
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Category (e.g. Weddings, Decor)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button
          disabled={uploading}
          className="rounded-full bg-burley-600 text-white px-4 py-2 text-sm hover:bg-burley-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <p className="text-stone-400 text-xs">
          JPG, PNG, WEBP, GIF (max 8MB) or MP4, WEBM (max 40MB). For the homepage hero video,
          set category to exactly "Hero Video" - keep it short and compressed, it autoplays muted on the site.
        </p>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            {img.media_type === 'video' ? (
              <video
                src={mediaUrl(img.url)}
                className="w-full aspect-square object-cover"
                muted
                loop
                playsInline
                controls
              />
            ) : (
              <img
                src={mediaUrl(img.url)}
                alt={img.caption || 'Portfolio image'}
                className="w-full aspect-square object-cover"
              />
            )}
            <div className="p-2">
              <p className="text-xs text-stone-600 truncate">{img.caption || 'Untitled'}</p>
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={() => toggleActive(img)}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    img.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {img.is_active ? 'Active' : 'Hidden'}
                </button>
                <button
                  onClick={() => remove(img.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <p className="text-stone-400 col-span-full">No images uploaded yet - add your first one above.</p>
        )}
      </div>
    </div>
  )
}
