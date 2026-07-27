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
    <div className="mb-3">
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      {Tag === "select" ? (
        <select
          id={name}
          name={name}
          className={`form-select ${error ? "is-invalid" : ""}`}
          value={value}
          onChange={onChange}
          required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
      ) : Tag === "textarea" ? (
        <textarea
          id={name}
          name={name}
          className={`form-control ${error ? "is-invalid" : ""}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={3}
          {...props}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          className={`form-control ${error ? "is-invalid" : ""}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          {...props}
        />
      )}
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}
