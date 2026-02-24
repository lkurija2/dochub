import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repoApi, docApi, durApi, userApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select } from '../components/ui/select'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Plus, FileText, GitPullRequest, Users, Globe, Lock, Trash2, UserPlus } from 'lucide-react'
import { formatDate } from '../lib/utils'

function durStatusVariant(status: string) {
  switch (status) {
    case 'open': return 'blue'
    case 'merged': return 'purple'
    case 'rejected': return 'red'
    case 'approved': return 'green'
    default: return 'secondary'
  }
}

export function RepositoryDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberUsername, setMemberUsername] = useState('')
  const [memberRole, setMemberRole] = useState('viewer')
  const [memberError, setMemberError] = useState('')

  const { data: repo, isLoading: repoLoading, error: repoError } = useQuery({
    queryKey: ['repo', slug],
    queryFn: () => repoApi.get(slug!).then(r => r.data),
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', slug],
    queryFn: () => docApi.list(slug!).then(r => r.data),
    enabled: !!repo,
  })

  const { data: durs = [] } = useQuery({
    queryKey: ['durs', slug],
    queryFn: () => durApi.list(slug!).then(r => r.data),
    enabled: !!repo,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', slug],
    queryFn: () => repoApi.getMembers(slug!).then(r => r.data),
    enabled: !!repo && !!user,
  })

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      // Look up user by username
      const allUsers = await userApi.list().then(r => r.data)
      const target = allUsers.find((u: any) => u.username === memberUsername)
      if (!target) throw new Error('User not found')
      return repoApi.addMember(slug!, { user_id: target.id, role: memberRole })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', slug] })
      setShowAddMember(false)
      setMemberUsername('')
      setMemberRole('viewer')
    },
    onError: (err: any) => {
      setMemberError(err.message || err.response?.data?.detail || 'Failed to add member')
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => repoApi.removeMember(slug!, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', slug] }),
  })

  const deleteRepoMutation = useMutation({
    mutationFn: () => repoApi.delete(slug!),
    onSuccess: () => navigate('/dashboard'),
  })

  if (repoLoading) return <div className="text-muted-foreground">Loading...</div>
  if (repoError) return <div className="text-destructive">Repository not found or access denied.</div>
  if (!repo) return null

  const isOwner = user && repo.owner_id === user.id
  const isAdmin = isOwner || user?.is_admin
  const userMember = user && members.find((m: any) => m.user_id === user.id)
  const canEdit = isAdmin || (userMember && ['admin', 'editor'].includes(userMember.role))

  const filteredDurs = statusFilter === 'all' ? durs : durs.filter((d: any) => d.status === statusFilter)

  return (
    <div>
      {/* Repo header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {repo.is_public ? <Globe className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
            <h1 className="text-3xl font-bold">{repo.name}</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm">{repo.slug}</p>
          {repo.description && <p className="mt-2 text-muted-foreground">{repo.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            by {repo.owner?.username} · Created {formatDate(repo.created_at)}
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm('Delete this repository? This cannot be undone.')) {
                deleteRepoMutation.mutate()
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>

      <Tabs defaultValue="docs">
        <TabsList className="mb-4">
          <TabsTrigger value="docs">
            <FileText className="h-4 w-4 mr-1" />
            Documents ({docs.length})
          </TabsTrigger>
          <TabsTrigger value="durs">
            <GitPullRequest className="h-4 w-4 mr-1" />
            DURs ({durs.length})
          </TabsTrigger>
          {user && (
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-1" />
              Members
            </TabsTrigger>
          )}
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="docs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Documents</h2>
            {canEdit && (
              <Button size="sm" asChild>
                <Link to={`/repos/${slug}/docs/new`}>
                  <Plus className="h-4 w-4 mr-1" /> New Document
                </Link>
              </Button>
            )}
          </div>
          {docs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No documents yet.</p>
              {canEdit && (
                <Button size="sm" className="mt-4" asChild>
                  <Link to={`/repos/${slug}/docs/new`}>Create First Document</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link to={`/repos/${slug}/docs/${doc.slug}`} className="font-medium text-primary hover:underline">
                        {doc.title}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{doc.slug}</TableCell>
                    <TableCell className="text-sm">{doc.creator?.username}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(doc.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* DURs Tab */}
        <TabsContent value="durs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Document Update Requests</h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="merged">Merged</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          {filteredDurs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitPullRequest className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No DURs found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDurs.map((dur: any) => (
                <Link key={dur.id} to={`/repos/${slug}/durs/${dur.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <GitPullRequest className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{dur.title}</p>
                        <p className="text-xs text-muted-foreground">
                          by {dur.creator?.username} · {formatDate(dur.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={durStatusVariant(dur.status) as any} className="ml-2 flex-shrink-0">
                      {dur.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        {user && (
          <TabsContent value="members">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Members</h2>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Add Member
                </Button>
              )}
            </div>

            {/* Owner */}
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {repo.owner?.username?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{repo.owner?.username}</p>
                    <p className="text-xs text-muted-foreground">{repo.owner?.email}</p>
                  </div>
                </div>
                <Badge>Owner</Badge>
              </div>
            </div>

            {members.map((member: any) => (
              <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {member.user?.username?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{member.user?.username}</p>
                    <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{member.role}</Badge>
                  {isAdmin && member.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeMemberMutation.mutate(member.user_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {memberError && (
              <Alert variant="destructive">
                <AlertDescription>{memberError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={memberUsername}
                onChange={(e) => setMemberUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setMemberError('')
                addMemberMutation.mutate()
              }}
              disabled={addMemberMutation.isPending || !memberUsername}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
