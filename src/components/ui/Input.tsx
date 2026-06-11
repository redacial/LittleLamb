import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

// 14px radius, white field, 1.5px warm-gray border → sage on focus. DESIGN_SYSTEM.md §Form Inputs.
const fieldBase =
  'w-full rounded-ll-input bg-white px-4 py-2.5 text-ll-ink border-1.5 border-ll-warm-gray/40 placeholder:text-ll-warm-gray/60 focus:outline-none focus:border-ll-sage focus:ring-2 focus:ring-ll-sage/30 disabled:opacity-60'

interface FieldWrap {
  label?: string
  hint?: string
  error?: string
}

function Wrapper({
  id,
  label,
  hint,
  error,
  children,
}: FieldWrap & { id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-label font-medium text-ll-ink">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-sm text-ll-warm-gray">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldWrap {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(fieldBase, error && 'border-red-400', className)}
        {...rest}
      />
    </Wrapper>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldWrap {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, ...rest },
  ref,
) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(fieldBase, 'min-h-24 resize-y', error && 'border-red-400', className)}
        {...rest}
      />
    </Wrapper>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldWrap {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, children, ...rest },
  ref,
) {
  const auto = useId()
  const fieldId = id ?? auto
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(fieldBase, 'appearance-none pr-10', error && 'border-red-400', className)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  )
})
