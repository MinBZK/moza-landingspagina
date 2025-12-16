import { Container } from "../../components/layout/Container.tsx";

const Portaal = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-1 mb-4 text-2xl font-semibold text-slate-700">
            MijnOverheid Zakelijk portaal
          </h1>
          <p className="text-slate-800">
            Het prototype van MOZa is bedoeld om ideeën van het team en
            functionaliteiten te testen. De inhoud en werking zijn nog in
            ontwikkeling en kunnen nog wijzigen. Zo heeft de website geen echte
            DigiD/E-Herkenning koppeling. Maar je kunt wel inloggen met
            testgegevens. Deze vind je op de inlogpagina van het prototype.
          </p>

          <p className="text-slate-800">
            Klik hier om de website te bezoeken:{" "}
            <a
              href="https://moza.mijnoverheidzakelijk.nl"
              className="font-medium text-sky-700 hover:underline"
            >
              MijnOverheid Zakelijk
            </a>
          </p>

          <p className="text-slate-800">
            Wil je meer weten over hoe MOZa tot stand komt? Kijk dan op onze
            GitHub:{" "}
            <a
              href="https://github.com/MinBZK/moza-portaal"
              className="font-medium text-sky-700 hover:underline"
            >
              GitHub MijnOverheid Zakelijk
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Portaal;
