import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { docApi } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { ArrowLeft } from 'lucide-react'

export function DocumentCreate() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [docSlug, setDocSlug] = useState('')
  const [content, setContent] = useState('# Document Title\n\nStart writing your documentation here...')
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: { title: string; slug?: string; current_content: string }) =>
      docApi.create(slug!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['repo-docs', slug] })
      navigate(`/repos/${slug}/docs/${res.data.slug}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create document')
    },
  })

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!docSlug) {
      setDocSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!content.trim()) { setError('Content is required'); return }
    createMutation.mutate({ title, slug: docSlug || undefined, current_content: content })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(`/repos/${slug}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to repository
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Document</CardTitle>
          <CardDescription>Create a new document in <strong>{slug}</strong></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Document title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={docSlug}
                  onChange={e => setDocSlug(e.target.value)}
                  placeholder="auto-generated-from-title"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content * (Markdown)</Label>
              <MarkdownEditor value={content} onChange={setContent} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/repos/${slug}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
