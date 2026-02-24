import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { docApi } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ScrollArea } from '../components/ui/scroll-area'
import { Separator } from '../components/ui/separator'
import { ArrowLeft, Clock, GitPullRequest, History } from 'lucide-react'
import { marked } from 'marked'

export function DocumentView() {
  const { slug, docSlug } = useParams<{ slug: string; docSlug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

  const { data: doc, isLoading } = useQuery({
    queryKey: ['doc', slug, docSlug],
    queryFn: () => docApi.get(slug!, docSlug!).then(r => r.data),
    enabled: !!slug && !!docSlug,
  })

  const { data: versions } = useQuery({
    queryKey: ['doc-versions', slug, docSlug],
    queryFn: () => docApi.getVersions(slug!, docSlug!).then(r => r.data),
    enabled: !!slug && !!docSlug,
  })

  const { data: versionContent } = useQuery({
    queryKey: ['doc-version', slug, docSlug, selectedVersion],
    queryFn: () => docApi.getVersion(slug!, docSlug!, selectedVersion!).then(r => r.data),
    enabled: selectedVersion !== null,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!doc) return <div className="p-8 text-center text-muted-foreground">Document not found.</div>

  const displayContent = selectedVersion !== null && versionContent
    ? versionContent.content
    : doc.current_content

  const renderedHtml = marked(displayContent || '') as string

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link to="/repos" className="hover:text-foreground">Repos</Link>
        <span>/</span>
        <Link to={`/repos/${slug}`} className="hover:text-foreground">{slug}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{doc.title}</span>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{doc.title}</h1>
              {selectedVersion !== null && (
                <Badge variant="outline" className="mt-1">
                  Viewing v{selectedVersion}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {selectedVersion !== null && (
                <Button variant="outline" size="sm" onClick={() => setSelectedVersion(null)}>
                  Back to current
                </Button>
              )}
              {user && selectedVersion === null && (
                <Button size="sm" asChild>
                  <Link to={`/repos/${slug}/docs/${docSlug}/propose`}>
                    <GitPullRequest className="w-4 h-4 mr-2" />
                    Propose Change
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Version history sidebar */}
        <div className="w-64 shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {/* Current version */}
                <button
                  onClick={() => setSelectedVersion(null)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedVersion === null ? 'bg-muted' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current</span>
                    <Badge variant="secondary" className="text-xs">latest</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                </button>

                {versions && versions.length > 0 && <Separator />}

                {versions?.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVersion(v.version_number)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${selectedVersion === v.version_number ? 'bg-muted' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">v{v.version_number}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {v.commit_message}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(v.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}

                {(!versions || versions.length === 0) && (
                  <div className="px-4 py-3 text-xs text-muted-foreground">No versions yet</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
