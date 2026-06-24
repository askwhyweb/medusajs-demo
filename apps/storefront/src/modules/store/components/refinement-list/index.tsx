"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import {
  FACET_PARAM_PREFIX,
  FACET_VALUE_SEPARATOR,
  type Facet,
} from "@lib/util/facets"
import FacetGroup from "./facet-group"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  availableFacets?: Facet[]
  selectedFacets?: Record<string, string[]>
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  availableFacets = [],
  selectedFacets = {},
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router]
  )

  const setQueryParams = useCallback(
    (name: string, value?: string) => {
      const params = new URLSearchParams(searchParams)

      if (name !== "page") {
        params.delete("page")
      }

      if (!value || value === "all") {
        params.delete(name)
      } else {
        params.set(name, value)
      }

      pushParams(params)
    },
    [pushParams, searchParams]
  )

  const toggleFacetValue = useCallback(
    (facetKey: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.delete("page")

      const current = (params.get(facetKey) ?? "")
        .split(FACET_VALUE_SEPARATOR)
        .map((entry) => entry.trim())
        .filter(Boolean)

      const nextValues = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]

      if (nextValues.length) {
        params.set(facetKey, nextValues.join(FACET_VALUE_SEPARATOR))
      } else {
        params.delete(facetKey)
      }

      pushParams(params)
    },
    [pushParams, searchParams]
  )

  const clearFacets = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete("page")
    for (const key of Array.from(params.keys())) {
      if (key.startsWith(FACET_PARAM_PREFIX)) {
        params.delete(key)
      }
    }
    pushParams(params)
  }, [pushParams, searchParams])

  const hasSelection = Object.values(selectedFacets).some(
    (values) => values.length > 0
  )

  return (
    <div className="flex small:flex-col gap-12 py-4 mb-8 small:px-0 pl-6 small:min-w-[250px] small:ml-[1.675rem]">
      <SortProducts
        sortBy={sortBy}
        setQueryParams={setQueryParams}
        data-testid={dataTestId}
      />

      {availableFacets.length > 0 && (
        <div className="flex small:flex-col gap-8 flex-wrap" data-testid="facets">
          <div className="flex items-center justify-between">
            <span className="txt-compact-small-plus text-ui-fg-base">
              Filters
            </span>
            {hasSelection && (
              <button
                type="button"
                onClick={clearFacets}
                className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="clear-filters"
              >
                Clear all
              </button>
            )}
          </div>
          {availableFacets.map((facet) => (
            <FacetGroup
              key={facet.key}
              facet={facet}
              selectedValues={selectedFacets[facet.key] ?? []}
              onToggle={toggleFacetValue}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RefinementList
