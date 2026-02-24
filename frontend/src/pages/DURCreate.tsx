import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { docApi, durApi } from '../lib/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { ArrowLeft } from 'lucide-react'

export function DURCreate() {
  const { slug, docSlug } = useParams<{ slug: string; docSlug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proposedContent, setProposedContent] = useState('')
  const [error, setError] = useState('')

  const { data: doc, isLoading } = useQuery({
    queryKey: ['doc', slug, docSlug],
    queryFn: () => docApi.get(slug!, docSlug!).then(r => r.data),
    enabled: !!slug && !!docSlug,
    onSuccess: (data: any) => {
      if (!proposedContent) setProposedContent(data.current_content)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { document_id: string; title: string; description?: string; proposed_content: string }) =>
      durApi.create(slug!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['repo-durs', slug] })
      navigate(`/repos/${slug}/durs/${res.data.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create DUR')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!proposedContent.trim()) { setError('Proposed content is required'); return }
    createMutation.mutate({
      document_id: doc!.id,
      title,
      description: description || undefined,
      proposed_content: proposedContent,
    })
  }

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!doc) return <div className="p-8 text-center text-muted-foreground">Document not found.</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(`/repos/${slug}/docs/${docSlug}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to document
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Propose Change</CardTitle>
          <CardDescription>
            Submit a Document Update Request for <strong>{doc.title}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">DUR Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Update API authentication requirements"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Why is this change needed?"
              />
            </div>

            <div className="space-y-2">
              <Label>Proposed Content *</Label>
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="current">Current</TabsTrigger>
                  <TabsTrigger value="edit">Edit Proposed</TabsTrigger>
                </TabsList>
                <TabsContent value="current">
                  <div className="border rounded-md p-4 bg-muted/30 min-h-[300px]">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{doc.current_content}</pre>
                  </div>
                </TabsContent>
                <TabsContent value="edit">
                  <MarkdownEditor
                    value={proposedContent || doc.current_content}
                    onChange={setProposedContent}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/repos/${slug}/docs/${docSlug}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit DUR'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
