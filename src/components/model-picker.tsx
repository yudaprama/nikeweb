import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useModels } from '@/lib/models'

interface ModelPickerProps {
  value?: string
  onChange: (model: string) => void
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  const { data: models, isLoading } = useModels()

  // Auto-select the first model when none is chosen, or when the current
  // selection is no longer in the available list (e.g. model source changed).
  useEffect(() => {
    if (!models || models.length === 0) return
    if (!value || !models.some((m) => m.id === value)) {
      onChange(models[0].id)
    }
  }, [value, models, onChange])

  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-[260px]" size="sm">
        <SelectValue placeholder={isLoading ? 'Loading models…' : 'Select a model'} />
      </SelectTrigger>
      <SelectContent>
        {models?.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
