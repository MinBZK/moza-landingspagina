import { Container } from "../../components/layout/Container.tsx";

const ProfielService = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Profiel service
          </h1>

          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            Op één plek je contactgegevens en communicatievoorkeuren beheren
          </h2>
          <p className="break-words whitespace-pre-line text-slate-800">
            De Profiel Service is een van de services die binnen het programma
            MOZa wordt ontwikkeld. Dankzij deze service kunnen ondernemers
            straks, net als burgers, op één plek hun contactgegevens en
            communicatievoorkeuren met de overheid (digitaal of per post)
            beheren. Ze hoeven deze dus niet meer op verschillende plekken in te
            voeren of bij te houden.
          </p>

          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            Overheden kunnen gegevens opvragen
          </h2>
          <p>
            Overheidsorganisaties kunnen deze profielgegevens (als de ondernemer
            daar toestemming voor heeft gegeven) via gestandaardiseerde API’s
            opvragen en gebruiken. Deze gegevens worden dan niet meer
            versnipperd opgeslagen in losse portalen en applicaties, maar komen
            samen in een centraal, goed beheerd register.
          </p>

          <ul className="list-disc space-y-2 pl-6 mb-2 text-slate-800">
            <li>
              Geeft ondernemers controle over hun profielgegevens en hoe zij met
              de overheid willen communiceren. Ze ervaren minder administratieve
              handelingen en lasten en betere communicatie met de overheid.
            </li>
            <li>
              Voorziet overheidsorganisaties van actuele en verifieerbare
              gegevens, rechtstreeks uit een centrale bron.
            </li>
            <li>
              Versterkt de digitale overheid met een herbruikbare bouwsteen die
              past binnen de Generieke Digitale Infrastructuur (GDI).
            </li>
          </ul>

          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            Gefaseerde ontwikkelstrategie
          </h2>
          <p>
            De Profiel Service wordt stapsgewijs ontwikkeld, met een nadruk op
            eenvoud, hergebruik en federatieve samenwerking. We beginnen met een
            basisprofiel (e-mailadres, telefoonnummer, postadres en één algemene
            contactvoorkeur). Later kunnen er meer contactvoorkeuren aangegeven
            worden. Er worden steeds meer bronregisters gekoppeld zoals KvK, BRP
            en BAG. Tot slot kunnen overheidsorganisaties aansluiten via
            standaarden en API’s. Bij de ontwikkeling volgen we de Nederlandse
            Richtlijn Digitale Systemen (NeRDS) en gebruiken we open standaarden
            (NORA, NL GOV API Design Rules en GDI-richtlijnen). Toegang wordt
            geregeld via DigiD, eHerkenning en eIDAS. We hanteren privacy by
            design principes (minimale dataverwerking, transparantie en logging
            conform LDV).
          </p>

          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            Oproep tot samenwerking
          </h2>
          <p>
            De ontwikkeling van MOZa en daarbinnen de Profiel Service vraagt
            intensieve samenwerking tussen beleidsmakers, ontwerpers,
            ontwikkelaars en uitvoeringsorganisaties. Alleen door gezamenlijk
            standaarden te ontwikkelen, adoptie te stimuleren en kennis te delen
            ontstaat een breed gedragen voorziening die écht waarde toevoegt.
            Wij nodigen daarom alle overheidsorganisaties uit om mee te denken,
            mee te bouwen en mee te leren. Samen maken we van MOZa niet alleen
            een technische voorziening, maar een belangrijke bijdrage aan het
            fundament voor betrouwbare, toegankelijke en toekomstbestendige
            digitale dienstverlening. om de
          </p>

          <p className="text-slate-800">
            Wil je meer weten over hoe de profiel service tot stand komt?
            <br />
            Kijk dan op onze GitHub:{" "}
            <a
              href="https://github.com/MinBZK/moza-profiel-service"
              className="font-medium text-sky-700 hover:underline"
            >
              GitHub profiel service
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default ProfielService;
