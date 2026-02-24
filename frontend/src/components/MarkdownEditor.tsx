import { useState } from 'react'
import { marked } from 'marked'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Eye, Edit2 } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

export function MarkdownEditor({ value, onChange, placeholder, minHeight = '300px' }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false)

  const getHtml = () => {
    return { __html: marked(value) as string }
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {preview ? 'Preview' : 'Markdown'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview(!preview)}
          className="h-7 px-2 text-xs"
        >
          {preview ? (
            <>
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </>
          )}
        </Button>
      </div>
      {preview ? (
        <div
          className="markdown-content p-4 min-h-[200px]"
          style={{ minHeight }}
          dangerouslySetInnerHTML={getHtml()}
        />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Write markdown here...'}
          className="border-0 rounded-none focus-visible:ring-0 resize-none font-mono text-sm"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}
