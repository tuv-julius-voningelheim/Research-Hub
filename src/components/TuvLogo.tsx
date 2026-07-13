// Recreation of the TÜV SÜD octagon mark as inline SVG:
// blue gradient octagon ring, white core, navy wordmark with divider.

export default function TuvLogo({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label="TÜV SÜD">
      <defs>
        <linearGradient id="tuvblue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0053b3" />
          <stop offset="0.45" stopColor="#1a7fdd" />
          <stop offset="1" stopColor="#0053b3" />
        </linearGradient>
      </defs>
      {/* outer white edge */}
      <polygon
        points="29.3,1 70.7,1 99,29.3 99,70.7 70.7,99 29.3,99 1,70.7 1,29.3"
        fill="#ffffff"
      />
      {/* blue ring */}
      <polygon
        points="30.5,4 69.5,4 96,30.5 96,69.5 69.5,96 30.5,96 4,69.5 4,30.5"
        fill="url(#tuvblue)"
      />
      {/* white core */}
      <polygon
        points="37.6,21 62.4,21 79,37.6 79,62.4 62.4,79 37.6,79 21,62.4 21,37.6"
        fill="#ffffff"
      />
      {/* wordmark */}
      <text
        x="50"
        y="47.5"
        textAnchor="middle"
        fill="#12284b"
        fontSize="21"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="-0.5"
      >
        TÜV
      </text>
      <rect x="31" y="51.5" width="38" height="1.8" fill="#12284b" />
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fill="#12284b"
        fontSize="12.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        SÜD
      </text>
    </svg>
  );
}
