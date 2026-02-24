import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repoApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Plus, BookOpen, Lock, Globe, Calendar } from 'lucide-react'
import { formatDate } from '../lib/utils'

export function Dashboard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', description: '', is_public: true })
  const [error, setError] = useState('')

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => repoApi.list().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => repoApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
      setShowCreate(false)
      setForm({ name: '', slug: '', description: '', is_public: true })
      navigate(`/repos/${res.data.slug}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create repository')
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(form)
  }

  const myRepos = repos.filter((r: any) => r.owner_id === user?.id)
  const memberRepos = repos.filter((r: any) => r.owner_id !== user?.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.username}!</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Repository
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading repositories...</div>
      ) : (
        <>
          {myRepos.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Your Repositories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRepos.map((repo: any) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>
            </section>
          )}

          {memberRepos.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Contributed Repositories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memberRepos.map((repo: any) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>
            </section>
          )}

          {repos.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No repositories yet</h3>
              <p className="text-muted-foreground mb-6">Create your first repository to get started</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Repository
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Repository</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label>Repository Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Documentation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (optional)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="my-documentation"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="A brief description..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_public"
                checked={form.is_public}
                onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_public">Public repository</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RepoCard({ repo }: { repo: any }) {
  return (
    <Link to={`/repos/${repo.slug}`}>
      <Card className="hover:shadow-md transition-shadow h-full cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{repo.name}</CardTitle>
            {repo.is_public ? (
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <CardDescription className="text-xs font-mono">{repo.slug}</CardDescription>
        </CardHeader>
        {repo.description && (
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
          </CardContent>
        )}
        <CardFooter className="pt-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(repo.created_at)}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
