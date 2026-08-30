import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  required,
  as: Tag = "input",
  options,
  children,
  ...props
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      {Tag === "select" ? (
        <Select
          value={value ?? undefined}
          onValueChange={(v) => onChange?.({ target: { name, value: v } })}
        >
          <SelectTrigger
            id={name}
            name={name}
            className="w-full"
            aria-invalid={error ? true : undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
              {children}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : Tag === "textarea" ? (
        <textarea
          id={name}
          name={name}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={3}
          style={{ resize: "vertical" }}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      ) : (
        <Input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}