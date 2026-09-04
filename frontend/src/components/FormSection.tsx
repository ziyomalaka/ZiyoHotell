export function FormSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
          {step}
        </span>
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-navy">
      {label}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}
