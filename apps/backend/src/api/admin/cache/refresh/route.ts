import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  DEFAULT_CACHE_SETTINGS,
  STORE_SETTING_SCOPES,
  getStoreSettingsService,
  parseSettingPayload,
} from "../../../../lib/store-settings"
import {
  buildStorefrontCacheCookie,
  refreshStorefrontCache,
} from "../../../../lib/storefront-cache"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { preset?: string }
  const service = await getStoreSettingsService(req.scope)
  const presetKey = body.preset ?? "full"

  let tags: string[] = []

  const preset = await service.getByKey(presetKey)

  if (preset && preset.scope === STORE_SETTING_SCOPES.CACHE) {
    tags = parseSettingPayload<{ tags: string[] }>(preset).tags
  } else if (!body.preset) {
    const fullPreset = DEFAULT_CACHE_SETTINGS.find(
      (setting) => setting.key === "full"
    )

    tags = (fullPreset?.payload as { tags: string[] } | undefined)?.tags ?? []
  }

  if (!tags.length) {
    return res.status(400).json({
      refreshed: false,
      message: "Unable to resolve cache tags for the requested preset.",
    })
  }

  try {
    const { nextCacheId } = await refreshStorefrontCache(req, tags)

    res.setHeader("Set-Cookie", buildStorefrontCacheCookie(nextCacheId))
  } catch (error) {
    console.error("Failed to refresh storefront cache", error)
    return res.status(500).json({
      refreshed: false,
      message: "Unable to refresh the storefront cache.",
    })
  }

  return res.status(200).json({
    refreshed: true,
  })
}
