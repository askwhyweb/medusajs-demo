"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

type PaymentForm = {
  key: string
  title: string
  description: string
  enabled: boolean
  sort_order: number
  payload: {
    bank_name: string
    account_name: string
    account_number: string
    iban: string
    swift: string
    branch: string
    instructions: string
    reference_hint: string
  }
}

const paymentFields: Array<{
  label: string
  key: keyof PaymentForm["payload"]
}> = [
  { label: "Bank name", key: "bank_name" },
  { label: "Account name", key: "account_name" },
  { label: "Account number", key: "account_number" },
  { label: "IBAN", key: "iban" },
  { label: "SWIFT", key: "swift" },
  { label: "Branch", key: "branch" },
]

const PaymentSettingsPage = () => {
  const [form, setForm] = useState<PaymentForm | null>(null)
  const [status, setStatus] = useState("Loading bank transfer settings...")

  useEffect(() => {
    fetch("/admin/settings/payment")
      .then((res) => res.json())
      .then((data) => {
        setForm(
          data.payment ?? {
            key: "bank_transfer",
            title: "Bank transfer",
            description: "Offline payment details shown when bank transfer is selected.",
            enabled: true,
            sort_order: 1,
            payload: {
              bank_name: "Demo Bank",
              account_name: "MedusaJS Demo for Fivetech",
              account_number: "000123456789",
              iban: "PK00DEMO000123456789",
              swift: "DEMOPKKA",
              branch: "Karachi Main Branch",
              instructions:
                "Complete the transfer using the order reference shown at checkout. Orders are confirmed after payment is received.",
              reference_hint: "Use your order number in the transfer reference.",
            },
          }
        )
        setStatus("Edit the payment instructions and save changes to publish them.")
      })
  }, [])

  const save = async () => {
    if (!form) {
      return
    }

    setStatus("Saving bank transfer settings...")
    const response = await fetch("/admin/settings/payment", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ payment: form }),
    })

    if (!response.ok) {
      setStatus("The bank transfer settings could not be saved.")
      return
    }

    setStatus("Bank transfer settings saved.")
  }

  return (
    <Container className="max-w-5xl p-0">
      <div className="flex flex-col gap-6 p-6">
        <div>
          <Heading level="h1">Bank transfer</Heading>
          <p className="text-ui-fg-subtle">{status}</p>
        </div>

        {form ? (
          <div className="flex flex-col gap-5 rounded-lg border border-ui-border-base bg-ui-bg-base p-5">
            <label className="flex flex-row items-center gap-3 text-sm text-ui-fg-base">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  setForm({ ...form, enabled: event.target.checked })
                }
              />
              Enable bank transfer at checkout
            </label>

            {paymentFields.map(({ label, key }) => (
              <label key={key} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ui-fg-base">
                  {label}
                </span>
                <input
                  className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                  value={form.payload[key]}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      payload: {
                        ...form.payload,
                        [key]: event.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ui-fg-base">
                Instructions
              </span>
              <textarea
                className="min-h-[140px] rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                value={form.payload.instructions}
                onChange={(event) =>
                  setForm({
                    ...form,
                    payload: {
                      ...form.payload,
                      instructions: event.target.value,
                    },
                  })
                }
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ui-fg-base">
                Reference hint
              </span>
              <input
                className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
                value={form.payload.reference_hint}
                onChange={(event) =>
                  setForm({
                    ...form,
                    payload: {
                      ...form.payload,
                      reference_hint: event.target.value,
                    },
                  })
                }
              />
            </label>

            <div className="flex gap-3">
              <Button onClick={save}>Save bank transfer</Button>
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Bank Transfer",
})

export default PaymentSettingsPage
