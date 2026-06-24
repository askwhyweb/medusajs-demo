"use client"

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import RichTextEditor from "../../components/rich-text-editor"

type CmsBlockForm = {
  id?: string
  key: string
  title: string
  description: string
  enabled: boolean
  sort_order: number
  payload: {
    placement: string
    html: string
  }
}

type CmsBlocksResponse = {
  blocks?: CmsBlockForm[]
  block?: CmsBlockForm | null
}

const createDraftBlock = (index: number): CmsBlockForm => {
  const suffix = `${Date.now()}-${index}`

  return {
    key: `cms-block-${suffix}`,
    title: "New CMS block",
    description: "Reusable storefront content block.",
    enabled: true,
    sort_order: index + 1,
    payload: {
      placement: "homepage",
      html: "<h2>New storefront block</h2><p>Write reusable content here.</p>",
    },
  }
}

const CmsPage = () => {
  const [blocks, setBlocks] = useState<CmsBlockForm[]>([])
  const [status, setStatus] = useState("Loading CMS blocks...")

  useEffect(() => {
    fetch("/admin/settings/cms")
      .then((res) => res.json())
      .then((data: CmsBlocksResponse) => {
        const nextBlocks = data.blocks ?? (data.block ? [data.block] : [])
        setBlocks(
          nextBlocks
            .map((block) => ({
              ...block,
              description: block.description ?? "",
              payload: {
                placement: block.payload?.placement ?? "homepage",
                html:
                  block.payload?.html ??
                  "<h2>Reusable block</h2><p>Use this content anywhere in the storefront.</p>",
              },
            }))
            .sort((left, right) => left.sort_order - right.sort_order)
        )
        setStatus(
          "Create reusable CMS blocks and assign each one to a storefront placement."
        )
      })
  }, [])

  const blockCount = useMemo(() => blocks.length, [blocks.length])

  const addBlock = () => {
    setBlocks((current) => [...current, createDraftBlock(current.length)])
    setStatus("New CMS block added. Fill in the details and save it.")
  }

  const updateBlock = (index: number, patch: Partial<CmsBlockForm>) => {
    setBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === index ? { ...block, ...patch } : block
      )
    )
  }

  const saveBlock = async (index: number) => {
    const block = blocks[index]

    if (!block) {
      return
    }

    setStatus(`Saving CMS block ${block.key}...`)

    const response = await fetch("/admin/settings/cms", {
      method: block.id ? "PUT" : "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ block }),
    })

    if (!response.ok) {
      setStatus(`The CMS block ${block.key} could not be saved.`)
      return
    }

    const data = (await response.json()) as { block?: CmsBlockForm }

    if (data.block) {
      setBlocks((current) =>
        current.map((currentBlock, currentIndex) =>
          currentIndex === index ? data.block! : currentBlock
        )
      )
    }

    setStatus(`CMS block ${block.key} saved.`)
  }

  const deleteBlock = async (index: number) => {
    const block = blocks[index]

    if (!block) {
      return
    }

    const confirmed = window.confirm(
      `Delete the CMS block "${block.title}"? This cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setStatus(`Deleting CMS block ${block.key}...`)

    const response = await fetch("/admin/settings/cms", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ id: block.id, key: block.key }),
    })

    if (!response.ok) {
      setStatus(`The CMS block ${block.key} could not be deleted.`)
      return
    }

    setBlocks((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setStatus(`CMS block ${block.key} deleted.`)
  }

  return (
    <Container className="max-w-6xl p-0">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Heading level="h1">CMS blocks</Heading>
            <p className="text-ui-fg-subtle">{status}</p>
          </div>
          <Button variant="secondary" onClick={addBlock}>
            Add block
          </Button>
        </div>

        <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-sm text-ui-fg-subtle">
          Use placements such as <span className="font-medium">homepage</span>,
          <span className="font-medium"> cart</span>,
          <span className="font-medium"> checkout</span>, or any other section
          you render in the storefront. Blocks are sorted by{" "}
          <span className="font-medium">sort order</span>.
        </div>

        <div className="flex flex-col gap-5">
          {blocks.length ? (
            blocks.map((block, index) => (
              <CmsBlockCard
                key={block.id ?? block.key}
                block={block}
                index={index}
                onChange={updateBlock}
                onSave={saveBlock}
                onDelete={deleteBlock}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-base px-6 py-10 text-center text-ui-fg-subtle">
              No CMS blocks yet. Add one to publish reusable content.
            </div>
          )}
        </div>

        <div className="text-sm text-ui-fg-subtle">
          {blockCount} block{blockCount === 1 ? "" : "s"} configured
        </div>
      </div>
    </Container>
  )
}

function CmsBlockCard({
  block,
  index,
  onChange,
  onSave,
  onDelete,
}: {
  block: CmsBlockForm
  index: number
  onChange: (index: number, patch: Partial<CmsBlockForm>) => void
  onSave: (index: number) => Promise<void>
  onDelete: (index: number) => Promise<void>
}) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-ui-border-base bg-ui-bg-base p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading level="h2">{block.title || "CMS block"}</Heading>
          <p className="text-sm text-ui-fg-subtle">
            Key: <span className="font-medium text-ui-fg-base">{block.key}</span>
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ui-fg-base">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(event) =>
              onChange(index, { enabled: event.target.checked })
            }
          />
          Enabled
        </label>
      </div>

      <div className="grid gap-4 small:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ui-fg-base">Key</span>
          <input
            className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
            value={block.key}
            onChange={(event) => onChange(index, { key: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ui-fg-base">Placement</span>
          <input
            className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
            value={block.payload.placement}
            onChange={(event) =>
              onChange(index, {
                payload: {
                  ...block.payload,
                  placement: event.target.value,
                },
              })
            }
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ui-fg-base">Title</span>
          <input
            className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
            value={block.title}
            onChange={(event) => onChange(index, { title: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ui-fg-base">
            Sort order
          </span>
          <input
            className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
            type="number"
            value={block.sort_order}
            onChange={(event) =>
              onChange(index, { sort_order: Number(event.target.value) || 0 })
            }
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ui-fg-base">Description</span>
        <input
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2"
          value={block.description}
          onChange={(event) =>
            onChange(index, { description: event.target.value })
          }
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ui-fg-base">Content</span>
        <RichTextEditor
          value={block.payload.html}
          onChange={(html) =>
            onChange(index, {
              payload: {
                ...block.payload,
                html,
              },
            })
          }
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onSave(index)}>Save block</Button>
        <Button variant="secondary" onClick={() => onDelete(index)}>
          Delete block
        </Button>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "CMS Blocks",
})

export default CmsPage
