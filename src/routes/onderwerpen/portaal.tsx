import { Container } from "../../components/layout/Container.tsx";
import { Link } from "react-router-dom";

const Portaal = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-6 sm:px-4 sm:py-10">
        <div className="w-full max-w-[768px]">
          <h1 className="text-4xl font-bold text-slate-700">Portaal</h1>
          <div className="prose max-w-none">
            <h2 className="mt-6 text-2xl text-slate-700">Over dit portaal</h2>
            <p>
              Welkom op het portaal voor onderwerpen. Hier vindt u een overzicht
              van belangrijke informatie en resources.
            </p>

            <h3 className="mt-4 text-xl text-slate-700">Belangrijke onderwerpen</h3>
            <ul className="mt-2">
              <li>Architectuur beslissingen</li>
              <li>Technische documentatie</li>
              <li>Project guidelines</li>
              <li>Best practices</li>
            </ul>

            <h3 className="mt-4 text-xl text-slate-700">Recent toegevoegd</h3>
            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-sm bg-white shadow-sm ring-1 ring-slate-200 p-4">
                <h4 className="text-lg font-bold text-slate-700">Architectuur Review Q1</h4>
                <p>Overzicht van technische keuzes en impact analyse.</p>
                <p className="text-sm text-gray-600 flex-auto content-end">
                  Toegevoegd op: 15-03-2024
                </p>
              </div>
              <div className="rounded-sm bg-white shadow-sm ring-1 ring-slate-200 p-4 flex flex-col">
                <h4 className="text-lg font-bold text-slate-700">Security Guidelines</h4>
                <p>Nieuwe security richtlijnen voor development.</p>
                <p className="text-sm text-gray-600 flex-auto content-end">
                  Toegevoegd op: 10-03-2024
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                Voor meer informatie kunt u terecht op
                <Link
                  to="https://www.rijksoverheid.nl"
                  className="text-sky-800 hover:text-sky-900 no-underline hover:underline ml-1"
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
