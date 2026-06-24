import { test, expect, type Page, type APIRequestContext } from "@playwright/test"

/**
 * Full storefront purchase journey, asserted against backend state end to end:
 *
 *   home → store grid → apply a filter facet → product page → select variant →
 *   add to cart → cart → checkout (address → delivery → payment) → place order →
 *   order confirmation → verify the order exists in the Medusa backend.
 *
 * Runs against the live Docker Compose stack (storefront :8000, backend :9000).
 */

const BACKEND_URL = process.env.E2E_BACKEND_URL || "http://localhost:9000"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@medusa.local"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MedusaDemo123!"

async function productCount(page: Page): Promise<number> {
  return page.getByTestId("product-wrapper").count()
}

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BACKEND_URL}/auth/user/emailpass`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(res.ok(), "admin auth should succeed").toBeTruthy()
  const body = await res.json()
  expect(body.token, "admin token should be present").toBeTruthy()
  return body.token as string
}

test("storefront → backend purchase journey", async ({ page, request }) => {
  // 1. Home page renders.
  await page.goto("/")
  await expect(page).toHaveTitle(/.+/)

  // 2. Store grid lists products.
  await page.goto("/store")
  await expect(page.getByTestId("store-page-title")).toBeVisible()
  await expect.poll(() => productCount(page)).toBeGreaterThan(0)
  const initialCount = await productCount(page)

  // 3. Apply a filter facet (Brand) and confirm the grid narrows but stays non-empty.
  const brandFacet = page.getByTestId("facet-brand")
  await expect(brandFacet).toBeVisible()
  // Controlled checkbox: clicking triggers a navigation that re-renders the grid
  // with the facet applied (so .click(), not .check(), which expects an in-place flip).
  await brandFacet.getByTestId(/^facet-option-brand-/).first().click()
  await expect(page).toHaveURL(/f_brand=/)
  await expect.poll(() => productCount(page)).toBeGreaterThan(0)
  const filteredCount = await productCount(page)
  expect(filteredCount).toBeLessThanOrEqual(initialCount)

  // 4. Open the first product in the filtered grid.
  await page.getByTestId("product-wrapper").first().click()
  await expect(page.getByTestId("add-product-button")).toBeVisible()

  // 5. Select a value for every variant option, then add to cart.
  const optionGroups = page.getByTestId("product-options")
  const groupCount = await optionGroups.count()
  for (let i = 0; i < groupCount; i++) {
    await optionGroups.nth(i).getByTestId("option-button").first().click()
  }

  const addButton = page.getByTestId("add-product-button")
  await expect(addButton).toBeEnabled()
  await addButton.click()

  // The cart count in the nav reflects the added line item.
  await expect(page.getByTestId("nav-cart-link")).toContainText(/\(1\)|\(2\)/)

  // 6. Cart page shows the item; go to checkout.
  await page.goto("/cart")
  await expect(page.getByTestId("product-row").first()).toBeVisible()
  await page.getByTestId("checkout-button").click()

  // 7. Shipping address.
  await expect(page.getByTestId("shipping-first-name-input")).toBeVisible()
  await page.getByTestId("shipping-first-name-input").fill("Ada")
  await page.getByTestId("shipping-last-name-input").fill("Lovelace")
  await page.getByTestId("shipping-address-input").fill("1 Demo Street")
  await page.getByTestId("shipping-postal-code-input").fill("74000")
  await page.getByTestId("shipping-city-input").fill("Karachi")
  await page.getByTestId("shipping-province-input").fill("Sindh")
  await page
    .getByTestId("shipping-country-select")
    .selectOption(process.env.NEXT_PUBLIC_DEFAULT_REGION || "pk")
  await page.getByTestId("shipping-email-input").fill("ada@example.com")
  await page.getByTestId("submit-address-button").click()

  // 8. Delivery method.
  await expect(page.getByTestId("delivery-options-container")).toBeVisible()
  await page.getByTestId("delivery-option-radio").first().click()
  await page.getByTestId("submit-delivery-option-button").click()

  // 9. Payment method (manual bank transfer, provider pp_system_default).
  await expect(page.getByTestId("submit-payment-button")).toBeVisible()
  const paymentOption = page.getByTestId("payment-option-pp_system_default")
  if (await paymentOption.count()) {
    await paymentOption.first().click()
  }
  await page.getByTestId("submit-payment-button").click()

  // 10. Review & place order.
  const placeOrder = page.getByTestId("submit-order-button")
  await expect(placeOrder).toBeVisible()
  await placeOrder.click()

  // 11. Order confirmation page.
  await expect(page.getByTestId("order-complete-container")).toBeVisible({
    timeout: 60_000,
  })
  await expect(page).toHaveURL(/\/order\/[^/]+\/confirmed/)

  // 12. Verify the order exists in the Medusa backend (frontend ↔ backend mapping).
  const match = page.url().match(/\/order\/([^/]+)\/confirmed/)
  expect(match, "confirmed URL should contain an order id").toBeTruthy()
  const orderId = match![1]

  const token = await getAdminToken(request)
  const orderRes = await request.get(`${BACKEND_URL}/admin/orders/${orderId}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(orderRes.ok(), "backend should return the placed order").toBeTruthy()
  const { order } = await orderRes.json()
  expect(order.id).toBe(orderId)
  expect(order.items?.length ?? 0).toBeGreaterThan(0)
})
