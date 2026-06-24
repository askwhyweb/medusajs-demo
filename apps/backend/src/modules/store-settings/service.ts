import { MedusaService } from "@medusajs/framework/utils"
import StoreSetting from "./models/store-setting"

class StoreSettingsModuleService extends MedusaService({
  StoreSetting,
}) {
  async listByScope(scope: string) {
    return await this.listStoreSettings(
      { scope },
      {
        order: { sort_order: "ASC" },
      }
    )
  }

  async getByKey(key: string) {
    const settings = await this.listStoreSettings({ key }, { take: 1 })
    return settings[0] ?? null
  }

  async upsertByKey(input: {
    key: string
    scope: string
    title: string
    description?: string
    enabled?: boolean
    sort_order?: number
    payload: string
  }) {
    const existing = await this.getByKey(input.key)

    if (existing) {
      const [updated] = await this.updateStoreSettings([
        {
          id: existing.id,
          scope: input.scope,
          title: input.title,
          description: input.description ?? "",
          enabled: input.enabled ?? true,
          sort_order: input.sort_order ?? 0,
          payload: input.payload,
        },
      ])

      return updated
    }

    const [created] = await this.createStoreSettings([
      {
        key: input.key,
        scope: input.scope,
        title: input.title,
        description: input.description ?? "",
        enabled: input.enabled ?? true,
        sort_order: input.sort_order ?? 0,
        payload: input.payload,
      },
    ])

    return created
  }

  async updateById(input: {
    id: string
    key: string
    scope: string
    title: string
    description?: string
    enabled?: boolean
    sort_order?: number
    payload: string
  }) {
    const [updated] = await this.updateStoreSettings([
      {
        id: input.id,
        key: input.key,
        scope: input.scope,
        title: input.title,
        description: input.description ?? "",
        enabled: input.enabled ?? true,
        sort_order: input.sort_order ?? 0,
        payload: input.payload,
      },
    ])

    return updated
  }

  async deleteById(id: string) {
    await this.deleteStoreSettings([id])
  }
}

export default StoreSettingsModuleService
