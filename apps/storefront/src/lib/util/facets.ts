import { HttpTypes } from "@medusajs/types"

/**
 * Faceted filtering for the storefront product lists.
 *
 * Facets are derived from product options (Brand, Color, RAM, CPU, GPU, Storage,
 * Screen Size, etc.) plus a synthetic "Price" facet computed from variant prices.
 * Because Medusa's Store API can't AND across multiple option values, filtering is
 * applied in-memory against the already-fetched product list (the store/category
 * templates fetch up to 100 products and paginate locally).
 *
 * URL contract: each facet is a query param `f_<slug>` whose value is a
 * pipe-separated list of selected raw values, e.g. `?f_brand=Aurora&f_color=Ocean Blue|Midnight Black`.
 * Pipe (not comma) is used because some facet values contain commas (e.g. the price
 * bucket label "Under ₨25,000").
 */

export const FACET_PARAM_PREFIX = "f_"
export const FACET_VALUE_SEPARATOR = "|"
export const PRICE_FACET_TITLE = "Price"

export type Facet = {
  title: string
  key: string
  values: string[]
  isPrice?: boolean
}

export type SelectedFacets = Record<string, string[]>

export type PriceBucket = {
  label: string
  min: number
  max: number
}

// PKR price buckets sized to the demo electronics catalog.
export const PRICE_BUCKETS: PriceBucket[] = [
  { label: "Under ₨25,000", min: 0, max: 25_000 },
  { label: "₨25,000 – ₨75,000", min: 25_000, max: 75_000 },
  { label: "₨75,000 – ₨150,000", min: 75_000, max: 150_000 },
  { label: "Over ₨150,000", min: 150_000, max: Number.POSITIVE_INFINITY },
]

export function slugifyFacet(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function facetKey(title: string): string {
  return `${FACET_PARAM_PREFIX}${slugifyFacet(title)}`
}

function addValue(map: Map<string, Set<string>>, title: string, value: string) {
  const cleanTitle = title.trim()
  const cleanValue = value.trim()
  if (!cleanTitle || !cleanValue) {
    return
  }
  const values = map.get(cleanTitle) ?? new Set<string>()
  values.add(cleanValue)
  map.set(cleanTitle, values)
}

/**
 * Collects a product's facet values keyed by facet title. Facets come from two
 * sources: variant-defining product options (Color, Storage) and the descriptive
 * `metadata.specs` object seeded for each product (Brand, RAM, CPU, GPU, etc.).
 */
function getProductFacetValues(
  product: HttpTypes.StoreProduct
): Map<string, Set<string>> {
  const byTitle = new Map<string, Set<string>>()

  for (const option of product.options ?? []) {
    const title = option.title?.trim()
    if (!title) {
      continue
    }
    for (const optionValue of option.values ?? []) {
      if (optionValue.value) {
        addValue(byTitle, title, optionValue.value)
      }
    }
  }

  const specs = (product.metadata as { specs?: Record<string, unknown> } | null)
    ?.specs
  if (specs && typeof specs === "object") {
    for (const [title, value] of Object.entries(specs)) {
      if (typeof value === "string") {
        addValue(byTitle, title, value)
      }
    }
  }

  return byTitle
}

export function getProductMinPrice(
  product: HttpTypes.StoreProduct
): number | null {
  const amounts = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")

  if (!amounts.length) {
    return null
  }

  return Math.min(...amounts)
}

function priceMatchesBuckets(price: number | null, labels: string[]): boolean {
  if (price === null) {
    return false
  }

  return labels.some((label) => {
    const bucket = PRICE_BUCKETS.find((candidate) => candidate.label === label)
    if (!bucket) {
      return false
    }
    return price >= bucket.min && price < bucket.max
  })
}

/**
 * Builds the facet list available for a set of products. Option facets are sorted
 * by title and only kept when they have at least two distinct values (a facet with a
 * single value can't filter anything down). The Price facet is always appended.
 */
export function extractFacets(products: HttpTypes.StoreProduct[]): Facet[] {
  const valuesByTitle = new Map<string, Set<string>>()

  for (const product of products) {
    Array.from(getProductFacetValues(product).entries()).forEach(
      ([title, values]) => {
        const existing = valuesByTitle.get(title) ?? new Set<string>()
        Array.from(values).forEach((value) => existing.add(value))
        valuesByTitle.set(title, existing)
      }
    )
  }

  const optionFacets: Facet[] = Array.from(valuesByTitle.entries())
    .filter(([, values]) => values.size > 1)
    .map(([title, values]) => ({
      title,
      key: facetKey(title),
      values: Array.from(values).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title))

  const usedPriceBuckets = PRICE_BUCKETS.filter((bucket) =>
    products.some((product) => {
      const price = getProductMinPrice(product)
      return price !== null && price >= bucket.min && price < bucket.max
    })
  )

  const priceFacet: Facet[] =
    usedPriceBuckets.length > 1
      ? [
          {
            title: PRICE_FACET_TITLE,
            key: facetKey(PRICE_FACET_TITLE),
            values: usedPriceBuckets.map((bucket) => bucket.label),
            isPrice: true,
          },
        ]
      : []

  return [...optionFacets, ...priceFacet]
}

/**
 * Reads the selected facet values from URL search params, keyed by facet key.
 */
export function parseSelectedFacets(
  searchParams: Record<string, string | string[] | undefined>
): SelectedFacets {
  const selected: SelectedFacets = {}

  for (const [key, raw] of Object.entries(searchParams)) {
    if (!key.startsWith(FACET_PARAM_PREFIX) || !raw) {
      continue
    }

    const values = (Array.isArray(raw) ? raw : [raw])
      .flatMap((entry) => entry.split(FACET_VALUE_SEPARATOR))
      .map((value) => value.trim())
      .filter(Boolean)

    if (values.length) {
      selected[key] = values
    }
  }

  return selected
}

export function hasSelectedFacets(selected: SelectedFacets): boolean {
  return Object.keys(selected).length > 0
}

/**
 * Returns true when a product satisfies every selected facet (AND across facets,
 * OR within a facet's values).
 */
export function productMatchesFacets(
  product: HttpTypes.StoreProduct,
  selected: SelectedFacets
): boolean {
  if (!hasSelectedFacets(selected)) {
    return true
  }

  const optionValues = getProductFacetValues(product)
  const priceKey = facetKey(PRICE_FACET_TITLE)

  // Build a key -> title lookup from the product's own options so we can match
  // facet keys (slugs) back to option titles regardless of casing/spacing.
  const titleByKey = new Map<string, string>()
  Array.from(optionValues.keys()).forEach((title) => {
    titleByKey.set(facetKey(title), title)
  })

  for (const [key, selectedValues] of Object.entries(selected)) {
    if (key === priceKey) {
      if (!priceMatchesBuckets(getProductMinPrice(product), selectedValues)) {
        return false
      }
      continue
    }

    const title = titleByKey.get(key)
    const productValues = title ? optionValues.get(title) : undefined

    if (!productValues) {
      return false
    }

    const matches = selectedValues.some((value) => productValues.has(value))
    if (!matches) {
      return false
    }
  }

  return true
}

export function filterProductsByFacets(
  products: HttpTypes.StoreProduct[],
  selected: SelectedFacets
): HttpTypes.StoreProduct[] {
  if (!hasSelectedFacets(selected)) {
    return products
  }

  return products.filter((product) => productMatchesFacets(product, selected))
}
