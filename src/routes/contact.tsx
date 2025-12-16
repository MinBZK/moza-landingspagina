import { Container } from "../components/layout/Container.tsx";

const Contact = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Contact
          </h1>
          <div>
            <p className="mb-4 text-slate-800">
              MijnOverheid Zakelijk is een programma van Logius (in opdracht van
              het ministerie van Binnenlandse Zaken en Koninkrijksrelaties) en
              werkt samen met:
            </p>

             <ul className="list-disc space-y-2 pl-6 mb-4 text-slate-800">
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

            <p className="mb-4 text-slate-800">
              Je kunt het programmateam bereiken via <a
                href="mailto:contact@mijnoverheid-zakelijk.nl"
                className="text-sky-700 hover:text-sky-900 hover:underline"
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
