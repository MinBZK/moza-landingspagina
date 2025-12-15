import { Container } from "../../components/layout/Container.tsx";
const Ontwerp = () => {
  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-8 sm:px-4 sm:py-12">
        <div className="flex w-full max-w-[768px] flex-col gap-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800">Ontwerp</h1>
        </div>
      </div>
    </Container>
  );
};

export default Ontwerp;
