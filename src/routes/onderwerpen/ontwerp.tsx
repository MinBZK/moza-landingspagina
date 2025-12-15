import { Container } from "../../components/layout/Container.tsx";
const Ontwerp = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">

          <ul className="breadcrumb flex">
            <li><a href="/" className="text-sky-700">Home</a></li>
            <li><a href="/onderwerpen" className="text-sky-700">Onderwerpen</a></li>
            <li>Ontwerp</li>
          </ul>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">Ontwerp</h1>
        </div>
      </div>
    </Container>
  );
};

export default Ontwerp;
