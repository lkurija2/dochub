import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { repoApi } from '../lib/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Globe, Lock, BookOpen, Search, Calendar } from 'lucide-react'
import { formatDate } from '../lib/utils'

export function RepositoryList() {
  const [search, setSearch] = useState('')

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => repoApi.list().then(r => r.data),
  })

  const filtered = repos.filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.slug.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore Repositories</h1>
        <p className="text-muted-foreground">Browse public documentation repositories</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading repositories...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No repositories found</h3>
          <p className="text-muted-foreground">
            {search ? 'Try a different search term' : 'No public repositories yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo: any) => (
            <Link key={repo.id} to={`/repos/${repo.slug}`}>
              <Card className="hover:shadow-md transition-shadow h-full cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{repo.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">{repo.slug}</CardDescription>
                    </div>
                    {repo.is_public ? (
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </div>
                </CardHeader>
                {repo.description && (
                  <CardContent className="pt-0 pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
                  </CardContent>
                )}
                <CardFooter className="pt-0 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(repo.created_at)}
                  </div>
                  {repo.owner && (
                    <span className="text-xs text-muted-foreground">by {repo.owner.username}</span>
                  )}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
