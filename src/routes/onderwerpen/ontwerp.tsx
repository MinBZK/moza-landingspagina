import { Container } from "../../components/layout/Container.tsx";
const Ontwerp = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Ontwerp met de eindgebruiker centraal
          </h1>
          <p className="text-slate-800">
            Goed ontwerp begint bij luisteren. Daarom betrekken wij eindgebruikers vanaf het allereerste moment bij ons ontwerpproces. We starten met het in kaart brengen van hun dagelijkse praktijk: waar lopen zij tegenaan, wat kost onnodig tijd of frustratie, en waar liggen juist kansen? Door zowel pijnpunten als wensen expliciet te inventariseren, creëren we een scherp en gedeeld beeld van wat er echt toe doet.
          </p>
          <h2 className="text-xl font-semibold text-slate-700">Van inzicht naar eindproduct</h2>
          <p className="text-slate-800">
            In interactieve sessies, interviews en gebruikerstests leggen we onze inzichten en ideeën voor aan de eindgebruikers. Zo toetsen we aannames en krijgen we waardevolle feedback op functionaliteit, gebruiksgemak en flows. Deze inzichten vormen de basis voor onze ontwerprichtingen.
          </p>
          <p className="text-slate-800">
            Voor gebruikerstests maken we vaak gebruik van interactive Figma prototypes. We gebruiken ze als hulpmiddel om samen te verkennen, keuzes te onderbouwen en verbeteringen door te voeren. De feedback die we ophalen verwerken we direct in het ontwerp, waarna we opnieuw testen en itereren.
          </p>
          <p className="text-slate-800">
            Door deze continue cyclus van onderzoeken, ontwerpen, testen en verfijnen zorgen we ervoor dat wat we bouwen aansluit op de behoeften en verwachtingen van eindgebruikers.
          </p>
          <h2 className="text-xl font-semibold text-slate-700">Figma prototype</h2>
          <p className="text-slate-800">
            De <a href="https://www.figma.com/proto/Px77Bmqi8hjlbiPVtJrSkw/MOZa-gebruikerstest?page-id=3516%3A14156&node-id=3552-17321&p=f&viewport=-4166%2C261%2C0.27&t=vbSqrQTMa3Fyfb7s-8&scaling=scale-down-width&content-scaling=fixed&starting-point-node-id=3552%3A17321&show-proto-sidebar=1&hide-ui=1" className="text-sky-700  hover:text-sky-900 hover:underline">laatste versie van het Figma prototype is hier te vinden</a>.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Ontwerp;
