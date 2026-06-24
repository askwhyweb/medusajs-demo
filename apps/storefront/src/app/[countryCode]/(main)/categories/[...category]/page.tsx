import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { getProductFacets } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import { parseSelectedFacets } from "@lib/util/facets"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    {
      sortBy?: SortOptions
      page?: string
    } & Record<string, string | string[] | undefined>
  >
}

export async function generateStaticParams() {
  const product_categories = await listCategories()

  if (!product_categories) {
    return []
  }

  const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
    regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
  )

  const categoryHandles = product_categories.map(
    (category: HttpTypes.StoreProductCategory) => category.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string | undefined) =>
      categoryHandles.map((handle: string) => ({
        countryCode,
        category: [handle],
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)

    const title = productCategory.name + " | MedusaJS Demo for Fivetech"

    const description = productCategory.description ?? `${title} category.`

    return {
      title: `${title} | MedusaJS Demo for Fivetech`,
      description,
      alternates: {
        canonical: `${params.category.join("/")}`,
      },
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  const selectedFacets = parseSelectedFacets(searchParams)
  const availableFacets = await getProductFacets({
    countryCode: params.countryCode,
    queryParams: { category_id: [productCategory.id] } as never,
  })

  return (
    <CategoryTemplate
      category={productCategory}
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      availableFacets={availableFacets}
      selectedFacets={selectedFacets}
    />
  )
}
