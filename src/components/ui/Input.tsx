import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const fieldBase =
  'w-full rounded-xl bg-white px-4 py-2.5 text-charcoal ring-1 ring-inset ring-charcoal/15 placeholder:text-charcoal-faint focus:ring-2 focus:ring-sage-500 disabled:opacity-60'

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
        <label htmlFor={id} className="block text-sm font-semibold text-charcoal">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm text-terracotta-600">{error}</p>
      ) : hint ? (
        <p className="text-sm text-charcoal-muted">{hint}</p>
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
        className={cn(fieldBase, error && 'ring-terracotta-400', className)}
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
        className={cn(fieldBase, 'min-h-24 resize-y', error && 'ring-terracotta-400', className)}
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
        className={cn(fieldBase, 'appearance-none pr-10', error && 'ring-terracotta-400', className)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  )
})
