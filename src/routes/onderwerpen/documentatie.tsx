import { Container } from "../../components/layout/Container.tsx";

const Documentatie = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-8 sm:px-4 sm:py-12">
        <div className="flex w-full max-w-[768px] flex-col gap-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
            Documentatie
          </h1>
          <p className="leading-relaxed text-slate-700">
            Binnen het programma MOZa gebruiken we een tool om de
            software-architectuur duidelijk en gestructureerd vast te leggen en
            te visualiseren. Hiermee willen we overzicht, transparantie en
            gedeeld begrip creëren over wat we aan het ontwikkelen zijn. De
            documentatie is met name bedoeld voor architecten en ontwikkelaars.
          </p>

          <p className="leading-relaxed text-slate-700">
            Wil je meer weten over de documentatie?
            <br />
            Kijk dan op onze documentatie-pagina:{" "}
            <a
              href="https://docs.mijnoverheidzakelijk.nl/workspace/documentation"
              className="rounded font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              Documentatie MijnOverheid Zakelijk
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Documentatie;
