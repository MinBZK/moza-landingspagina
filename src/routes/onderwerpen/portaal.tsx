import { Container } from "../../components/layout/Container.tsx";
import { Link } from "react-router-dom";

const Portaal = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-6 sm:px-4 sm:py-10">
        <div className="w-full max-w-[768px]">
          <h1 className="text-4xl font-bold">Portaal</h1>
          <div className="prose max-w-none">
            <h2 className="mt-6 text-2xl">Over dit portaal</h2>
            <p>
              Welkom op het portaal voor onderwerpen. Hier vindt u een overzicht
              van belangrijke informatie en resources.
            </p>

            <h3 className="mt-4 text-xl">Belangrijke onderwerpen</h3>
            <ul className="mt-2">
              <li>Architectuur beslissingen</li>
              <li>Technische documentatie</li>
              <li>Project guidelines</li>
              <li>Best practices</li>
            </ul>

            <h3 className="mt-4 text-xl">Recent toegevoegd</h3>
            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded border p-4">
                <h4 className="font-bold">Architectuur Review Q1</h4>
                <p>Overzicht van technische keuzes en impact analyse.</p>
                <p className="text-sm text-gray-600">
                  Toegevoegd op: 15-03-2024
                </p>
              </div>
              <div className="rounded border p-4">
                <h4 className="font-bold">Security Guidelines</h4>
                <p>Nieuwe security richtlijnen voor development.</p>
                <p className="text-sm text-gray-600">
                  Toegevoegd op: 10-03-2024
                </p>
              </div>
            </div>

            <div className="mt-8 border-t pt-4">
              <p className="text-sm text-gray-600">
                Voor meer informatie kunt u terecht op
                <Link
                  to="https://www.rijksoverheid.nl"
                  className="text-blue-800 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rijksoverheid.nl
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Portaal;
