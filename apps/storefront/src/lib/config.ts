import "server-only"

import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"
import { cookies as nextCookies } from "next/headers"

const getBackendUrl = () => {
  if (typeof window === "undefined") {
    return (
      process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "http://backend:9000"
    )
  }

  return process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
}

export const sdk = new Medusa({
  baseUrl: getBackendUrl(),
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

const getCacheHeader = async () => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return {}
    }

    return { "x-medusa-cache-id": cacheId }
  } catch {
    return {}
  }
}

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const cacheHeader = await getCacheHeader()

  const newHeaders = {
    ...localeHeader,
    ...cacheHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
