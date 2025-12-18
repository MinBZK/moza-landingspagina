import { Container } from "../components/layout/Container.tsx";
import { Link } from "react-router-dom";
const Toegankelijkheid = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            Toegankelijkheid
          </h1>
          <p className="text-slate-800">
            Wij vinden het belangrijk dat onze website voor iedereen goed te
            gebruiken is.
          </p>
          <p className="text-slate-800">
            Mocht je problemen ondervinden bij het gebruik van onze website of
            suggesties hebben voor verbeteringen,{" "}
            <Link
              to="/contact"
              className="text-sky-700 hover:text-sky-900 hover:underline"
            >
              neem dan contact met ons op
            </Link>
            . Wij werken continu aan het verbeteren van de toegankelijkheid van
            onze site.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default Toegankelijkheid;
