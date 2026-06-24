import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  STORE_SETTING_SCOPES,
  getStoreSettingsService,
  toSettingResponse,
} from "../../../../lib/store-settings"
import {
  buildStorefrontCacheCookie,
  refreshStorefrontCache,
} from "../../../../lib/storefront-cache"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const settings = await service.listByScope(STORE_SETTING_SCOPES.PAYMENT)

  return res.json({
    payment: settings[0] ? toSettingResponse(settings[0]) : null,
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const body = (req.body ?? {}) as {
    payment?: {
      key: string
      title: string
      description?: string
      enabled?: boolean
      sort_order?: number
      payload: {
        bank_name: string
        account_name: string
        account_number: string
        iban: string
        swift: string
        branch: string
        instructions: string
        reference_hint: string
      }
    }
  }

  if (!body.payment) {
    return res.status(400).json({
      message: "Missing bank transfer settings.",
    })
  }

  const updated = await service.upsertByKey({
    key: body.payment.key,
    scope: STORE_SETTING_SCOPES.PAYMENT,
    title: body.payment.title,
    description: body.payment.description,
    enabled: body.payment.enabled,
    sort_order: body.payment.sort_order,
    payload: JSON.stringify(body.payment.payload),
  })

  // Best-effort storefront cache refresh — a transient storefront outage must not
  // make a successfully-saved payment setting report as failed.
  const warnings: string[] = []
  try {
    const { nextCacheId } = await refreshStorefrontCache(req, ["settings"])
    res.setHeader("Set-Cookie", buildStorefrontCacheCookie(nextCacheId))
  } catch (error) {
    warnings.push(
      `Settings saved, but refreshing the storefront cache failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  return res.json({
    payment: toSettingResponse(updated),
    ...(warnings.length ? { warnings } : {}),
  })
}
