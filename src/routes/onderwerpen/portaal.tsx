import { Container } from "../../components/layout/Container.tsx";

const Portaal = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-8 sm:px-4 sm:py-12">
        <div className="flex w-full max-w-[768px] flex-col gap-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
            MijnOverheid Zakelijk portaal
          </h1>
          <p className="leading-relaxed text-slate-700">
            Het prototype van MOZa is bedoeld om ideeën van het team en
            functionaliteiten te testen. De inhoud en werking zijn nog in
            ontwikkeling en kunnen nog wijzigen. Zo heeft de website geen echte
            DigiD/E-Herkenning koppeling. Maar je kunt wel inloggen met
            testgegevens. Deze vind je op de inlogpagina van het prototype.
          </p>

          <p className="leading-relaxed text-slate-700">
            Klik hier om de website te bezoeken:{" "}
            <a
              href="https://moza.mijnoverheidzakelijk.nl"
              className="rounded font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              MijnOverheid Zakelijk
            </a>
          </p>

          <p className="leading-relaxed text-slate-700">
            Wil je meer weten over hoe MOZa tot stand komt? Kijk dan op onze
            Github:{" "}
            <a
              href="https://github.com/MinBZK/moza-portaal"
              className="rounded font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              Github MijnOverheid Zakelijk
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Portaal;
