import { MedusaRequest } from "@medusajs/framework/http"
import { randomUUID } from "node:crypto"

const STOREFRONT_URL =
  process.env.MEDUSA_INTERNAL_STOREFRONT_URL || "http://storefront:8000"

export function buildStorefrontCacheCookie(nextCacheId: string) {
  return `_medusa_cache_id=${nextCacheId}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax; HttpOnly${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`
}

export async function refreshStorefrontCache(
  req: Pick<MedusaRequest, "cookies">,
  tags: string[]
) {
  const currentCacheId = req.cookies?.["_medusa_cache_id"]
  const nextCacheId = randomUUID()

  const refreshResponse = await fetch(`${STOREFRONT_URL}/api/cache/refresh`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(currentCacheId ? { "x-medusa-cache-id": currentCacheId } : {}),
    },
    body: JSON.stringify({
      cacheId: currentCacheId,
      nextCacheId,
      tags,
    }),
  })

  if (!refreshResponse.ok) {
    throw new Error(`Storefront refresh returned ${refreshResponse.status}`)
  }

  return {
    currentCacheId,
    nextCacheId,
  }
}
