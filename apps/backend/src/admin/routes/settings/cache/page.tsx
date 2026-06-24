"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

type CachePreset = {
  key: string
  title: string
  description: string
  enabled: boolean
  sort_order: number
  payload: { tags: string[] }
}

const CacheSettingsPage = () => {
  const [presets, setPresets] = useState<CachePreset[]>([])
  const [status, setStatus] = useState("Loading cache presets...")

  useEffect(() => {
    fetch("/admin/settings/cache")
      .then((res) => res.json())
      .then((data) => {
        setPresets(data.presets ?? [])
        setStatus("Toggle the presets and flush the storefront cache on demand.")
      })
  }, [])

  const save = async () => {
    setStatus("Saving cache presets...")
    const response = await fetch("/admin/settings/cache", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ presets }),
    })

    if (!response.ok) {
      setStatus("The cache presets could not be saved.")
      return
    }

    setStatus("Cache presets saved.")
  }

  const flush = async (presetKey: string) => {
    setStatus(`Flushing ${presetKey} cache...`)
    const response = await fetch("/admin/cache/refresh", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ preset: presetKey }),
    })

    if (!response.ok) {
      setStatus("The cache flush request failed.")
      return
    }

    setStatus(`Cache flushed for ${presetKey}.`)
  }

  return (
    <Container className="max-w-6xl p-0">
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Heading level="h1">Cache controls</Heading>
          <p className="text-ui-fg-subtle">{status}</p>
        </div>

        <div className="grid gap-4">
          {presets.map((preset, index) => (
            <div
              key={preset.key}
              className="flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Heading level="h2">{preset.title}</Heading>
                <label className="flex items-center gap-2 text-sm text-ui-fg-base">
                  <input
                    type="checkbox"
                    checked={preset.enabled}
                    onChange={(event) =>
                      setPresets(
                        presets.map((current, currentIndex) =>
                          currentIndex === index
                            ? { ...current, enabled: event.target.checked }
                            : current
                        )
                      )
                    }
                  />
                  Enabled
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ui-fg-base">
                  Description
                </span>
                <input
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={preset.description}
                  onChange={(event) =>
                    setPresets(
                      presets.map((current, currentIndex) =>
                        currentIndex === index
                          ? { ...current, description: event.target.value }
                          : current
                      )
                    )
                  }
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ui-fg-base">
                  Tags to flush
                </span>
                <input
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={preset.payload.tags.join(", ")}
                  onChange={(event) =>
                    setPresets(
                      presets.map((current, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...current,
                              payload: {
                                tags: event.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean),
                              },
                            }
                          : current
                      )
                    )
                  }
                />
              </label>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => flush(preset.key)}>
                  Flush cache
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <Button onClick={save}>Save cache presets</Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Cache Controls",
})

export default CacheSettingsPage
