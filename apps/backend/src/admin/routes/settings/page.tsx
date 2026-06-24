"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

type SettingsSummary = {
  cache: unknown[]
  cms: unknown[]
  payment: unknown | null
  shipping: unknown[]
}

const SettingsHubPage = () => {
  const [summary, setSummary] = useState<SettingsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/admin/settings")
      .then((res) => res.json())
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="max-w-5xl p-0">
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Heading level="h1">Store settings</Heading>
          <p className="text-ui-fg-subtle">
            Manage cache controls, payment instructions, shipping methods, and
            storefront CMS content from one place.
          </p>
        </div>

        <div className="grid gap-4 small:grid-cols-2">
          <SettingCard
            title="Cache controls"
            description="Flush the configured cache presets on demand."
            href="/app/settings/cache"
            count={summary?.cache.length}
            loading={loading}
          />
          <SettingCard
            title="Bank transfer"
            description="Edit the offline payment details shown during checkout."
            href="/app/settings/payment"
            count={summary?.payment ? 1 : 0}
            loading={loading}
          />
          <SettingCard
            title="Shipping methods"
            description="Manage the three shipping methods surfaced at checkout."
            href="/app/settings/shipping"
            count={summary?.shipping.length}
            loading={loading}
          />
          <SettingCard
            title="CMS blocks"
            description="Edit the homepage block with the WYSIWYG editor."
            href="/app/cms"
            count={summary?.cms.length}
            loading={loading}
          />
        </div>
      </div>
    </Container>
  )
}

function SettingCard({
  title,
  description,
  href,
  count,
  loading,
}: {
  title: string
  description: string
  href: string
  count?: number
  loading: boolean
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-ui-fg-base">{title}</h2>
          <p className="mt-1 text-sm text-ui-fg-subtle">{description}</p>
        </div>
        <div className="rounded-full bg-ui-button-neutral-hover px-3 py-1 text-xs text-ui-fg-base">
          {loading ? "Loading" : `${count ?? 0} item${count === 1 ? "" : "s"}`}
        </div>
      </div>
      <a
        href={href}
        className="inline-flex w-fit items-center rounded-md border border-ui-border-base bg-ui-bg-base px-4 py-2 text-sm font-medium text-ui-fg-base hover:bg-ui-bg-subtle"
      >
        Open
      </a>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Settings",
})

export default SettingsHubPage
