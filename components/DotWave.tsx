// Dot-matrix voice waveform used behind the dashboard headline.
// Static and deterministic: the same dots render on server and client.

const COLS = 84;
const ROWS = 25;
const STEP = 10;
const MID = (ROWS - 1) / 2;

// Height of the waveform at a column, in rows from the centre line.
function amplitude(col: number) {
  // Quiet on the left, where the headline sits; full height by mid-panel.
  const fade = Math.min(1, (col / COLS) * 1.5) ** 1.5;
  const wave = Math.abs(
    Math.sin(col * 0.42) * 0.55 +
      Math.sin(col * 0.17 + 1.3) * 0.3 +
      Math.sin(col * 0.93 + 0.4) * 0.15,
  );
  return (0.12 + wave * 0.88) * fade * (ROWS / 2);
}

const DOTS: { x: number; y: number; o: string }[] = [];
for (let col = 0; col < COLS; col++) {
  const amp = amplitude(col);
  for (let row = 0; row < ROWS; row++) {
    const dist = Math.abs(row - MID);
    if (dist > amp) continue;
    DOTS.push({
      x: col * STEP + 4,
      y: row * STEP + 4,
      o: (0.3 + 0.7 * (1 - dist / Math.max(amp, 1))).toFixed(2),
    });
  }
}

export function DotWave({ className = "" }: { className?: string }) {
  const fade = "linear-gradient(to left, #000 20%, transparent 94%)";
  return (
    <svg
      viewBox={`0 0 ${COLS * STEP} ${ROWS * STEP}`}
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      className={className}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      <defs>
        <pattern
          id="dotwave-grid"
          width={STEP}
          height={STEP}
          patternUnits="userSpaceOnUse"
        >
          <rect x="4" y="4" width="2" height="2" fill="currentColor" opacity="0.13" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotwave-grid)" />
      {DOTS.map((d) => (
        <rect
          key={`${d.x}-${d.y}`}
          x={d.x}
          y={d.y}
          width="2"
          height="2"
          fill="currentColor"
          opacity={d.o}
        />
      ))}
    </svg>
  );
}
