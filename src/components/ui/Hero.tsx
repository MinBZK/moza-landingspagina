interface HeroProps {
  title: string;
  subtitle?: string;
}

export function Hero({ title, subtitle }: HeroProps) {
  return (
    <div className="relative h-[400px] w-full overflow-hidden">
      <img
        src={"hero.png"}
        alt={title}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50">
        <div className="flex h-full flex-col items-center justify-center text-center text-white">
          <h1 className="mb-4 text-5xl font-bold">{title}</h1>
          {subtitle && <p className="max-w-2xl text-xl">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
