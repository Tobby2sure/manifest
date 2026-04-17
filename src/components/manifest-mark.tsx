/**
 * Manifest directional-flow mark.
 *
 * Composition (per identity spec):
 * - Circle outline (INTENT field)
 * - Horizontal shaft left → right, violet → emerald (intent → connection)
 * - Arrowhead at the emerald end
 * - Small filled dot at center (dropped below 16px)
 *
 * Modes:
 * - primary  : violet/emerald shaft on ink circle
 * - paper    : monochrome on light (ink/black)
 * - ink      : monochrome on dark (paper/white)
 *
 * Motion:
 * - animated: violet shaft enters, dot pulses, emerald exits. Loop ~1.6s.
 *   Used for loading states.
 */
interface ManifestMarkProps {
  size?: number;
  mode?: "primary" | "paper" | "ink";
  animated?: boolean;
  className?: string;
}

export function ManifestMark({
  size = 32,
  mode = "primary",
  animated = false,
  className,
}: ManifestMarkProps) {
  // Geometry in 64x64 viewBox — scales to any pixel size.
  const cx = 32;
  const cy = 32;
  const r = 20;
  const strokeWidth = 3;

  // Shaft extends past the circle (per spec: extends out to both sides)
  const shaftY = cy;
  const shaftStartX = 4;
  const shaftEndX = 60;
  const shaftThickness = 4;

  // Colors per mode
  let circleStroke: string;
  let violetColor: string;
  let emeraldColor: string;
  let dotColor: string;

  switch (mode) {
    case "paper":
      circleStroke = "currentColor";
      violetColor = "currentColor";
      emeraldColor = "currentColor";
      dotColor = "currentColor";
      break;
    case "ink":
      circleStroke = "currentColor";
      violetColor = "currentColor";
      emeraldColor = "currentColor";
      dotColor = "currentColor";
      break;
    case "primary":
    default:
      circleStroke = "currentColor";
      violetColor = "#8b5cf6"; // violet-500
      emeraldColor = "#10b981"; // emerald-500
      dotColor = "currentColor";
      break;
  }

  // Drop the detail dot at small sizes (per spec — min 16px favicon drops detail)
  const showDot = size >= 20;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Manifest"
      role="img"
    >
      {/* Circle — INTENT field */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={circleStroke}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Violet shaft (left half) */}
      <line
        x1={shaftStartX}
        y1={shaftY}
        x2={cx}
        y2={shaftY}
        stroke={violetColor}
        strokeWidth={shaftThickness}
        strokeLinecap="butt"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0;1;1;1"
            keyTimes="0;0.2;0.8;1"
            dur="1.6s"
            repeatCount="indefinite"
          />
        )}
      </line>

      {/* Emerald shaft (right half) */}
      <line
        x1={cx}
        y1={shaftY}
        x2={shaftEndX - 5}
        y2={shaftY}
        stroke={emeraldColor}
        strokeWidth={shaftThickness}
        strokeLinecap="butt"
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0;0;1;1"
            keyTimes="0;0.4;0.6;1"
            dur="1.6s"
            repeatCount="indefinite"
          />
        )}
      </line>

      {/* Arrowhead (emerald) */}
      <polygon
        points={`${shaftEndX},${shaftY} ${shaftEndX - 7},${shaftY - 5} ${shaftEndX - 7},${shaftY + 5}`}
        fill={emeraldColor}
      >
        {animated && (
          <animate
            attributeName="opacity"
            values="0;0;1;1"
            keyTimes="0;0.5;0.7;1"
            dur="1.6s"
            repeatCount="indefinite"
          />
        )}
      </polygon>

      {/* Center dot — dropped at small sizes */}
      {showDot && (
        <circle cx={cx} cy={cy} r={3.5} fill={dotColor}>
          {animated && (
            <animate
              attributeName="r"
              values="3.5;5;3.5"
              keyTimes="0;0.5;1"
              dur="1.6s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      )}
    </svg>
  );
}
