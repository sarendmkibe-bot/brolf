
export default function ParticleBackground() {
  const particles = Array.from({ length: 120 }, (_, i) => ({
    id: i,
    left: (i * 37.7) % 100,
    top: (i * 61.3) % 100,
    size: i % 12 === 0 ? 3 : i % 4 === 0 ? 2 : 1,
    delay: (i % 10) * 0.5,
    duration: 4 + (i % 7),
  }));

  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.size === 3 ? 0.75 : 0.55,
            boxShadow: "0 0 6px rgba(255,255,255,0.7)",
            animation: `dustMove ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      <style>
        {`
          @keyframes dustMove {
            0%, 100% {
              transform: translate(0, 0);
              opacity: 0.35;
            }
            50% {
              transform: translate(8px, -15px);
              opacity: 0.85;
            }
          }
        `}
      </style>
    </div>
  );
}
