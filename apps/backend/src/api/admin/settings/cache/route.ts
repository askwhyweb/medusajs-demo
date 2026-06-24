import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  STORE_SETTING_SCOPES,
  getStoreSettingsService,
  toSettingResponse,
} from "../../../../lib/store-settings"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const settings = await service.listByScope(STORE_SETTING_SCOPES.CACHE)

  return res.json({
    presets: settings.map(toSettingResponse),
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const body = (req.body ?? {}) as {
    presets?: Array<{
      key: string
      title: string
      description?: string
      enabled?: boolean
      sort_order?: number
      payload: { tags: string[] }
    }>
  }

  const presets = body.presets ?? []

  for (const preset of presets) {
    await service.upsertByKey({
      key: preset.key,
      scope: STORE_SETTING_SCOPES.CACHE,
      title: preset.title,
      description: preset.description,
      enabled: preset.enabled,
      sort_order: preset.sort_order,
      payload: JSON.stringify(preset.payload),
    })
  }

  return res.json({ updated: true })
}
