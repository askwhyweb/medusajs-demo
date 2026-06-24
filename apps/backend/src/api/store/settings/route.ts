import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  STORE_SETTING_SCOPES,
  getEnabledStoreSettings,
  getStoreSettingsService,
  toSettingResponse,
} from "../../../lib/store-settings"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)

  const [cacheSettings, cmsSettings, paymentSettings, shippingSettings] =
    await Promise.all([
      service.listByScope(STORE_SETTING_SCOPES.CACHE),
      service.listByScope(STORE_SETTING_SCOPES.CMS),
      service.listByScope(STORE_SETTING_SCOPES.PAYMENT),
      service.listByScope(STORE_SETTING_SCOPES.SHIPPING),
    ])

  return res.json({
    cache: getEnabledStoreSettings(cacheSettings),
    cms: getEnabledStoreSettings(cmsSettings),
    payment:
      paymentSettings[0] && paymentSettings[0].enabled
        ? toSettingResponse(paymentSettings[0])
        : null,
    shipping: getEnabledStoreSettings(shippingSettings),
  })
}
