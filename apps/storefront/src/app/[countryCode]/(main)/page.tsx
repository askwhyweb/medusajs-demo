import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"
import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getCmsBlocks } from "@lib/data/settings"
import { Heading, Text } from "@modules/common/components/ui"

export const metadata: Metadata = {
  title: "MedusaJS Demo for Fivetech",
  description:
    "A local Medusa demo store with a seeded electronics catalog for Fivetech.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const [categories, productsResponse, cmsBlocks] = await Promise.all([
    listCategories({ limit: 4 }),
    listProducts({
      countryCode,
      queryParams: { limit: 8 },
    }),
    getCmsBlocks("homepage"),
  ])

  const {
    response: { products },
  } = productsResponse

  return (
    <>
      <Hero />
      {cmsBlocks.length ? (
        <section className="content-container py-10 space-y-6">
          {cmsBlocks.map((block) => (
            <div
              key={block.id}
              className="rounded-3xl border border-ui-border-base bg-ui-bg-base px-8 py-10 shadow-sm"
            >
              <div
                className="prose max-w-none prose-h2:text-3xl prose-p:text-base prose-p:text-ui-fg-subtle prose-h2:text-ui-fg-base"
                dangerouslySetInnerHTML={{ __html: block.payload.html }}
              />
            </div>
          ))}
        </section>
      ) : null}
      <section className="content-container py-12">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <Heading level="h2" className="text-2xl-semi">
              Shop by category
            </Heading>
            <Text className="text-base-regular text-ui-fg-subtle">
              Browse the demo catalog by the main electronics ranges.
            </Text>
          </div>
          <InteractiveLink href="/store">View all products</InteractiveLink>
        </div>
        <div className="grid gap-4 small:grid-cols-2 large:grid-cols-4">
          {categories?.map((category) => (
            <InteractiveLink
              key={category.id}
              href={`/categories/${category.handle}`}
            >
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-6 min-h-[140px] flex flex-col justify-between">
                <div>
                  <Text className="txt-small text-ui-fg-muted">Category</Text>
                  <Heading level="h3" className="text-xl-semi mt-2">
                    {category.name}
                  </Heading>
                </div>
                <Text className="text-sm text-ui-fg-subtle mt-6">
                  {(category.products?.length ?? 0).toString()} products available
                </Text>
              </div>
            </InteractiveLink>
          ))}
        </div>
      </section>
      <section className="content-container py-12">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <Heading level="h2" className="text-2xl-semi">
              Featured products
            </Heading>
            <Text className="text-base-regular text-ui-fg-subtle">
              A compact starter catalog with variants, inventory, and sale pricing.
            </Text>
          </div>
          <InteractiveLink href="/store">Explore the store</InteractiveLink>
        </div>
        <ul className="grid grid-cols-2 small:grid-cols-3 gap-x-6 gap-y-12">
          {products?.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} isFeatured />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
