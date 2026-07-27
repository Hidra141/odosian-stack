interface ScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

function getColor(score: number) {
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-primary)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function ScoreGauge({ score, size = 80, label }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = getColor(clamped);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-500"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-text)"
          fontSize={size * 0.25}
          fontWeight="600"
        >
          {clamped}
        </text>
      </svg>
      {label && (
        <span className="text-xs text-text-secondary">{label}</span>
      )}
    </div>
  );
}
