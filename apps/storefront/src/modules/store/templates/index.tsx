import { Suspense } from "react"

import { type Facet, type SelectedFacets } from "@lib/util/facets"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  availableFacets = [],
  selectedFacets = {},
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  availableFacets?: Facet[]
  selectedFacets?: SelectedFacets
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        availableFacets={availableFacets}
        selectedFacets={selectedFacets}
      />
      <div className="w-full">
        <div className="mb-8 text-2xl-semi">
          <h1 data-testid="store-page-title">All products</h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            facets={selectedFacets}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
