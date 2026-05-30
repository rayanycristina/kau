const particles = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 19) % 100}%`,
  duration: `${4 + (index % 5)}s`,
  delay: `${index * 0.18}s`
}));

export function OperationalEnvironment() {
  return (
    <div aria-hidden className="operational-environment pointer-events-none fixed inset-0 overflow-hidden">
      <div className="ambient-blob ambient-blob-money absolute left-[19%] top-[-18%] h-[520px] w-[620px] rounded-full bg-money/10 blur-[120px]" />
      <div className="ambient-blob ambient-blob-purple absolute right-[8%] top-[5%] h-[460px] w-[520px] rounded-full bg-purple/12 blur-[110px]" />
      <div className="ambient-blob ambient-blob-cyan absolute bottom-[-20%] left-[42%] h-[420px] w-[520px] rounded-full bg-cyan/10 blur-[130px]" />
      <div className="absolute inset-0 bg-tactical-lines bg-[size:42px_42px] opacity-[0.075]" />
      <div className="operational-scanline absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="operational-particle absolute h-1 w-1 rounded-full bg-cyan/40 shadow-glowCyan"
          style={{ left: particle.left, top: particle.top, animationDuration: particle.duration, animationDelay: particle.delay }}
        />
      ))}
    </div>
  );
}
