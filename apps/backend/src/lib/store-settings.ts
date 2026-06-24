import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"

export const STORE_SETTINGS_MODULE = "store_settings"

export const STORE_SETTING_SCOPES = {
  CACHE: "cache",
  CMS: "cms",
  PAYMENT: "payment",
  SHIPPING: "shipping",
} as const

export type StoreSettingScope =
  (typeof STORE_SETTING_SCOPES)[keyof typeof STORE_SETTING_SCOPES]

export type StoreSettingRecord = {
  id: string
  key: string
  scope: StoreSettingScope
  title: string
  description: string
  enabled: boolean
  sort_order: number
  payload: string
}

export type CachePresetPayload = {
  tags: string[]
}

export type CmsBlockPayload = {
  html: string
  placement: string
}

export type BankTransferPayload = {
  bank_name: string
  account_name: string
  account_number: string
  iban: string
  swift: string
  branch: string
  instructions: string
  reference_hint: string
}

export type ShippingMethodPayload = {
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

// Medusa's set-shipping-options-prices step iterates `price.rules` as an array of
// `{ attribute, operator, value }` entries (see core-flows buildPrices). Returning an
// object here triggers "rules is not iterable" and a 500 on save, so the rule for a
// conditional price bracket must be expressed as an array.
function buildShippingPriceRules(payload: ShippingMethodPayload) {
  if (
    !payload.price_bracket_operator ||
    typeof payload.price_bracket_amount !== "number"
  ) {
    return undefined
  }

  return [
    {
      attribute: "item_total",
      operator: payload.price_bracket_operator === ">" ? "gte" : "lte",
      value: payload.price_bracket_amount,
    },
  ]
}

function buildShippingPrices(payload: ShippingMethodPayload) {
  const rules = buildShippingPriceRules(payload)

  return [
    {
      currency_code: "pkr",
      amount: payload.price,
      ...(rules ? { rules } : {}),
    },
  ]
}

export type StoreSettingsSeed = {
  key: string
  scope: StoreSettingScope
  title: string
  description?: string
  enabled?: boolean
  sort_order?: number
  payload: unknown
}

export const DEFAULT_CACHE_SETTINGS: StoreSettingsSeed[] = [
  {
    key: "catalog",
    scope: STORE_SETTING_SCOPES.CACHE,
    title: "Catalog cache",
    description:
      "Flush catalog, product, merchandising, and storefront settings cache tags.",
    enabled: true,
    sort_order: 1,
    payload: {
      tags: ["products", "categories", "collections", "regions", "settings"],
    },
  },
  {
    key: "checkout",
    scope: STORE_SETTING_SCOPES.CACHE,
    title: "Checkout cache",
    description:
      "Flush cart, shipping, payment, order, and storefront settings cache tags.",
    enabled: true,
    sort_order: 2,
    payload: {
      tags: [
        "carts",
        "shippingOptions",
        "fulfillment",
        "payment_providers",
        "customers",
        "settings",
      ],
    },
  },
  {
    key: "full",
    scope: STORE_SETTING_SCOPES.CACHE,
    title: "Full storefront cache",
    description:
      "Flush the combined storefront cache namespace, settings, and all tags.",
    enabled: true,
    sort_order: 3,
    payload: {
      tags: [
        "products",
        "categories",
        "collections",
        "regions",
        "carts",
        "shippingOptions",
        "fulfillment",
        "payment_providers",
        "customers",
        "orders",
        "settings",
      ],
    },
  },
]

export const DEFAULT_CMS_BLOCKS: StoreSettingsSeed[] = [
  {
    key: "homepage-feature",
    scope: STORE_SETTING_SCOPES.CMS,
    title: "Homepage feature block",
    description: "Visible on the storefront homepage below the hero section.",
    enabled: true,
    sort_order: 1,
    payload: {
      placement: "homepage",
      html: "<h2>Built for local commerce operations.</h2><p>Manage content, shipping, payments, and cache behavior from one Medusa-backed control surface.</p>",
    },
  },
]

export const DEFAULT_PAYMENT_SETTINGS: StoreSettingsSeed = {
  key: "bank_transfer",
  scope: STORE_SETTING_SCOPES.PAYMENT,
  title: "Bank transfer",
  description: "Offline payment details shown when bank transfer is selected.",
  enabled: true,
  sort_order: 1,
  payload: {
    bank_name: "Demo Bank",
    account_name: "Medusa Demo Store",
    account_number: "000123456789",
    iban: "PK00DEMO000123456789",
    swift: "DEMOPKKA",
    branch: "Karachi Main Branch",
    instructions:
      "Complete the transfer using the order reference shown at checkout. Orders are confirmed after payment is received.",
    reference_hint: "Use your order number in the transfer reference.",
  },
}

export const DEFAULT_SHIPPING_METHODS: StoreSettingsSeed[] = [
  {
    key: "standard_shipping",
    scope: STORE_SETTING_SCOPES.SHIPPING,
    title: "Standard shipping",
    description: "Ground delivery for customers who want the best value.",
    enabled: true,
    sort_order: 1,
    payload: {
      code: "standard",
      shipping_type_code: "standard",
      shipping_type_label: "Standard",
      shipping_type_description: "Delivered in 3-5 business days.",
      price: 1200,
    },
  },
  {
    key: "express_shipping",
    scope: STORE_SETTING_SCOPES.SHIPPING,
    title: "Express shipping",
    description: "Faster delivery for time-sensitive orders.",
    enabled: true,
    sort_order: 2,
    payload: {
      code: "express",
      shipping_type_code: "express",
      shipping_type_label: "Express",
      shipping_type_description: "Delivered in 1-2 business days.",
      price: 2500,
    },
  },
  {
    key: "priority_shipping",
    scope: STORE_SETTING_SCOPES.SHIPPING,
    title: "Priority shipping",
    description: "Fastest delivery for high-priority dispatches.",
    enabled: true,
    sort_order: 3,
    payload: {
      code: "priority",
      shipping_type_code: "priority",
      shipping_type_label: "Priority",
      shipping_type_description: "Delivered next business day where available.",
      price: 3900,
    },
  },
]

export function parseSettingPayload<T>(setting: Pick<StoreSettingRecord, "payload">) {
  return JSON.parse(setting.payload) as T
}

export function serializeSettingPayload(payload: unknown) {
  return JSON.stringify(payload)
}

export function toSettingResponse<T>(setting: StoreSettingRecord) {
  return {
    id: setting.id,
    key: setting.key,
    scope: setting.scope,
    title: setting.title,
    description: setting.description,
    enabled: setting.enabled,
    sort_order: setting.sort_order,
    payload: parseSettingPayload<T>(setting),
  }
}

export async function getStoreSettingsService(container: MedusaContainer) {
  return container.resolve(STORE_SETTINGS_MODULE) as {
    listByScope: (scope: StoreSettingScope) => Promise<StoreSettingRecord[]>
    getByKey: (key: string) => Promise<StoreSettingRecord | null>
    upsertByKey: (input: {
      key: string
      scope: StoreSettingScope
      title: string
      description?: string
      enabled?: boolean
      sort_order?: number
      payload: string
    }) => Promise<StoreSettingRecord>
    updateById: (input: {
      id: string
      key: string
      scope: StoreSettingScope
      title: string
      description?: string
      enabled?: boolean
      sort_order?: number
      payload: string
    }) => Promise<StoreSettingRecord>
    deleteById: (id: string) => Promise<void>
  }
}

export async function ensureDefaultStoreSettings(container: MedusaContainer) {
  const service = await getStoreSettingsService(container)

  const defaults = [
    ...DEFAULT_CACHE_SETTINGS,
    ...DEFAULT_CMS_BLOCKS,
    DEFAULT_PAYMENT_SETTINGS,
    ...DEFAULT_SHIPPING_METHODS,
  ]

  for (const setting of defaults) {
    const existing = await service.getByKey(setting.key)

    if (existing) {
      continue
    }

    await service.upsertByKey({
      key: setting.key,
      scope: setting.scope,
      title: setting.title,
      description: setting.description,
      enabled: setting.enabled,
      sort_order: setting.sort_order,
      payload: serializeSettingPayload(setting.payload),
    })
  }
}

export function getEnabledStoreSettings<T>(settings: StoreSettingRecord[]) {
  return settings.filter((setting) => setting.enabled).map((setting) => toSettingResponse<T>(setting))
}

export function getCmsBlocksForPlacement(
  settings: StoreSettingRecord[],
  placement: string
) {
  return getEnabledStoreSettings<CmsBlockPayload>(settings)
    .filter((setting) => setting.payload.placement === placement)
    .sort((left, right) => left.sort_order - right.sort_order)
}

export async function syncShippingMethods(container: MedusaContainer) {
  const service = await getStoreSettingsService(container)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: {
      entity: string
      fields: string[]
    }) => Promise<{ data?: any[] }>
  }

  const shippingMethods = await service.listByScope(
    STORE_SETTING_SCOPES.SHIPPING
  )

  const enabledMethods = shippingMethods.filter((setting) => setting.enabled)

  if (!enabledMethods.length) {
    return []
  }

  const { data: existingShippingOptions = [] } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "service_zone_id",
      "shipping_profile_id",
      "provider_id",
      "type.code",
    ],
  })

  const existingByCode = new Map<string, any>()
  for (const option of existingShippingOptions) {
    const code = option?.type?.code || option?.name
    if (code) {
      existingByCode.set(String(code), option)
    }
  }

  const firstExistingShippingOption = existingShippingOptions[0]
  const resolvedServiceZoneId =
    firstExistingShippingOption?.service_zone_id || undefined
  const resolvedShippingProfileId =
    firstExistingShippingOption?.shipping_profile_id || undefined

  const updateInput: Array<{
    id: string
    name: string
    price_type: "flat"
    provider_id?: string
    shipping_profile_id?: string
    type: {
      label: string
      description: string
      code: string
    }
    prices: Array<{
      currency_code: string
      amount: number
      rules?: Array<{
        attribute: string
        operator: string
        value: number
      }>
    }>
  }> = []

  const createdInput: Array<{
    key: string
    input: {
      name: string
      price_type: "flat"
      provider_id: string
      service_zone_id?: string
      shipping_profile_id?: string
      type: {
        label: string
        description: string
        code: string
      }
      prices: Array<{
        currency_code: string
        amount: number
        rules?: Array<{
          attribute: string
          operator: string
          value: number
        }>
      }>
      rules: Array<{
        attribute: string
        value: string
        operator: string
      }>
    }
  }> = []

  for (const setting of enabledMethods) {
    const payload = parseSettingPayload<ShippingMethodPayload>(setting)
    const matchedOption =
      (payload.native_shipping_option_id &&
        existingShippingOptions.find(
          (option) => option.id === payload.native_shipping_option_id
        )) ||
      existingByCode.get(payload.shipping_type_code)

    const nextPayload = {
      ...payload,
      native_shipping_option_id: matchedOption?.id,
      service_zone_id:
        payload.service_zone_id ??
        matchedOption?.service_zone_id ??
        resolvedServiceZoneId,
      shipping_profile_id:
        payload.shipping_profile_id ??
        matchedOption?.shipping_profile_id ??
        resolvedShippingProfileId,
    }

    if (
      nextPayload.native_shipping_option_id &&
      (nextPayload.native_shipping_option_id !== payload.native_shipping_option_id ||
        nextPayload.service_zone_id !== payload.service_zone_id ||
        nextPayload.shipping_profile_id !== payload.shipping_profile_id)
    ) {
      await service.upsertByKey({
        key: setting.key,
        scope: setting.scope,
        title: setting.title,
        description: setting.description,
        enabled: setting.enabled,
        sort_order: setting.sort_order,
        payload: serializeSettingPayload(nextPayload),
      })
    }

    if (nextPayload.native_shipping_option_id) {
      // Only name/type/prices/profile are updated here. The option-level rules
      // (enabled_in_store, is_return) are set once at creation; re-sending them on
      // every update would create duplicate rules because upsertShippingOptions has
      // no ids to match against.
      updateInput.push({
        id: nextPayload.native_shipping_option_id,
        name: setting.title,
        price_type: "flat",
        provider_id: matchedOption?.provider_id || "manual_manual",
        shipping_profile_id: nextPayload.shipping_profile_id,
        type: {
          label: payload.shipping_type_label,
          description: payload.shipping_type_description,
          code: payload.shipping_type_code,
        },
        prices: buildShippingPrices(nextPayload),
      })
      continue
    }

    if (!nextPayload.service_zone_id || !nextPayload.shipping_profile_id) {
      throw new Error(
        `Missing shipping profile or service zone for ${setting.key}. Re-seed the demo data or save a shipping option with an existing backend shipping record.`
      )
    }

    createdInput.push({
      key: setting.key,
      input: {
        name: setting.title,
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: nextPayload.service_zone_id,
        shipping_profile_id: nextPayload.shipping_profile_id,
        type: {
          label: payload.shipping_type_label,
          description: payload.shipping_type_description,
          code: payload.shipping_type_code,
        },
        prices: buildShippingPrices(nextPayload),
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    })
  }

  if (updateInput.length) {
    await updateShippingOptionsWorkflow(container).run({
      input: updateInput,
    } as never)
  }

  if (createdInput.length) {
    const { result } = await createShippingOptionsWorkflow(container).run({
      input: createdInput.map((item) => item.input),
    } as never)

    const createdByKey = new Map(
      createdInput.map((item, index) => [item.key, result[index]])
    )

    for (const [key, created] of createdByKey) {
      const existing = await service.getByKey(key)

      if (!existing) {
        continue
      }

      const payload = parseSettingPayload<ShippingMethodPayload>(existing)

      await service.upsertByKey({
        key: existing.key,
        scope: existing.scope,
        title: existing.title,
        description: existing.description,
        enabled: existing.enabled,
        sort_order: existing.sort_order,
        payload: serializeSettingPayload({
          ...payload,
          native_shipping_option_id: created?.id ?? payload.native_shipping_option_id,
        }),
      })
    }
  }
}
