// Consistent E-E-A-T disclaimer used across all content pages. Health-adjacent
// content needs the same clear "not veterinary advice" frame everywhere.
export function ContentDisclaimer({className = ''}: {className?: string}) {
  return (
    <p className={`rounded-lg border-l-2 border-[var(--brass)] bg-[var(--card)] p-4 text-sm text-[var(--ink-60)] ${className}`}>
      <span className="mono text-[var(--brass-ink)]">For general guidance only</span> — this is not veterinary advice. Product
      labels and your own veterinarian’s recommendation always take priority. Confirm timing, dosing and product choice with
      your vet, especially for young, pregnant, elderly, unwell or medicated animals.
    </p>
  );
}
