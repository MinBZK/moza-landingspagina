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
        alt={""}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex items-center">
        <Container className="flex items-center">
          <div className="mb-30 rounded-tr-4xl bg-[#dce3ea] py-4 pl-3 pr-5 text-[#154273] md:py-6 lg:w-2/5">
            <h1 className="mb-3 text-2xl font-bold sm:text-3xl md:mb-2 md:text-4xl">
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
