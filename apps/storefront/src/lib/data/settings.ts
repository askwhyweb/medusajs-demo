"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { cookies as nextCookies } from "next/headers"

export type StoreSettingsPayload<T> = {
  id: string
  key: string
  scope: "cache" | "cms" | "payment" | "shipping"
  title: string
  description: string
  enabled: boolean
  sort_order: number
  payload: T
}

export type StoreSettingsResponse = {
  cache: StoreSettingsPayload<{ tags: string[] }>[]
  cms: StoreSettingsPayload<{ placement: string; html: string }>[]
  payment: StoreSettingsPayload<{
    bank_name: string
    account_name: string
    account_number: string
    iban: string
    swift: string
    branch: string
    instructions: string
    reference_hint: string
  }> | null
  shipping: StoreSettingsPayload<{
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
  }>[]
}

export const getStoreSettings = async () => {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    const next = {
      ...(await getCacheOptions("settings")),
    }

    return await sdk.client.fetch<StoreSettingsResponse>("/store/settings", {
      method: "GET",
      query: cacheId ? { cache_id: cacheId } : undefined,
      headers,
      next,
      cache: "force-cache",
    })
  } catch {
    return {
      cache: [],
      cms: [],
      payment: null,
      shipping: [],
    }
  }
}

export const getCmsBlocks = async (placement?: string) => {
  const { cms } = await getStoreSettings()
  const enabled = cms.filter((block) => block.enabled)

  if (!placement) {
    return enabled.sort((left, right) => left.sort_order - right.sort_order)
  }

  return enabled
    .filter((block) => block.payload.placement === placement)
    .sort((left, right) => left.sort_order - right.sort_order)
}

export const getPaymentSettings = async () => {
  const { payment } = await getStoreSettings()
  return payment?.enabled ? payment : null
}

export const getShippingSettings = async () => {
  const { shipping } = await getStoreSettings()
  return shipping.filter((method) => method.enabled)
}
