import { Container } from "../components/layout/Container.tsx";

const Contact = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-6 sm:px-4 sm:py-10">
        <div className="w-full max-w-[768px]">
          <h1 className="mb-6 text-4xl font-bold text-slate-700">Contact</h1>

          <div>
            <p className="mb-4 text-lg">
              MijnOverheid Zakelijk is een programma van Logius (in opdracht van
              het ministerie van Binnenlandse Zaken en Koninkrijksrelaties) en
              werkt samen met:
            </p>

             <ul className="list-disc space-y-2 pl-6 mb-2 text-lg text-slate-700">
              <li>de Belastingdienst</li>
              <li>douane</li>
              <li>KVK</li>
              <li>RDW</li>
              <li>Rijks ICT Gilde</li>
              <li>gemeente Rotterdam</li>
              <li>ministerie van Economische Zaken</li>
              <li>RVO</li>
              <li>UWV</li>
              <li>VNG</li>
            </ul>

            <p className="mb-4 text-lg">
              Je kunt het programmateam bereiken via <a
                href="mailto:contact@mijnoverheid-zakelijk.nl"
                className="text-sky-800 hover:text-sky-900 hover:underline"
              >
                contact@mijnoverheid-zakelijk.nl
              </a>.
            </p>

          </div>
        </div>
      </div>
    </Container>
  );
};

export default Contact;
