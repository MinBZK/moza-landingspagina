import { Container } from "../../components/layout/Container.tsx";

const OpenWerken = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">

          <ul className="breadcrumb flex">
            <li><a href="/" className="text-sky-700">Home</a></li>
            <li><a href="/onderwerpen" className="text-sky-700">Onderwerpen</a></li>
            <li>Open werken</li>
          </ul>

          <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
            Open werken
          </h1>
          <p className="leading-relaxed text-slate-700">
            Het programma MijnOverheid Zakelijk gebruikt verschillende platforms
            en tools om zo transparant mogelijk te kunnen werken. Zo
            ondersteunen we het “open werken”-principe. We werken samen met
            verschillende overheden in actieve dialoog om services te
            ontwikkelen die van toegevoegde waarde zijn. Ook betrekken we zoveel
            mogelijk eindgebruikers in het ontwerp- en ontwikkelproces.
            Bijvoorbeeld via UX-onderzoek en co-creatie. Via het Github-platform
            werken we samen aan documenten, software en beleidsproducten.
            Besluiten en technische keuzes zijn terug te lezen in commits,
            issues en merge requests. Externen kunnen meedenken via issues,
            suggesties of pull requests. We publiceren software, data-scripts of
            standaarden als open source. Andere organisaties kunnen dit
            hergebruiken → minder dubbel werk. Kortom, we werken niet achter
            gesloten deuren, maar samen en zichtbaar. Iedereen kan zien wat er
            verandert, door wie en waarom.
          </p>

          <p className="leading-relaxed text-slate-700">
            Wil je meekijken of meedoen?
            <br />
            Kijk dan op onze Github:{" "}
            <a
              href="https://github.com/orgs/MinBZK/teams/mijnoverheid-zakelijk/repositories"
              className="rounded font-medium text-sky-700 underline-offset-2 hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              MijnOverheid Zakelijk
            </a>
          </p>
        </div>
      </div>
    </Container>
  );
};

export default OpenWerken;
