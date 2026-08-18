type SparklineProps = {
  values: Array<number | null>;
  label: string;
};

export function Sparkline({ values, label }: SparklineProps) {
  const points = values.filter((value): value is number => value !== null);
  if (points.length < 2) {
    return <p>{label}: —</p>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * 160;
      const y = 36 - ((value - min) / span) * 32;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <figure>
      <figcaption>{label}</figcaption>
      <svg viewBox="0 0 160 40" width="160" height="40" role="img" aria-label={label}>
        <path d={path} fill="none" stroke="#27c2ff" strokeWidth="2" />
      </svg>
    </figure>
  );
}
