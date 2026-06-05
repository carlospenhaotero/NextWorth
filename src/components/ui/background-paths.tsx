"use client";

import { motion } from "motion/react";

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  // Enclose every curve's control points so nothing is clipped at the edges.
  // A bezier never leaves its control hull, so this viewBox contains all lines.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < 36; i++) {
    const t = i * 5 * position;
    const xs = [-380 + t, -312 + t, 152 - t, 616 - t, 684 - t];
    const ys = [-189 - i * 6, 216 - i * 6, 875 - i * 6];
    for (const x of xs) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    for (const y of ys) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full text-white"
        viewBox={viewBox}
        fill="none"
        preserveAspectRatio="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.025}
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 0.92,
              opacity: 0.55,
              pathOffset: [0, 1],
            }}
            transition={{
              // Draw-in entrance from the top-left start point, staggered.
              pathLength: { delay: path.id * 0.04, duration: 2.5, ease: "easeInOut" },
              opacity: { delay: path.id * 0.04, duration: 2.5, ease: "easeOut" },
              // Continuous flow starts only after the entrance finishes.
              pathOffset: {
                delay: 2.5 + path.id * 0.04,
                duration: 20 + Math.random() * 10,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              },
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Animated SVG paths background. Renders only the moving lines on a
 * transparent surface so it can sit behind any content. Lines are white,
 * tuned for the app's dark monochrome theme.
 */
export function BackgroundPaths() {
  return (
    <div className="absolute inset-0">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}
