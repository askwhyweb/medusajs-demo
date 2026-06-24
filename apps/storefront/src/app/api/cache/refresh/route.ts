import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

const CACHE_TAGS = [
  "products",
  "categories",
  "collections",
  "regions",
  "variants",
  "customers",
  "carts",
  "orders",
  "fulfillment",
  "locales",
  "payment_providers",
  "shippingOptions",
]

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { cacheId?: string; nextCacheId?: string; tags?: string[] }
    | null

  const cacheId =
    body?.cacheId || request.headers.get("x-medusa-cache-id") || ""
  const tags = body?.tags?.length ? body.tags : CACHE_TAGS

  // Revalidate the bare tag so every visitor's cache is busted regardless of their
  // per-session cache id, and also the session-scoped variant when a cache id is
  // supplied (matches the dual-tagging in getCacheOptions).
  for (const tag of tags) {
    revalidateTag(tag)
  }

  if (cacheId) {
    for (const tag of tags) {
      revalidateTag(`${tag}-${cacheId}`)
    }
  }

  const response = NextResponse.json({
    refreshed: true,
    cacheId,
  })

  const nextCacheId = body?.nextCacheId

  if (nextCacheId) {
    response.cookies.set("_medusa_cache_id", nextCacheId, {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  }

  return response
}
