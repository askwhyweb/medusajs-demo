"use client"

import { Text } from "@modules/common/components/ui"
import { slugifyFacet, type Facet } from "@lib/util/facets"

type FacetGroupProps = {
  facet: Facet
  selectedValues: string[]
  onToggle: (facetKey: string, value: string) => void
}

const FacetGroup = ({ facet, selectedValues, onToggle }: FacetGroupProps) => {
  const facetSlug = slugifyFacet(facet.title)

  return (
    <div
      className="flex flex-col gap-y-3"
      data-testid={`facet-${facetSlug}`}
    >
      <Text className="txt-compact-small-plus text-ui-fg-muted">
        {facet.title}
      </Text>
      <div className="flex flex-col gap-y-2">
        {facet.values.map((value) => {
          const checked = selectedValues.includes(value)
          const valueSlug = slugifyFacet(value)
          const id = `facet-${facetSlug}-${valueSlug}`

          return (
            <label
              key={value}
              htmlFor={id}
              className="flex items-center gap-x-2 cursor-pointer text-ui-fg-subtle hover:text-ui-fg-base"
            >
              <input
                id={id}
                type="checkbox"
                className="h-4 w-4 rounded border-ui-border-base accent-ui-fg-base cursor-pointer"
                checked={checked}
                onChange={() => onToggle(facet.key, value)}
                data-testid={`facet-option-${facetSlug}-${valueSlug}`}
                data-active={checked}
              />
              <span className="txt-compact-small">{value}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default FacetGroup
