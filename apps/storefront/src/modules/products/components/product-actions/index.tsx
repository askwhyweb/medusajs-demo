"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlVariantId = searchParams.get("v_id")

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const urlVariant = useMemo(() => {
    if (!urlVariantId || !product.variants?.length) {
      return undefined
    }

    return product.variants.find((variant) => {
      return variant.id === urlVariantId || variant.sku === urlVariantId
    })
  }, [product.variants, urlVariantId])
  const activeVariant = selectedVariant ?? urlVariant

  const selectedPrice = useMemo(() => {
    const price = getProductPrice({
      product,
      variantId: activeVariant?.id,
    })

    return activeVariant ? price.variantPrice : price.cheapestPrice
  }, [product, activeVariant])

  const hasPrice = !!selectedPrice

  useEffect(() => {
    if (!urlVariant) {
      return
    }

    const variantOptions = optionsAsKeymap(urlVariant.options) ?? {}
    setOptions((current) => (isEqual(current, variantOptions) ? current : variantOptions))
  }, [urlVariant])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setError(null)
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (urlVariantId && !selectedVariant && urlVariant) {
      return
    }

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant, urlVariant, urlVariantId, pathname, router, searchParams])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!activeVariant?.id) {
      setError("Please select a variant before adding the product to the cart.")
      return null
    }

    if (!hasPrice) {
      setError(
        "This variant does not have a price yet. Add a price in Medusa Admin before adding it to the cart."
      )
      return null
    }

    setIsAdding(true)
    setError(null)

    try {
      await addToCart({
        variantId: activeVariant.id,
        quantity: 1,
        countryCode,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The product could not be added to the cart."
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={activeVariant} />

        {error ? (
          <p className="text-sm text-red-600" data-testid="product-actions-error">
            {error}
          </p>
        ) : null}

        <Button
          onClick={handleAddToCart}
          disabled={
            !activeVariant ||
            !hasPrice ||
            !!disabled ||
            isAdding ||
            !isValidVariant
          }
          variant="primary"
          className="w-full h-10"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {!activeVariant
            ? "Select variant"
            : !hasPrice
              ? "Price unavailable"
            : "Add to cart"}
        </Button>
        <MobileActions
          product={product}
          variant={activeVariant}
          options={options}
          updateOptions={setOptionValue}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
