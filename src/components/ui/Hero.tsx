import { Container } from "../layout/Container.tsx";

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
      <div className="absolute inset-0 flex items-center">
        <Container className="flex items-center">
          <div className="w-full bg-white p-3 sm:w-1/2 md:w-1/2 md:p-8 lg:w-1/3">
            <h1 className="mb-3 text-2xl font-bold sm:text-3xl md:mb-6 md:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base font-medium sm:text-lg md:text-xl">
                {subtitle}
              </p>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}
