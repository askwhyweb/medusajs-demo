"use client"

import { Button } from "@medusajs/ui"
import { useEffect, useRef } from "react"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
}

const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!editorRef.current) {
      return
    }

    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const apply = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? "")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => apply("bold")}>
          Bold
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => apply("italic")}
        >
          Italic
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => apply("underline")}
        >
          Underline
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => apply("formatBlock", "h2")}
        >
          Heading
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => apply("insertUnorderedList")}
        >
          Bullets
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => apply("insertOrderedList")}
        >
          Numbered
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
        className="min-h-[220px] rounded-lg border border-ui-border-base bg-ui-bg-base p-4 text-ui-fg-base outline-none"
      />
    </div>
  )
}

export default RichTextEditor
