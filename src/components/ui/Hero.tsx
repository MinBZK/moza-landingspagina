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
          <div className="mb-auto rounded-xs rounded-tr-4xl bg-[#dce3ea] text-slate-700 py-5 pl-7 pr-6 -ml-3 lg:w-2/5">
            <h1 className="mb-3 text-2xl font-bold sm:text-3xl md:mb-2 md:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base font-medium sm:text-lg md:text-xl text-slate-800 !mb-0">
                {subtitle}
              </p>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}
