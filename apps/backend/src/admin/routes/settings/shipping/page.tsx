"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

type ShippingFormItem = {
  key: string
  title: string
  description: string
  enabled: boolean
  sort_order: number
  payload: {
    code: string
    shipping_type_code: string
    shipping_type_label: string
    shipping_type_description: string
    price: number
    price_bracket_operator?: ">" | "<"
    price_bracket_amount?: number
    service_zone_id?: string
    shipping_profile_id?: string
    native_shipping_option_id?: string
  }
}

const ShippingSettingsPage = () => {
  const [items, setItems] = useState<ShippingFormItem[]>([])
  const [status, setStatus] = useState("Loading shipping methods...")

  useEffect(() => {
    fetch("/admin/settings/shipping")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.shipping ?? [])
        setStatus(
          "Edit the shipping methods, including any conditional price bracket, and save to sync checkout."
        )
      })
  }, [])

  const save = async () => {
    setStatus("Saving shipping methods...")

    let response: Response
    try {
      response = await fetch("/admin/settings/shipping", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ shipping: items }),
      })
    } catch (error) {
      setStatus(
        `The shipping methods could not be saved: ${
          error instanceof Error ? error.message : "network error"
        }`
      )
      return
    }

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const detail = data?.message || data?.error
      setStatus(
        detail
          ? `The shipping methods could not be saved: ${detail}`
          : "The shipping methods could not be saved."
      )
      return
    }

    if (Array.isArray(data?.shipping)) {
      setItems(data.shipping)
    }

    if (Array.isArray(data?.warnings) && data.warnings.length) {
      setStatus(data.warnings.join(" "))
      return
    }

    setStatus("Shipping methods saved and synchronized.")
  }

  return (
    <Container className="max-w-6xl p-0">
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Heading level="h1">Shipping methods</Heading>
          <p className="text-ui-fg-subtle">{status}</p>
        </div>

        <div className="grid gap-4">
          {items.map((item, index) => (
            <div
              key={item.key}
              className="flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Heading level="h2">{item.title}</Heading>
                <label className="flex items-center gap-2 text-sm text-ui-fg-base">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      setItems(
                        items.map((current, currentIndex) =>
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
                  Display name
                </span>
                <input
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={item.title}
                  onChange={(event) =>
                    setItems(
                      items.map((current, currentIndex) =>
                        currentIndex === index
                          ? { ...current, title: event.target.value }
                          : current
                      )
                    )
                  }
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ui-fg-base">
                  Detail
                </span>
                <input
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={item.description}
                  onChange={(event) =>
                    setItems(
                      items.map((current, currentIndex) =>
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
                  Price
                </span>
                <input
                  type="number"
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={item.payload.price}
                  onChange={(event) =>
                    setItems(
                      items.map((current, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...current,
                              payload: {
                                ...current.payload,
                                price: Number(event.target.value),
                              },
                            }
                          : current
                      )
                    )
                  }
                  />
              </label>

              <div className="grid gap-4 small:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-ui-fg-base">
                    Price bracket
                  </span>
                  <select
                    className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                    value={item.payload.price_bracket_operator ?? ""}
                    onChange={(event) =>
                      setItems(
                        items.map((current, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...current,
                                payload: {
                                  ...current.payload,
                                  price_bracket_operator:
                                    event.target.value === ""
                                      ? undefined
                                      : (event.target.value as ">" | "<"),
                                  price_bracket_amount:
                                    event.target.value === ""
                                      ? undefined
                                      : current.payload.price_bracket_amount ??
                                        current.payload.price,
                                },
                              }
                            : current
                        )
                      )
                    }
                  >
                    <option value="">Always available</option>
                    <option value=">">{"> minimum order amount"}</option>
                    <option value="<">{"< maximum order amount"}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-ui-fg-base">
                    Bracket amount
                  </span>
                  <input
                    type="number"
                    className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                    value={item.payload.price_bracket_amount ?? ""}
                    onChange={(event) =>
                      setItems(
                        items.map((current, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...current,
                                payload: {
                                  ...current.payload,
                                  price_bracket_amount:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                  price_bracket_operator:
                                    current.payload.price_bracket_operator ??
                                    ">",
                                },
                              }
                            : current
                        )
                      )
                    }
                    placeholder="10000"
                    disabled={!item.payload.price_bracket_operator}
                  />
                </label>
              </div>

              <p className="text-xs text-ui-fg-subtle">
                Use a bracket only when the shipping price should apply above or
                below an order total. For example, set price to 0, choose {'>'},
                and enter `10000` to make free shipping available from 10,000.
              </p>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ui-fg-base">
                  Method description shown to shoppers
                </span>
                <input
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={item.payload.shipping_type_description}
                  onChange={(event) =>
                    setItems(
                      items.map((current, currentIndex) =>
                        currentIndex === index
                          ? {
                              ...current,
                              payload: {
                                ...current.payload,
                                shipping_type_description: event.target.value,
                              },
                            }
                          : current
                      )
                    )
                  }
                />
              </label>
            </div>
          ))}
        </div>

        <div>
          <Button onClick={save}>Save shipping methods</Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Shipping Methods",
})

export default ShippingSettingsPage
