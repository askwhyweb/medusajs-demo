import { Metadata } from "next"

import { getProductFacets } from "@lib/data/products"
import { parseSelectedFacets } from "@lib/util/facets"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Store",
  description: "Explore all of our products.",
}

type Params = {
  searchParams: Promise<
    {
      sortBy?: SortOptions
      page?: string
    } & Record<string, string | string[] | undefined>
  >
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams

  const selectedFacets = parseSelectedFacets(searchParams)
  const availableFacets = await getProductFacets({
    countryCode: params.countryCode,
  })

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      availableFacets={availableFacets}
      selectedFacets={selectedFacets}
    />
  )
}
