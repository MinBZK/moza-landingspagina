import { Container } from "../components/layout/Container.tsx";
const Privacy = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Privacy verklaring
          </h1>
          <p className="text-slate-800">
            Wij hechten veel waarde aan jouw privacy. MijnOverheid Zakelijk
            verzamelt geen persoonlijke gegevens, en we gebruiken geen cookies
            of andere trackingtools om jouw gedrag te volgen.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Privacy;
