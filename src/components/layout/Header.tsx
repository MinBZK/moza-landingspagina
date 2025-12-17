import { Container } from "./Container.tsx";

export function Header() {
  return (
    <Container>
      <header className="mx-auto grid w-full max-w-screen-xl grid-cols-1 items-center gap-3 px-4 md:grid-cols-3">
        <div className="hidden justify-self-center md:block md:justify-self-start">
          <p className="!mb-0 hidden text-lg font-bold md:block">
            MijnOverheid Zakelijk
          </p>
          <p className="!mb-0 hidden font-serif italic md:block">
            Overzicht in wat er speelt
          </p>
        </div>

        <div className="justify-self-center">
          <img
            src="/logo.svg"
            alt="Logo Rijksoverheid"
            id="logotype"
            className="h-auto max-w-full"
          />
        </div>

        <div className="hidden md:block" />
      </header>
    </Container>
  );
}
