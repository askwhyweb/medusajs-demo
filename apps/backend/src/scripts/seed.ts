import fs from "node:fs"
import path from "node:path"

import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  DEFAULT_CACHE_SETTINGS,
  DEFAULT_CMS_BLOCKS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SHIPPING_METHODS,
  getStoreSettingsService,
  serializeSettingPayload,
  STORE_SETTING_SCOPES,
} from "../lib/store-settings"

const CURRENCY_CODE = "gbp"
const DEFAULT_REGION_COUNTRY = "gb"
const DEFAULT_REGION_NAME = "United Kingdom"

const CATEGORY_NAME_BY_KEY: Record<string, string> = {
  phones: "Phones and Accessories",
  laptops: "Laptops and Computers",
  audio: "Audio and Wearables",
  gaming: "Gaming Gear",
}

/**
 * Catalog model for faceted filtering.
 *
 * Each product is built with two kinds of options:
 *  - Variant-defining options (`colors` + optional `capacity`) create the real
 *    variants a shopper picks from.
 *  - Spec options (`specs`) are single-valued per product (e.g. this product's
 *    Brand/RAM/CPU/GPU) but vary across the catalog, so they become storefront
 *    filter facets without exploding the variant count.
 *
 * Combined with the synthetic "Price" facet on the storefront, every category
 * exposes at least 10 filter dimensions (brand, color, storage, RAM, CPU/GPU,
 * screen size, connectivity, price, etc.).
 */
type CategoryConfig = {
  key: string
  series: string
  handlePrefix: string
  count: number
  basePrice: number
  priceStep: number
  colors: string[]
  capacity?: { title: string; values: string[]; premium: number }
  specs: Record<string, string[]>
  highlight: string
}

const CATALOG: CategoryConfig[] = [
  {
    key: "phones",
    series: "Phone",
    handlePrefix: "phone",
    count: 6,
    basePrice: 64900,
    priceStep: 12000,
    colors: ["Midnight Black", "Glacier Silver", "Ocean Blue"],
    capacity: { title: "Storage", values: ["128GB", "256GB"], premium: 8000 },
    specs: {
      Brand: ["Aurora", "Nimbus", "Zenith"],
      RAM: ["8GB", "12GB"],
      CPU: ["Aurora X1", "Nimbus N5", "Zenith Z9"],
      "Screen Size": ["6.1 inch", "6.7 inch"],
      "Refresh Rate": ["90Hz", "120Hz"],
      Connectivity: ["5G", "4G LTE"],
      Condition: ["New", "Refurbished"],
    },
    highlight:
      "everyday performance, a bright high-refresh display, and dependable battery life",
  },
  {
    key: "laptops",
    series: "Laptop",
    handlePrefix: "laptop",
    count: 6,
    basePrice: 139900,
    priceStep: 22000,
    colors: ["Space Gray", "Silver"],
    capacity: {
      title: "Storage",
      values: ["512GB SSD", "1TB SSD"],
      premium: 18000,
    },
    specs: {
      Brand: ["Vertex", "Quanta", "Lumen"],
      RAM: ["16GB", "32GB"],
      CPU: ["Core i5", "Core i7", "Ryzen 7"],
      GPU: ["Integrated", "RTX 4050", "RTX 4060"],
      "Screen Size": ["14 inch", "16 inch"],
      "Operating System": ["Windows 11", "Linux"],
      Condition: ["New", "Refurbished"],
    },
    highlight:
      "a portable metal chassis, strong multi-core performance, and all-day battery",
  },
  {
    key: "audio",
    series: "Audio",
    handlePrefix: "audio",
    count: 5,
    basePrice: 14900,
    priceStep: 6000,
    colors: ["Black", "White"],
    specs: {
      Brand: ["Pulse", "Echo", "Sonic"],
      "Form Factor": ["Over-Ear", "In-Ear", "Speaker"],
      Connectivity: ["Bluetooth 5.3", "Wired", "Wi-Fi"],
      "Noise Cancelling": ["Active", "Passive", "None"],
      "Battery Life": ["20 hours", "30 hours", "40 hours"],
      "Water Resistance": ["IPX4", "IPX7"],
      Microphone: ["Built-in", "None"],
      Condition: ["New", "Refurbished"],
    },
    highlight:
      "clear sound, comfortable wear, and flexible wireless or wired listening",
  },
  {
    key: "gaming",
    series: "Gaming",
    handlePrefix: "gaming",
    count: 5,
    basePrice: 24900,
    priceStep: 9000,
    colors: ["Black", "RGB White"],
    specs: {
      Brand: ["Nova", "Vortex", "Apex"],
      "Device Type": ["Keyboard", "Mouse", "Headset", "Controller"],
      Connectivity: ["Wireless", "Wired"],
      "RGB Lighting": ["Yes", "No"],
      "Switch Type": ["Mechanical", "Membrane"],
      "Polling Rate": ["1000Hz", "8000Hz"],
      Platform: ["PC", "Console", "PC & Console"],
      Condition: ["New", "Refurbished"],
    },
    highlight:
      "low-latency response, bold RGB styling, and competitive-grade precision",
  },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildImageUrl(title: string) {
  return `https://placehold.co/1200x1200/0f172a/e2e8f0?text=${encodeURIComponent(title)}`
}

function cartesian(groups: { title: string; values: string[] }[]) {
  return groups.reduce<Record<string, string>[]>(
    (acc, group) =>
      acc.flatMap((combo) =>
        group.values.map((value) => ({ ...combo, [group.title]: value }))
      ),
    [{}]
  )
}

function buildProductDescription(
  config: CategoryConfig,
  title: string,
  brand: string,
  specMap: Record<string, string>
) {
  const categoryName = CATEGORY_NAME_BY_KEY[config.key]
  const specLine = Object.entries(specMap)
    .filter(([key]) => key !== "Brand")
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ")

  return [
    `${title} is a ${brand} entry in the ${categoryName.toLowerCase()} range of the Medusa demo store, built to read like a real retail listing rather than placeholder copy. It is tuned for ${config.highlight}, so shoppers get a clear, credible reason to compare it against the other models in the catalog.`,
    `Key configuration — ${specLine}. These attributes are also exposed as storefront filters, which makes the product useful for evaluating faceted browsing: you can narrow the catalog by brand, colour, capacity, and the rest of the specifications and confirm the same record renders consistently across the homepage, category pages, and the product detail view.`,
    `Each model ships with multiple variants so option selection, price differences, and inventory all behave like a production catalog. The copy stays professional and specific, leaving enough descriptive room for layout and responsive-design checks while keeping the demo focused on the behaviours the team actually needs to verify.`,
  ].join("\n\n")
}

type CatalogEntry = {
  product: Record<string, unknown>
  salePrice: { amount: number; currency_code: string }
}

function buildCategoryProducts(
  config: CategoryConfig,
  categoryId: string,
  shippingProfileId: string,
  salesChannelId: string
): CatalogEntry[] {
  const specTitles = Object.keys(config.specs)
  const entries: CatalogEntry[] = []

  for (let index = 0; index < config.count; index++) {
    const specMap: Record<string, string> = {}
    specTitles.forEach((specTitle, specIndex) => {
      const pool = config.specs[specTitle]
      // Offset each spec by its position so the spec combinations vary between
      // products instead of advancing in lockstep.
      specMap[specTitle] = pool[(index + specIndex) % pool.length]
    })

    const brand = specMap.Brand
    const modelNumber = 100 + index
    const title = `${brand} ${config.series} ${modelNumber}`
    const handle = `${config.handlePrefix}-${modelNumber}`
    const basePrice = config.basePrice + config.priceStep * index

    const variantGroups: { title: string; values: string[] }[] = [
      { title: "Color", values: config.colors },
    ]
    if (config.capacity) {
      variantGroups.push({
        title: config.capacity.title,
        values: config.capacity.values,
      })
    }

    // Only genuinely variant-defining attributes (Color, Storage) are product
    // options/variants — these are what a shopper selects on the product page. The
    // remaining specs are stored as structured metadata so the PDP stays clean while
    // every spec is still exposed as a storefront filter facet (see lib/util/facets).
    const options = variantGroups.map((group) => ({
      title: group.title,
      values: group.values,
    }))

    const variants = cartesian(variantGroups).map((combo, variantIndex) => {
      const capacityValue = config.capacity
        ? combo[config.capacity.title]
        : undefined
      const capacityPremium =
        config.capacity && capacityValue
          ? config.capacity.premium *
            config.capacity.values.indexOf(capacityValue)
          : 0
      const amount = basePrice + capacityPremium
      const variantTitle = variantGroups
        .map((group) => combo[group.title])
        .join(" / ")

      return {
        title: variantTitle,
        sku: `${config.key.toUpperCase()}-${modelNumber}-${variantIndex + 1}`,
        options: { ...combo },
        prices: [
          {
            amount,
            currency_code: CURRENCY_CODE,
          },
        ],
      }
    })

    entries.push({
      product: {
        title,
        category_ids: [categoryId],
        description: buildProductDescription(config, title, brand, specMap),
        handle,
        weight: 600,
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfileId,
        images: [{ url: buildImageUrl(title) }],
        options,
        variants,
        sales_channels: [{ id: salesChannelId }],
        metadata: {
          demo_family: config.key,
          demo_brand: brand,
          // Filterable spec facets, keyed by their display title.
          specs: specMap,
        },
      },
      salePrice: {
        amount: Math.round(variants[0].prices[0].amount * 0.88),
        currency_code: CURRENCY_CODE,
      },
    })
  }

  return entries
}

async function writeStorefrontEnv({
  runtimeDir,
  publishableKey,
}: {
  runtimeDir: string
  publishableKey: string
}) {
  const envPath = path.join(runtimeDir, "storefront.env")
  const lines = [
    `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${publishableKey}`,
    `NEXT_PUBLIC_MEDUSA_BACKEND_URL=${
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
    }`,
    `MEDUSA_BACKEND_URL=${
      process.env.MEDUSA_INTERNAL_BACKEND_URL ?? "http://backend:9000"
    }`,
    `NEXT_PUBLIC_DEFAULT_REGION=${process.env.NEXT_PUBLIC_DEFAULT_REGION ?? DEFAULT_REGION_COUNTRY}`,
    `NEXT_PUBLIC_BASE_URL=${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8000"}`,
  ]

  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8")
}

async function seedStoreSettings({
  container,
  query,
  shippingProfileId,
  serviceZoneId,
  regionId,
  shippingOptions,
}: {
  container: MedusaContainer
  query: any
  shippingProfileId?: string
  serviceZoneId?: string
  regionId?: string
  shippingOptions?: Array<{
    id?: string
    name?: string
    service_zone_id?: string
    shipping_profile_id?: string
    type?: { code?: string }
  }>
}) {
  const service = await getStoreSettingsService(container)
  let resolvedServiceZoneId = serviceZoneId
  let resolvedShippingProfileId = shippingProfileId

  for (const preset of DEFAULT_CACHE_SETTINGS) {
    await service.upsertByKey({
      key: preset.key,
      scope: STORE_SETTING_SCOPES.CACHE,
      title: preset.title,
      description: preset.description,
      enabled: preset.enabled,
      sort_order: preset.sort_order,
      payload: serializeSettingPayload(preset.payload),
    })
  }

  for (const block of DEFAULT_CMS_BLOCKS) {
    await service.upsertByKey({
      key: block.key,
      scope: STORE_SETTING_SCOPES.CMS,
      title: block.title,
      description: block.description,
      enabled: block.enabled,
      sort_order: block.sort_order,
      payload: serializeSettingPayload(block.payload),
    })
  }

  await service.upsertByKey({
    key: DEFAULT_PAYMENT_SETTINGS.key,
    scope: STORE_SETTING_SCOPES.PAYMENT,
    title: DEFAULT_PAYMENT_SETTINGS.title,
    description: DEFAULT_PAYMENT_SETTINGS.description,
    enabled: DEFAULT_PAYMENT_SETTINGS.enabled,
    sort_order: DEFAULT_PAYMENT_SETTINGS.sort_order,
    payload: serializeSettingPayload(DEFAULT_PAYMENT_SETTINGS.payload),
  })

  const existingOptions =
    shippingOptions ??
    (((await query.graph({
      entity: "shipping_option",
      fields: [
        "id",
        "name",
        "service_zone_id",
        "shipping_profile_id",
        "type.code",
      ],
    })) as { data?: any[] }).data ?? [])

  const shippingOptionByCode = new Map<string, any>()
  for (const option of existingOptions) {
    const code = option?.type?.code || option?.name
    if (code) {
      shippingOptionByCode.set(String(code), option)
    }
  }

  const firstExistingShippingOption = existingOptions[0]
  resolvedServiceZoneId ||= firstExistingShippingOption?.service_zone_id
  resolvedShippingProfileId ||= firstExistingShippingOption?.shipping_profile_id

  const missingSeeds: typeof DEFAULT_SHIPPING_METHODS = []

  for (const seed of DEFAULT_SHIPPING_METHODS) {
    const payload = seed.payload as {
      code: string
      shipping_type_code: string
      shipping_type_label: string
      shipping_type_description: string
      price: number
      service_zone_id?: string
      shipping_profile_id?: string
      native_shipping_option_id?: string
    }
    const existing = shippingOptionByCode.get(payload.shipping_type_code)
    const nativeShippingOptionId = existing?.id
    const serviceZone = existing?.service_zone_id || resolvedServiceZoneId
    const shippingProfile = existing?.shipping_profile_id || resolvedShippingProfileId

    resolvedServiceZoneId ||= serviceZone
    resolvedShippingProfileId ||= shippingProfile

    if (!nativeShippingOptionId) {
      missingSeeds.push({
        ...seed,
        payload: {
          ...payload,
          service_zone_id: serviceZone,
          shipping_profile_id: shippingProfile,
        },
      })
      continue
    }

    await service.upsertByKey({
      key: seed.key,
      scope: STORE_SETTING_SCOPES.SHIPPING,
      title: seed.title,
      description: seed.description,
      enabled: seed.enabled,
      sort_order: seed.sort_order,
      payload: serializeSettingPayload({
        ...payload,
        native_shipping_option_id: nativeShippingOptionId,
        service_zone_id: serviceZone,
        shipping_profile_id: shippingProfile,
      }),
    })
  }

  if (missingSeeds.length) {
    if (!resolvedServiceZoneId || !resolvedShippingProfileId) {
      throw new Error(
        "Missing shipping profile or service zone details when seeding shipping methods"
      )
    }

    const shippingSeedInputs = missingSeeds.map((seed) => {
      const payload = seed.payload as {
        code: string
        shipping_type_code: string
        shipping_type_label: string
        shipping_type_description: string
        price: number
        service_zone_id?: string
        shipping_profile_id?: string
        native_shipping_option_id?: string
      }

      return {
        name: seed.title,
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: payload.service_zone_id || resolvedServiceZoneId,
        shipping_profile_id:
          payload.shipping_profile_id || resolvedShippingProfileId,
        type: {
          label: payload.shipping_type_label,
          description: payload.shipping_type_description,
          code: payload.shipping_type_code,
        },
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: payload.price,
          },
          ...(regionId
            ? [
                {
                  region_id: regionId,
                  amount: payload.price,
                },
              ]
            : []),
        ],
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
      }
    })

    const { result } = await createShippingOptionsWorkflow(container).run({
      input: shippingSeedInputs,
    } as never)

    for (const [index, seed] of missingSeeds.entries()) {
      const created = result[index]
      const payload = seed.payload as {
        code: string
        shipping_type_code: string
        shipping_type_label: string
        shipping_type_description: string
        price: number
        service_zone_id?: string
        shipping_profile_id?: string
        native_shipping_option_id?: string
      }

      await service.upsertByKey({
        key: seed.key,
        scope: STORE_SETTING_SCOPES.SHIPPING,
        title: seed.title,
        description: seed.description,
        enabled: seed.enabled,
        sort_order: seed.sort_order,
        payload: serializeSettingPayload({
          ...payload,
          native_shipping_option_id: created?.id,
          service_zone_id: payload.service_zone_id || resolvedServiceZoneId,
          shipping_profile_id:
            payload.shipping_profile_id || resolvedShippingProfileId,
        }),
      })
    }
  }
}

export default async function seed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  const runtimeDir = process.env.RUNTIME_DIR ?? "/runtime"
  const runtimeEnvPath = path.join(runtimeDir, "storefront.env")
  const { data: existingProducts = [] } = await query.graph({
    entity: "product",
    fields: ["id"],
  })

  if (existingProducts.length > 0 && fs.existsSync(runtimeEnvPath)) {
    logger.info("Demo catalog already exists. Seeding settings only.")
    await seedStoreSettings({
      container,
      query,
    })
    return
  }

  if (existingProducts.length > 0) {
    logger.info("Demo catalog exists but storefront env is missing. Refreshing access token.")
    const { data: salesChannels = [] } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
    })

    const salesChannel = salesChannels[0]
    if (!salesChannel) {
      throw new Error("Missing sales channel for storefront credentials")
    }

    const {
      result: [publishableApiKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Demo Storefront Publishable Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [salesChannel.id],
      },
    })

    await writeStorefrontEnv({
      runtimeDir,
      publishableKey: publishableApiKey.token,
    })

    logger.info(
      `Refreshed storefront env written to ${runtimeEnvPath}.`
    )
    return
  }

  logger.info("Seeding store data...")

  // Reuse Medusa's bootstrap default sales channel instead of creating a duplicate.
  const { data: existingSalesChannels = [] } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  let defaultSalesChannel: { id: string } | undefined = existingSalesChannels[0]
  if (!defaultSalesChannel) {
    const {
      result: [createdSalesChannel],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
            description: "Created for the local Medusa demo store.",
          },
        ],
      },
    })
    defaultSalesChannel = createdSalesChannel
  }

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Demo Storefront Publishable Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  })

  // Medusa's bootstrap creates a default store with GBP as the default currency, and
  // the Admin dashboard operates on that single store. Update it in place (rather
  // than creating a second store) so the demo — and anything a merchant creates in
  // Admin — uses GBP as the one and only currency.
  const { data: existingStores = [] } = await query.graph({
    entity: "store",
    fields: ["id", "name"],
  })

  let store
  const storeUpdate = {
    name: "MedusaJS Demo for Fivetech",
    supported_currencies: [
      {
        currency_code: CURRENCY_CODE,
        is_default: true,
      },
    ],
    default_sales_channel_id: defaultSalesChannel.id,
  }

  if (existingStores[0]) {
    const {
      result: [updatedStore],
    } = await updateStoresWorkflow(container).run({
      input: {
        selector: { id: existingStores[0].id },
        update: storeUpdate,
      },
    })
    store = updatedStore
  } else {
    const {
      result: [createdStore],
    } = await createStoresWorkflow(container).run({
      input: { stores: [storeUpdate] },
    })
    store = createdStore
  }

  logger.info("Seeding region data...")
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: DEFAULT_REGION_NAME,
          currency_code: CURRENCY_CODE,
          countries: [DEFAULT_REGION_COUNTRY],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })

  const region = regionResult[0]
  if (!region) {
    throw new Error("Missing demo region")
  }

  logger.info("Seeding tax regions...")
  await createTaxRegionsWorkflow(container).run({
    input: [DEFAULT_REGION_COUNTRY].map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  })

  logger.info("Seeding stock location data...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "London Warehouse",
          address: {
            city: "London",
            country_code: "GB",
            address_1: "Demo Warehouse",
          },
        },
      ],
    },
  })

  const stockLocation = stockLocationResult[0]
  if (!stockLocation) {
    throw new Error("Missing demo stock location")
  }

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  })

  logger.info("Seeding fulfillment data...")
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  const shippingProfile = shippingProfileResult[0]
  if (!shippingProfile) {
    throw new Error("Missing default shipping profile")
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "London Warehouse delivery",
    type: "shipping",
    service_zones: [
      {
        name: DEFAULT_REGION_NAME,
        geo_zones: [
          {
            country_code: DEFAULT_REGION_COUNTRY,
            type: "country",
          },
        ],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  const { result: shippingOptionsResult } = await createShippingOptionsWorkflow(
    container
  ).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivered in 3-5 business days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: 1200,
          },
          {
            region_id: region.id,
            amount: 1200,
          },
        ],
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
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Delivered in 1-2 business days.",
          code: "express",
        },
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: 2500,
          },
          {
            region_id: region.id,
            amount: 2500,
          },
        ],
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
      {
        name: "Priority Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Priority",
          description: "Delivered next business day where available.",
          code: "priority",
        },
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: 3900,
          },
          {
            region_id: region.id,
            amount: 3900,
          },
        ],
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
    ],
  })

  const [standardShipping, expressShipping, priorityShipping] =
    shippingOptionsResult

  const storeSettingsService = await getStoreSettingsService(container)

  for (const preset of DEFAULT_CACHE_SETTINGS) {
    await storeSettingsService.upsertByKey({
      key: preset.key,
      scope: STORE_SETTING_SCOPES.CACHE,
      title: preset.title,
      description: preset.description,
      enabled: preset.enabled,
      sort_order: preset.sort_order,
      payload: serializeSettingPayload(preset.payload),
    })
  }

  for (const block of DEFAULT_CMS_BLOCKS) {
    await storeSettingsService.upsertByKey({
      key: block.key,
      scope: STORE_SETTING_SCOPES.CMS,
      title: block.title,
      description: block.description,
      enabled: block.enabled,
      sort_order: block.sort_order,
      payload: serializeSettingPayload(block.payload),
    })
  }

  await storeSettingsService.upsertByKey({
    key: DEFAULT_PAYMENT_SETTINGS.key,
    scope: STORE_SETTING_SCOPES.PAYMENT,
    title: DEFAULT_PAYMENT_SETTINGS.title,
    description: DEFAULT_PAYMENT_SETTINGS.description,
    enabled: DEFAULT_PAYMENT_SETTINGS.enabled,
    sort_order: DEFAULT_PAYMENT_SETTINGS.sort_order,
    payload: serializeSettingPayload(DEFAULT_PAYMENT_SETTINGS.payload),
  })

  const shippingSeeds = [
    {
      seed: DEFAULT_SHIPPING_METHODS[0],
      nativeShippingOptionId: standardShipping?.id,
    },
    {
      seed: DEFAULT_SHIPPING_METHODS[1],
      nativeShippingOptionId: expressShipping?.id,
    },
    {
      seed: DEFAULT_SHIPPING_METHODS[2],
      nativeShippingOptionId: priorityShipping?.id,
    },
  ]

  for (const { seed, nativeShippingOptionId } of shippingSeeds) {
    await storeSettingsService.upsertByKey({
      key: seed.key,
      scope: STORE_SETTING_SCOPES.SHIPPING,
      title: seed.title,
      description: seed.description,
      enabled: seed.enabled,
      sort_order: seed.sort_order,
      payload: serializeSettingPayload({
        ...(seed.payload as Record<string, unknown>),
        native_shipping_option_id: nativeShippingOptionId,
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
      }),
    })
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  })

  logger.info("Seeding product data...")

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: CATALOG.map((config) => ({
        name: CATEGORY_NAME_BY_KEY[config.key],
        is_active: true,
      })),
    },
  })

  const categoryMap = new Map(
    categoryResult.map((category) => [category.name, category.id])
  )

  const builtProducts: CatalogEntry[] = []

  for (const config of CATALOG) {
    const categoryId = categoryMap.get(CATEGORY_NAME_BY_KEY[config.key])

    if (!categoryId) {
      throw new Error(`Missing category for ${config.key}`)
    }

    builtProducts.push(
      ...buildCategoryProducts(
        config,
        categoryId,
        shippingProfile.id,
        defaultSalesChannel.id
      )
    )
  }

  const createdProducts: any[] = []
  const batchSize = 20

  for (let index = 0; index < builtProducts.length; index += batchSize) {
    const batch = builtProducts.slice(index, index + batchSize)
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: batch.map((item) => item.product) as never,
      },
    })

    createdProducts.push(...result)
  }

  const priceListPrices = createdProducts.map((product, index) => {
    const source = builtProducts[index]
    const firstVariant = product.variants?.[0]

    if (!firstVariant?.id) {
      throw new Error(`Missing first variant for ${product.title}`)
    }

    return {
      amount: source.salePrice.amount,
      currency_code: source.salePrice.currency_code,
      variant_id: firstVariant.id,
    }
  })

  await createPriceListsWorkflow(container).run({
    input: {
      price_lists_data: [
        {
          title: "Electronics Launch Sale",
          description:
            "Demo sale prices for the local electronics catalog. The list is seeded for storefront evaluation.",
          status: "active",
          prices: priceListPrices,
        },
      ],
    },
  })

  logger.info("Seeding inventory levels.")

  const { data: inventoryItems = [] } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 150,
        inventory_item_id: item.id,
      })),
    },
  })

  await writeStorefrontEnv({
    runtimeDir,
    publishableKey: publishableApiKey.token,
  })

  logger.info(
    `Seed complete for store ${store.id}. Storefront env written to ${runtimeEnvPath}`
  )
}
