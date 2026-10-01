import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-12 w-full min-w-0 rounded-2xl border border-line bg-surface px-4 text-[16px] text-fg placeholder:text-faint transition-colors focus:border-brand focus:outline-none aria-[invalid=true]:border-danger";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
  className?: string;
}

/** Rótulo + controle + dica/erro, com ids ligados para leitores de tela. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold text-muted">
          {label}
        </label>
      )}
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="text-[13px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix?: string;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ suffix, invalid, className, ...rest }, ref) {
  if (!suffix) return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputClass, className)} {...rest} />;
  return (
    <div className="relative min-w-0">
      <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputClass, "pr-14", className)} {...rest} />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted">{suffix}</span>
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(inputClass, "pr-3", className)} {...rest}>
      {children}
    </select>
  );
});
