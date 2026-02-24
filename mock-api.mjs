import http from 'http'

const mockUser = { id: 'u1', username: 'alice', email: 'alice@acme.com', is_admin: true }
const mockToken = 'mock-jwt-token'

const mockRepos = [
  { id: 'r1', name: 'Platform Architecture', slug: 'platform-architecture', description: 'Core platform design docs and ADRs', is_public: true, owner_id: 'u1', created_at: '2024-11-01T10:00:00Z', updated_at: '2025-01-15T14:30:00Z' },
  { id: 'r2', name: 'API Contracts', slug: 'api-contracts', description: 'REST & gRPC interface specifications', is_public: false, owner_id: 'u1', created_at: '2024-12-03T09:00:00Z', updated_at: '2025-02-10T11:00:00Z' },
  { id: 'r3', name: 'Onboarding Guides', slug: 'onboarding-guides', description: 'New engineer setup and runbooks', is_public: true, owner_id: 'u2', created_at: '2025-01-10T08:00:00Z', updated_at: '2025-02-20T16:00:00Z' },
]

const mockDocs = [
  { id: 'd1', repo_id: 'r1', title: 'System Overview', slug: 'system-overview', current_content: '# System Overview\n\nOur platform is built on a microservices architecture...\n\n## Services\n\n- **Auth Service** — handles authentication and JWT issuance\n- **Data Service** — manages persistence and querying\n- **Notification Service** — email/push delivery\n\n## Infrastructure\n\nAll services run on Kubernetes (EKS). Traffic is routed through an NGINX ingress controller.\n\n## Key Decisions\n\n- PostgreSQL for relational data\n- Redis for caching and session management\n- Kafka for async event streaming', created_by: 'u1', created_at: '2024-11-01T10:00:00Z', updated_at: '2025-01-15T14:30:00Z' },
  { id: 'd2', repo_id: 'r1', title: 'Authentication Flow', slug: 'authentication-flow', current_content: '# Authentication Flow\n\nWe use JWT-based auth with short-lived access tokens.\n\n## Token Lifecycle\n\n1. User logs in → receives `access_token` (30 min) + `refresh_token` (7 days)\n2. Access token is passed as `Authorization: Bearer <token>`\n3. On expiry, client uses refresh token to get a new pair\n\n## Security Notes\n\n- Tokens are signed with RS256\n- Refresh tokens are rotated on every use\n- Revocation is handled via a Redis blocklist', created_by: 'u1', created_at: '2024-11-05T10:00:00Z', updated_at: '2025-01-20T10:00:00Z' },
  { id: 'd3', repo_id: 'r1', title: 'Database Schema', slug: 'database-schema', current_content: '# Database Schema\n\n## Users Table\n\n| Column | Type | Notes |\n|--------|------|-------|\n| id | UUID | PK |\n| email | VARCHAR | Unique |\n| created_at | TIMESTAMP | |\n\n## Orders Table\n\n| Column | Type | Notes |\n|--------|------|-------|\n| id | UUID | PK |\n| user_id | UUID | FK → users |\n| status | ENUM | pending/active/closed |', created_by: 'u2', created_at: '2024-11-10T10:00:00Z', updated_at: '2025-02-01T10:00:00Z' },
]

const mockVersions = [
  { id: 'v3', document_id: 'd1', version_number: 3, content: '# System Overview v3', commit_message: 'Merged DUR: Add Kafka section', created_by: 'u1', created_at: '2025-01-15T14:30:00Z' },
  { id: 'v2', document_id: 'd1', version_number: 2, content: '# System Overview v2', commit_message: 'Merged DUR: Update infra section', created_by: 'u2', created_at: '2024-12-10T09:00:00Z' },
  { id: 'v1', document_id: 'd1', version_number: 1, content: '# System Overview\n\nInitial version.', commit_message: 'Initial commit', created_by: 'u1', created_at: '2024-11-01T10:00:00Z' },
]

const mockDurs = [
  { id: 'dur1', repo_id: 'r1', document_id: 'd1', document: { id: 'd1', title: 'System Overview', slug: 'system-overview' }, title: 'Add Redis caching details to System Overview', description: 'The current doc does not explain our caching strategy. Proposing to add a dedicated section.', proposed_content: '# System Overview\n\nOur platform is built on a microservices architecture...\n\n## Services\n\n- **Auth Service** — handles authentication and JWT issuance\n- **Data Service** — manages persistence and querying\n- **Notification Service** — email/push delivery\n- **Cache Service** — Redis-backed caching layer\n\n## Infrastructure\n\nAll services run on Kubernetes (EKS). Traffic is routed through an NGINX ingress controller.\n\n## Caching Strategy\n\nWe use Redis for:\n- Session data (TTL: 30 min)\n- API response caching (TTL: 5 min)\n- Rate limiting counters\n\n## Key Decisions\n\n- PostgreSQL for relational data\n- Redis for caching and session management\n- Kafka for async event streaming', status: 'open', created_by: 'u2', creator: { id: 'u2', username: 'bob' }, reviewed_by: null, reviewer: null, review_comment: null, created_at: '2025-02-18T09:00:00Z', reviewed_at: null },
  { id: 'dur2', repo_id: 'r1', document_id: 'd2', document: { id: 'd2', title: 'Authentication Flow', slug: 'authentication-flow' }, title: 'Switch from RS256 to ES256 for JWT signing', description: 'ES256 offers equivalent security with smaller token sizes.', proposed_content: '# Authentication Flow\n\nWe use JWT-based auth with short-lived access tokens.\n\n## Token Lifecycle\n\n1. User logs in → receives `access_token` (30 min) + `refresh_token` (7 days)\n2. Access token is passed as `Authorization: Bearer <token>`\n3. On expiry, client uses refresh token to get a new pair\n\n## Security Notes\n\n- Tokens are signed with ES256 (previously RS256)\n- Refresh tokens are rotated on every use\n- Revocation is handled via a Redis blocklist', status: 'merged', created_by: 'u1', creator: { id: 'u1', username: 'alice' }, reviewed_by: 'u1', reviewer: { id: 'u1', username: 'alice' }, review_comment: 'Good call — smaller tokens and still NIST-approved.', created_at: '2025-02-10T14:00:00Z', reviewed_at: '2025-02-12T11:00:00Z' },
  { id: 'dur3', repo_id: 'r1', document_id: 'd3', document: { id: 'd3', title: 'Database Schema', slug: 'database-schema' }, title: 'Add indexes section to schema docs', description: 'Missing documentation on our indexing strategy.', proposed_content: '# Database Schema\n\n## Indexes\n\n- `users.email` — unique index\n- `orders.user_id` — btree index\n- `orders.status` — partial index (WHERE status = pending)\n\n## Users Table\n\n| Column | Type | Notes |\n|--------|------|-------|\n| id | UUID | PK |\n| email | VARCHAR | Unique |\n| created_at | TIMESTAMP | |\n\n## Orders Table\n\n| Column | Type | Notes |\n|--------|------|-------|\n| id | UUID | PK |\n| user_id | UUID | FK → users |\n| status | ENUM | pending/active/closed |', status: 'rejected', created_by: 'u2', creator: { id: 'u2', username: 'bob' }, reviewed_by: 'u1', reviewer: { id: 'u1', username: 'alice' }, review_comment: 'Indexes belong in the runbook, not the schema doc. Please move there.', created_at: '2025-02-05T10:00:00Z', reviewed_at: '2025-02-06T09:30:00Z' },
]

const mockComments = [
  { id: 'c1', dur_id: 'dur1', user_id: 'u1', author: { id: 'u1', username: 'alice' }, content: 'Looks good to me overall. Can you also mention the eviction policy we use?', created_at: '2025-02-18T10:30:00Z' },
  { id: 'c2', dur_id: 'dur1', user_id: 'u2', author: { id: 'u2', username: 'bob' }, content: 'Sure — we use allkeys-lru. I\'ll add that in.', created_at: '2025-02-18T11:00:00Z' },
]

const mockMembers = [
  { user_id: 'u1', user: { id: 'u1', username: 'alice', email: 'alice@acme.com' }, role: 'admin' },
  { user_id: 'u2', user: { id: 'u2', username: 'bob', email: 'bob@acme.com' }, role: 'editor' },
  { user_id: 'u3', user: { id: 'u3', username: 'carol', email: 'carol@acme.com' }, role: 'viewer' },
]

function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' })
  res.end(JSON.stringify(data))
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { respond(res, 200, {}); return }

  const url = new URL(req.url, 'http://localhost:8000')
  const path = url.pathname

  console.log(`${req.method} ${path}`)

  // Auth
  if (path === '/api/auth/login' && req.method === 'POST') return respond(res, 200, { access_token: mockToken, refresh_token: mockToken, token_type: 'bearer' })
  if (path === '/api/auth/register' && req.method === 'POST') return respond(res, 201, mockUser)
  if (path === '/api/auth/me') return respond(res, 200, mockUser)
  if (path === '/api/auth/refresh' && req.method === 'POST') return respond(res, 200, { access_token: mockToken, refresh_token: mockToken, token_type: 'bearer' })

  // Repos
  if (path === '/api/repos' && req.method === 'GET') return respond(res, 200, mockRepos)
  if (path === '/api/repos' && req.method === 'POST') return respond(res, 201, mockRepos[0])

  const repoMatch = path.match(/^\/api\/repos\/([^/]+)$/)
  if (repoMatch) return respond(res, 200, mockRepos.find(r => r.slug === repoMatch[1]) || mockRepos[0])

  const membersMatch = path.match(/^\/api\/repos\/([^/]+)\/members$/)
  if (membersMatch) return respond(res, 200, mockMembers)

  // Docs
  const docsListMatch = path.match(/^\/api\/repos\/([^/]+)\/docs$/)
  if (docsListMatch) return respond(res, 200, mockDocs)

  const docMatch = path.match(/^\/api\/repos\/([^/]+)\/docs\/([^/]+)$/)
  if (docMatch && !path.includes('/versions')) return respond(res, 200, mockDocs.find(d => d.slug === docMatch[2]) || mockDocs[0])

  const versionsMatch = path.match(/^\/api\/repos\/([^/]+)\/docs\/([^/]+)\/versions$/)
  if (versionsMatch) return respond(res, 200, mockVersions)

  const versionMatch = path.match(/^\/api\/repos\/([^/]+)\/docs\/([^/]+)\/versions\/(\d+)$/)
  if (versionMatch) return respond(res, 200, mockVersions.find(v => v.version_number === parseInt(versionMatch[3])) || mockVersions[0])

  // DURs
  const dursListMatch = path.match(/^\/api\/repos\/([^/]+)\/durs$/)
  if (dursListMatch && req.method === 'GET') {
    const status = url.searchParams.get('status')
    return respond(res, 200, status ? mockDurs.filter(d => d.status === status) : mockDurs)
  }

  const durMatch = path.match(/^\/api\/repos\/([^/]+)\/durs\/([^/]+)$/)
  if (durMatch) return respond(res, 200, mockDurs.find(d => d.id === durMatch[2]) || mockDurs[0])

  const durCommentsMatch = path.match(/^\/api\/repos\/([^/]+)\/durs\/([^/]+)\/comments$/)
  if (durCommentsMatch) return respond(res, 200, mockComments)

  respond(res, 404, { detail: 'Not found' })
})

server.listen(8000, () => console.log('Mock API running on http://localhost:8000'))
