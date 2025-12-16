import { Container } from "../../components/layout/Container.tsx";

const OpenWerken = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Open werken
          </h1>
          <p className="text-slate-800">
            Het programma MijnOverheid Zakelijk gebruikt verschillende platforms
            en tools om zo transparant mogelijk te kunnen werken. Zo
            ondersteunen we het “open werken”-principe. We werken samen met
            verschillende overheden in actieve dialoog om services te
            ontwikkelen die van toegevoegde waarde zijn. Ook betrekken we zoveel
            mogelijk eindgebruikers in het ontwerp- en ontwikkelproces.
            Bijvoorbeeld via UX-onderzoek en co-creatie.
          </p>
          <p className="text-slate-800">
            Via het GitHub-platform
            werken we samen aan documenten, software en beleidsproducten.
            Besluiten en technische keuzes zijn terug te lezen in commits,
            issues en merge requests. Externen kunnen meedenken via issues,
            suggesties of pull requests.
          </p>
          <p className="text-slate-800">
            We publiceren software, data-scripts of
            standaarden als open source. Andere organisaties kunnen dit
            hergebruiken → minder dubbel werk. Kortom, we werken niet achter
            gesloten deuren, maar samen en zichtbaar. Iedereen kan zien wat er
            verandert, door wie en waarom.
          </p>

          <p className="text-slate-800">
            Wil je meekijken of meedoen? <a href="https://github.com/orgs/MinBZK/teams/mijnoverheid-zakelijk/repositories"
              className="text-sky-700 hover:underline">Kijk dan op onze GitHub</a>.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default OpenWerken;
