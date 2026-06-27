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

  // Plano's model proxy requires a model id, so default to the first available
  // one until the user picks otherwise (avoids a "Model '' not found" first turn).
  useEffect(() => {
    if (!value && models && models.length > 0) onChange(models[0].id)
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
