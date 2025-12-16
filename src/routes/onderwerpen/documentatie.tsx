import { Container } from "../../components/layout/Container.tsx";

const Documentatie = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Documentatie
          </h1>
          <p className="text-slate-800">
            Binnen het programma MOZa gebruiken we een tool om de
            software-architectuur duidelijk en gestructureerd vast te leggen en
            te visualiseren. Hiermee willen we overzicht, transparantie en
            gedeeld begrip creëren over wat we aan het ontwikkelen zijn. De
            documentatie is met name bedoeld voor architecten en ontwikkelaars.
          </p>

          <p className="text-slate-800">
            Wil je meer weten over de documentatie?
            <br />
            Kijk dan op onze documentatie-pagina:{" "}
            <a
              href="https://docs.mijnoverheidzakelijk.nl/workspace/documentation"
              className="font-medium text-sky-700 hover:underline"
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
