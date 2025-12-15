import { Hero } from "../components/ui/Hero.tsx";
import { Container } from "../components/layout/Container.tsx";
import { Card } from "../components/ui/Card.tsx";
import { HOME_CARDS } from "../constants/cards.ts";

export default function Home() {
  return (
    <>
      <Hero
        title="MijnOverheid Zakelijk"
        subtitle="Overzicht in wat er speelt"
      />
      <div className="">
        <Container>
          <div className="px-4">
            <div className="flex w-2/3 flex-col gap-4 py-10 text-xl">
              <p className="font-bold">
                Via MijnOverheid Zakelijk kunnen ondernemers in de toekomst
                eenvoudig zakendoen met de overheid. Nu krijgen zij nog
                informatie van tientallen overheidsorganisaties — vaak
                versnipperd en onoverzichtelijk. MijnOverheid Zakelijk verandert
                dat. Straks kunnen ondernemers op een eenduidige manier zaken
                regelen, inzien of informatie daarover ontvangen.
              </p>
              <p className="">
                MijnOverheid Zakelijk is in ontwikkeling. Via deze website laten
                we zien wat we ontwikkelen en hoe we dat doen. We werken samen
                met diverse overheidsorganisaties en vragen regelmatig om
                feedback aan onze eindgebruikers. Heb je vragen of mis je
                informatie? Neem dan contact op met:
                vragen@mijnoverheidzakelijk.nl
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="mt-4">
        <div className="px-4">
          <div className="">
            <h2 className="mb-4 text-2xl font-bold text-slate-700">
              Onderwerpen
            </h2>
          </div>
          <div className="xs:grid-cols-1 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_CARDS.map((card) => (
              <Card key={card.href} {...card} />
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
