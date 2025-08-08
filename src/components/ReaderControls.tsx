import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

export type ReaderControlsProps = {
  fontSize: number
  onFontDec: () => void
  onFontInc: () => void
}

export const ReaderControls = ({ fontSize, onFontDec, onFontInc }: ReaderControlsProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Text size</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" aria-label="Decrease font size" onClick={onFontDec}>
          <Minus className="size-4" />
        </Button>
        <span className="w-10 text-center text-sm tabular-nums">{fontSize}px</span>
        <Button variant="secondary" size="sm" aria-label="Increase font size" onClick={onFontInc}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
