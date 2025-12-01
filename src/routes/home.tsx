import { Hero } from "../components/ui/Hero.tsx";
import { Container } from "../components/layout/Container.tsx";
import { Card } from "../components/ui/Card.tsx";
import { HOME_CARDS } from "../constants/cards.ts";

export default function Home() {
  return (
    <>
      <Hero
        title="MijnOverheid Zakelijk"
        subtitle="Welkom bij het centrale punt voor alle overheidssystemen en digitale dienstverlening"
      />

      <Container>
        <div className="px-4">
          <div className="py-10 xl:w-2/3">
            <p className="text-2xl">
              MijnOverheid Zakelijk is het centrale portaal waar ondernemers en
              organisaties toegang krijgen tot digitale overheidsdiensten. Deze
              demo-omgeving laat zien hoe ondernemers straks eenvoudig kunnen
              communiceren met verschillende overheidsinstanties, documenten
              kunnen beheren en belangrijke zaken kunnen regelen voor hun
              bedrijf.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-2">
            <h2 className="mb-4 text-2xl font-bold">Onderwerpen</h2>
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
