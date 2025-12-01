import { Container } from "../../components/layout/Container.tsx";
import { HOME_CARDS } from "../../constants/cards.ts";
import { Link } from "react-router-dom";
import type { HomeCard } from "../../types/card.ts";

const OnderwerpenLijst = () => {
  return (
    <Container className="min-h-80 py-4 *:px-4 md:px-0">
      <h1 className="mb-4 text-2xl font-semibold text-blue-900 underline">
        Alle onderwerpen binnen MijnOverheid Zakelijk
      </h1>

      <ul className="space-y-1 text-sky-900">
        {HOME_CARDS.map((card) => (
          <ListItem key={card.title} card={card} />
        ))}
      </ul>
    </Container>
  );
};

const ListItem = ({ card }: { card: HomeCard }) => {
  return (
    <li className="flex gap-2">
      <span className="text-sky-700">&rsaquo;</span>
      <Link className="text-base hover:underline" to={card.href}>
        {card.title}
      </Link>
    </li>
  );
};
export default OnderwerpenLijst;
