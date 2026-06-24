import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  CmsBlockPayload,
  STORE_SETTING_SCOPES,
  getStoreSettingsService,
  toSettingResponse,
} from "../../../../lib/store-settings"
import {
  buildStorefrontCacheCookie,
  refreshStorefrontCache,
} from "../../../../lib/storefront-cache"

// Best-effort storefront cache refresh shared by every CMS mutation so edits show on
// the storefront without failing the save when the storefront is briefly unreachable.
async function refreshCmsCache(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<string[]> {
  try {
    const { nextCacheId } = await refreshStorefrontCache(req, ["settings"])
    res.setHeader("Set-Cookie", buildStorefrontCacheCookie(nextCacheId))
    return []
  } catch (error) {
    return [
      `Settings saved, but refreshing the storefront cache failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ]
  }
}

type CmsBlockInput = {
  id?: string
  key: string
  title: string
  description?: string
  enabled?: boolean
  sort_order?: number
  payload: CmsBlockPayload
}

async function saveCmsBlock(
  req: MedusaRequest,
  block: CmsBlockInput,
  action: "create" | "update"
) {
  const service = await getStoreSettingsService(req.scope)

  if (action === "update" && block.id) {
    return await service.updateById({
      id: block.id,
      key: block.key,
      scope: STORE_SETTING_SCOPES.CMS,
      title: block.title,
      description: block.description,
      enabled: block.enabled,
      sort_order: block.sort_order,
      payload: JSON.stringify(block.payload),
    })
  }

  return await service.upsertByKey({
    key: block.key,
    scope: STORE_SETTING_SCOPES.CMS,
    title: block.title,
    description: block.description,
    enabled: block.enabled,
    sort_order: block.sort_order,
    payload: JSON.stringify(block.payload),
  })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = await getStoreSettingsService(req.scope)
  const settings = await service.listByScope(STORE_SETTING_SCOPES.CMS)

  return res.json({
    blocks: settings.map(toSettingResponse),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { block?: CmsBlockInput }

  if (!body.block) {
    return res.status(400).json({
      message: "Missing CMS block payload.",
    })
  }

  const created = await saveCmsBlock(req, body.block, "create")
  const warnings = await refreshCmsCache(req, res)

  return res.json({
    block: toSettingResponse(created),
    ...(warnings.length ? { warnings } : {}),
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { block?: CmsBlockInput }

  if (!body.block) {
    return res.status(400).json({
      message: "Missing CMS block payload.",
    })
  }

  const updated = await saveCmsBlock(req, body.block, "update")
  const warnings = await refreshCmsCache(req, res)

  return res.json({
    block: toSettingResponse(updated),
    ...(warnings.length ? { warnings } : {}),
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { id?: string; key?: string }
  const service = await getStoreSettingsService(req.scope)

  if (body.id) {
    await service.deleteById(body.id)
    const warnings = await refreshCmsCache(req, res)
    return res.json({ deleted: true, ...(warnings.length ? { warnings } : {}) })
  }

  if (body.key) {
    const block = await service.getByKey(body.key)

    if (block) {
      await service.deleteById(block.id)
      const warnings = await refreshCmsCache(req, res)
      return res.json({ deleted: true, ...(warnings.length ? { warnings } : {}) })
    }
  }

  return res.status(404).json({
    message: "CMS block not found.",
  })
}
