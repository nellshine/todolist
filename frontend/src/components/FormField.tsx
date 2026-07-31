import './FormField.css';

interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

export default function FormField({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
}: FormFieldProps) {
  return (
    <label className="form-field">
      <span className="form-field__label">{label}</span>
      <input
        className="form-field__input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
    </label>
  );
}
