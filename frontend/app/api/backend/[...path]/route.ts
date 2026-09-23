/**
 * Same-origin reverse proxy for the Beelink FastAPI backend.
 *
 * Browser -> (https, same origin) /api/backend/... -> (http, server-side) EC2 backend.
 * The browser never contacts the EC2 http:// URL directly, so there is no
 * mixed-content block and no CORS preflight against the backend.
 *
 * Target is server-only `BACKEND_URL` (e.g. http://3.109.3.187:8001).
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function backendBase(): string {
  const raw =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://3.109.3.187:8001'
  // Never end with a slash; paths are appended below.
  return raw.replace(/\/+$/, '')
}

async function proxy(req: Request, params: { path?: string[] }) {
  const base = backendBase()
  const incoming = new URL(req.url)
  const targetPath = (params.path ?? []).join('/')
  const target = `${base}/${targetPath}${incoming.search}`

  // Forward a minimal safe header set (auth + content negotiation).
  const headers = new Headers()
  for (const key of [
    'authorization',
    'content-type',
    'accept',
    'accept-language',
  ]) {
    const value = req.headers.get(key)
    if (value) headers.set(key, value)
  }

  const method = req.method.toUpperCase()
  const hasBody = !['GET', 'HEAD'].includes(method)
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      // Never cache auth/ledger traffic at the fetch layer.
      cache: 'no-store',
      redirect: 'manual',
    })
  } catch (err) {
    return Response.json(
      { detail: `Backend unreachable at ${base}` },
      { status: 502 },
    )
  }

  // Pass through status + body bytes verbatim (supports JSON, PNG QR, PDF).
  const buf = Buffer.from(await upstream.arrayBuffer())
  const outHeaders = new Headers()
  for (const key of [
    'content-type',
    'content-disposition',
    'content-length',
    'cache-control',
  ]) {
    const value = upstream.headers.get(key)
    if (value) outHeaders.set(key, value)
  }

  return new Response(buf, { status: upstream.status, headers: outHeaders })
}

export async function GET(
  req: Request,
  ctx: { params: { path?: string[] } },
) {
  return proxy(req, ctx.params)
}

export async function POST(
  req: Request,
  ctx: { params: { path?: string[] } },
) {
  return proxy(req, ctx.params)
}

export async function PUT(
  req: Request,
  ctx: { params: { path?: string[] } },
) {
  return proxy(req, ctx.params)
}

export async function PATCH(
  req: Request,
  ctx: { params: { path?: string[] } },
) {
  return proxy(req, ctx.params)
}

export async function DELETE(
  req: Request,
  ctx: { params: { path?: string[] } },
) {
  return proxy(req, ctx.params)
}
