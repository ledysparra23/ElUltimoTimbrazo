// Logo component — renders the company logo (img + optional text)
export default function Logo({ size = 32, showText = true, textSize = 16, light = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img
        src="/logo.png"
        alt="ElUltimoTimbraso logo"
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
      {showText && (
        <span style={{
          fontStyle: 'italic',
          fontWeight: 800,
          fontSize: textSize,
          color: light ? '#fff' : '#1e40af',
          letterSpacing: '-0.3px',
          lineHeight: 1.1,
        }}>
          ElUltimoTimbraso
        </span>
      )}
    </div>
  );
}
