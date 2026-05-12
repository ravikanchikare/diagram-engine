export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  value: string;
}) {
  return (
    <label className="diagram-edge-inspector__field">
      <span className="diagram-edge-inspector__label">{label}</span>
      <select
        aria-label={label}
        className="diagram-edge-inspector__select"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
