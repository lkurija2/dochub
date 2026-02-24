import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { durApi, docApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'
import { Separator } from '../components/ui/separator'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { CheckCircle, XCircle, MessageSquare, GitMerge, Clock } from 'lucide-react'

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  merged: 'secondary',
  rejected: 'destructive',
  approved: 'secondary',
}

function DiffView({ original, proposed }: { original: string; proposed: string }) {
  const originalLines = original.split('\n')
  const proposedLines = proposed.split('\n')

  const diffLines: Array<{ type: 'same' | 'removed' | 'added'; content: string }> = []

  let i = 0, j = 0
  while (i < originalLines.length || j < proposedLines.length) {
    const origLine = originalLines[i]
    const propLine = proposedLines[j]

    if (i >= originalLines.length) {
      diffLines.push({ type: 'added', content: propLine })
      j++
    } else if (j >= proposedLines.length) {
      diffLines.push({ type: 'removed', content: origLine })
      i++
    } else if (origLine === propLine) {
      diffLines.push({ type: 'same', content: origLine })
      i++; j++
    } else {
      diffLines.push({ type: 'removed', content: origLine })
      diffLines.push({ type: 'added', content: propLine })
      i++; j++
    }
  }

  return (
    <div className="font-mono text-xs border rounded-md overflow-auto max-h-[500px]">
      {diffLines.map((line, idx) => (
        <div
          key={idx}
          className={`px-4 py-0.5 whitespace-pre-wrap ${
            line.type === 'removed'
              ? 'bg-red-50 text-red-800 border-l-4 border-red-400 dark:bg-red-950 dark:text-red-200'
              : line.type === 'added'
              ? 'bg-green-50 text-green-800 border-l-4 border-green-400 dark:bg-green-950 dark:text-green-200'
              : 'bg-background text-foreground border-l-4 border-transparent'
          }`}
        >
          <span className="mr-2 select-none opacity-50">
            {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
          </span>
          {line.content || ' '}
        </div>
      ))}
    </div>
  )
}

export function DURDetail() {
  const { slug, durId } = useParams<{ slug: string; durId: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [comment, setComment] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [showReviewInput, setShowReviewInput] = useState<'approve' | 'reject' | null>(null)

  const { data: dur, isLoading } = useQuery({
    queryKey: ['dur', slug, durId],
    queryFn: () => durApi.get(slug!, durId!).then(r => r.data),
    enabled: !!slug && !!durId,
  })

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['dur-comments', slug, durId],
    queryFn: () => durApi.getComments(slug!, durId!).then(r => r.data),
    enabled: !!slug && !!durId,
  })

  // Fetch the current document content using the slug from the DUR response
  const { data: doc } = useQuery({
    queryKey: ['doc', slug, dur?.document?.slug],
    queryFn: () => docApi.get(slug!, dur!.document.slug).then(r => r.data),
    enabled: !!dur?.document?.slug,
  })

  const approveMutation = useMutation({
    mutationFn: () => durApi.approve(slug!, durId!, { review_comment: reviewComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dur', slug, durId] })
      queryClient.invalidateQueries({ queryKey: ['repo-durs', slug] })
      queryClient.invalidateQueries({ queryKey: ['doc', slug, dur?.document?.slug] })
      setShowReviewInput(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => durApi.reject(slug!, durId!, { review_comment: reviewComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dur', slug, durId] })
      queryClient.invalidateQueries({ queryKey: ['repo-durs', slug] })
      setShowReviewInput(null)
    },
  })

  const commentMutation = useMutation({
    mutationFn: () => durApi.addComment(slug!, durId!, comment),
    onSuccess: () => {
      setComment('')
      refetchComments()
    },
  })

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!dur) return <div className="p-8 text-center text-muted-foreground">DUR not found.</div>

  const isOpen = dur.status === 'open'
  const canReview = user && user.id !== dur.created_by

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link to="/repos" className="hover:text-foreground">Repos</Link>
        <span>/</span>
        <Link to={`/repos/${slug}`} className="hover:text-foreground">{slug}</Link>
        <span>/</span>
        <span>DURs</span>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{dur.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{dur.title}</h1>
            <Badge variant={STATUS_COLORS[dur.status] || 'outline'}>{dur.status}</Badge>
          </div>
          {dur.description && (
            <p className="text-muted-foreground mt-1">{dur.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Opened {new Date(dur.created_at).toLocaleDateString()}
            </span>
            {dur.creator && <span>by <strong>{dur.creator.username}</strong></span>}
            {dur.document && (
              <span>
                on{' '}
                <Link to={`/repos/${slug}/docs/${dur.document.slug}`} className="underline hover:text-foreground">
                  {dur.document.title}
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Diff tabs — single Tabs context wrapping both list and content */}
      <Card className="mb-6">
        <Tabs defaultValue="diff">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="diff">Diff</TabsTrigger>
              <TabsTrigger value="proposed">Proposed</TabsTrigger>
              <TabsTrigger value="current">Current</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="diff" className="mt-0">
              {doc
                ? <DiffView original={doc.current_content} proposed={dur.proposed_content} />
                : <div className="text-sm text-muted-foreground py-4">Loading current document...</div>
              }
            </TabsContent>
            <TabsContent value="proposed" className="mt-0">
              <pre className="text-xs font-mono whitespace-pre-wrap border rounded-md p-4 bg-muted/30 max-h-[500px] overflow-auto">
                {dur.proposed_content}
              </pre>
            </TabsContent>
            <TabsContent value="current" className="mt-0">
              <pre className="text-xs font-mono whitespace-pre-wrap border rounded-md p-4 bg-muted/30 max-h-[500px] overflow-auto">
                {doc?.current_content ?? 'Loading...'}
              </pre>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Review result */}
      {!isOpen && dur.review_comment && (
        <Card className={`mb-6 border-l-4 ${dur.status === 'merged' ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              {dur.status === 'merged'
                ? <GitMerge className="w-4 h-4 text-green-500" />
                : <XCircle className="w-4 h-4 text-red-500" />
              }
              <span className="font-medium text-sm">
                {dur.status === 'merged' ? 'Merged' : 'Rejected'} by {dur.reviewer?.username ?? 'reviewer'}
              </span>
              {dur.reviewed_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(dur.reviewed_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{dur.review_comment}</p>
          </CardContent>
        </Card>
      )}

      {/* Review actions */}
      {isOpen && canReview && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            {showReviewInput ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a review comment (optional)..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  {showReviewInput === 'approve' ? (
                    <Button
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveMutation.isPending ? 'Merging...' : 'Approve & Merge'}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate()}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {rejectMutation.isPending ? 'Rejecting...' : 'Reject DUR'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowReviewInput(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => setShowReviewInput('approve')} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Merge
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setShowReviewInput('reject')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />

      {/* Comments */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments ({comments?.length ?? 0})
        </h2>

        <div className="space-y-4 mb-6">
          {comments?.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {c.user?.username?.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{c.user?.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            </div>
          ))}
          {(!comments || comments.length === 0) && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}
        </div>

        {user && (
          <div className="space-y-2">
            <Textarea
              placeholder="Leave a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
              size="sm"
            >
              {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
