import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getPaymentSettings } from "@lib/data/settings"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const [shippingMethods, paymentMethods, paymentSettings] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
    getPaymentSettings(),
  ])

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  const availablePaymentMethods = paymentSettings?.enabled
    ? paymentMethods
    : paymentMethods.filter((method) => method.id !== "pp_system_default")

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment
        cart={cart}
        availablePaymentMethods={availablePaymentMethods}
        paymentSettings={paymentSettings}
      />

      <Review cart={cart} />
    </div>
  )
}
