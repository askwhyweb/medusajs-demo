"use client"

import { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading } from "@medusajs/ui"

const CacheRefreshPage = () => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState(
    "Refresh the storefront cache after saving new products, images, prices, or regions."
  )

  const refreshCache = async () => {
    setIsRefreshing(true)

    try {
      const response = await fetch("/admin/cache/refresh", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("The cache refresh request was not accepted.")
      }

      setMessage(
        "Storefront cache refreshed. Reload the storefront tab to see the latest catalog data."
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The storefront cache could not be refreshed."
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Container className="max-w-2xl p-0">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Heading level="h1">Cache Refresh</Heading>
          <p className="text-ui-fg-subtle">
            Rotate the storefront cache namespace and clear the currently cached
            catalog data for this browser session.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
          <p className="text-ui-fg-subtle">{message}</p>
          <div>
            <Button onClick={refreshCache} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh Storefront Cache"}
            </Button>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Cache Refresh",
})

export default CacheRefreshPage
