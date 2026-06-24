import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  STORE_SETTING_SCOPES,
  getStoreSettingsService,
  syncShippingMethods,
  toSettingResponse,
} from "../../../../lib/store-settings"
import {
  buildStorefrontCacheCookie,
  refreshStorefrontCache,
} from "../../../../lib/storefront-cache"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const settings = await service.listByScope(STORE_SETTING_SCOPES.SHIPPING)

  return res.json({
    shipping: settings.map(toSettingResponse),
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const body = (req.body ?? {}) as {
    shipping?: Array<{
      key: string
      title: string
      description?: string
      enabled?: boolean
      sort_order?: number
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
    }>
  }

  const shipping = body.shipping ?? []

  // 1. Persist the merchant settings first — this is the actual "save". It must
  //    succeed for the request to be considered successful.
  for (const method of shipping) {
    await service.upsertByKey({
      key: method.key,
      scope: STORE_SETTING_SCOPES.SHIPPING,
      title: method.title,
      description: method.description,
      enabled: method.enabled,
      sort_order: method.sort_order,
      payload: JSON.stringify(method.payload),
    })
  }

  // 2. Sync into Medusa shipping options and refresh the storefront cache. These
  //    are reported as warnings rather than failing the save, so a transient
  //    storefront outage (or a sync edge case) never reports "could not be saved"
  //    after the settings were in fact persisted.
  const warnings: string[] = []

  try {
    await syncShippingMethods(req.scope)
  } catch (error) {
    warnings.push(
      `Settings saved, but syncing checkout shipping options failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  try {
    const { nextCacheId } = await refreshStorefrontCache(req, [
      "settings",
      "fulfillment",
      "shippingOptions",
    ])
    res.setHeader("Set-Cookie", buildStorefrontCacheCookie(nextCacheId))
  } catch (error) {
    warnings.push(
      `Settings saved, but refreshing the storefront cache failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  const updatedSettings = await service.listByScope(STORE_SETTING_SCOPES.SHIPPING)

  return res.json({
    shipping: updatedSettings.map(toSettingResponse),
    ...(warnings.length ? { warnings } : {}),
  })
}
