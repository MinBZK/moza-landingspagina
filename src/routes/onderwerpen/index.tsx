import { Container } from "../../components/layout/Container.tsx";
import { HOME_CARDS } from "../../constants/cards.ts";
import { Card } from "../../components/ui/Card.tsx";

const OnderwerpenLijst = () => {
  return (
    <Container className="min-h-80 py-4 *:px-4 md:px-0">
      <h1 className="mt-3 text-2xl font-semibold text-slate-700">
        Onderwerpen
      </h1>

      <div className="mb-10 pt-14">
        <div className="xs:grid-cols-1 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_CARDS.map((card) => (
            <Card key={card.href} {...card} />
          ))}
        </div>
      </div>
    </Container>
  );
};

export default OnderwerpenLijst;
