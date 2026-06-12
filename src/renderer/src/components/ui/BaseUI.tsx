import { type ReactNode, useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import * as SelectPrimitive from '@radix-ui/react-select'

export function CustomSelect({
  options,
  placeholder,
  value,
  className,
  onChange,
}: {
  options: { value: string; label: string }[]
  placeholder?: string
  value?: string
  className?: string
  onChange?: (value: string) => void
}): JSX.Element {
  const [selected, setSelected] = useState(value ?? '')
  useEffect(() => {
    setSelected(value ?? '')
  }, [value])
  const handleValueChange = (val: string): void => {
    setSelected(val)
    onChange?.(val)
  }
  return (
    <SelectPrimitive.Root value={selected} onValueChange={handleValueChange}>
      <SelectPrimitive.Trigger className={`custom-select-trigger ${className ?? ''}`}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="custom-select-icon">
          <ChevronDown size={12} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="custom-select-content" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport className="custom-select-viewport">
            {options.map((opt) => (
              <SelectPrimitive.Item key={opt.value} value={opt.value} className="custom-select-item">
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export function SegmentedControl({ values, active, onChange }: { values: string[]; active: string; onChange?: (value: string) => void }): JSX.Element {
  return (
    <div className="segmented-control">
      {values.map((value) => (
        <button key={value} className={value === active ? 'active' : ''} onClick={() => onChange?.(value)}>{value}</button>
      ))}
    </div>
  )
}

export function Switch({ enabled, onChange }: { enabled: boolean; onChange?: (enabled: boolean) => void }): JSX.Element {
  return <span className={`switch ${enabled ? 'enabled' : ''}`} onClick={() => onChange?.(!enabled)}><i /></span>
}

export function ProxyField({ label, children, className }: { label?: string | ReactNode; children: ReactNode; className?: string }): JSX.Element {
  return (
    <label className={`proxy-field ${className ?? ''}`} style={label === '' || label == null ? { gridTemplateColumns: '1fr' } : undefined}>
      {label !== '' && label != null && <span>{label}</span>}
      {children}
    </label>
  )
}

export function SelectLike({ value }: { value: string }): JSX.Element {
  return (
    <button className="select-like">
      <span>{value}</span>
      <ChevronDown size={12} />
    </button>
  )
}
