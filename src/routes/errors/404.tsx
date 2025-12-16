import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-350px)] flex-col items-center justify-center bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="mx-auto max-w-max">
        <main className="sm:flex">
          <div className="sm:ml-6">
            <div className="sm:pl-6">
              <h1 className="flex gap-3 text-2xl font-bold text-slate-700 sm:text-2xl">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M23.3802 19.64L13.6702 2.47C12.9402 1.17 11.0702 1.17 10.3302 2.47L0.620204 19.64C-0.0997961 20.92 0.820204 22.5 2.2902 22.5H21.7202C23.1802 22.5 24.1002 20.92 23.3802 19.64Z" fill="#FFB612"/>
                 <path d="M10.5402 17.45C10.5402 17.01 10.6602 16.63 10.9002 16.33C11.1402 16.02 11.5002 15.87 11.9902 15.87C12.4702 15.87 12.8402 16.01 13.0902 16.27C13.3402 16.54 13.4702 16.93 13.4702 17.45C13.4702 17.88 13.3502 18.25 13.1102 18.54C12.8702 18.83 12.5102 18.98 12.0202 18.98C11.5402 18.98 11.1702 18.85 10.9202 18.59C10.6702 18.34 10.5402 17.96 10.5402 17.45ZM10.8502 7.17999L13.3302 6.97999L13.1102 12.49V15.12L10.8402 15.17V7.17999H10.8502Z" fill="black"/>
                </svg>
                404: Pagina niet gevonden
              </h1>
              <p className="mt-2 text-base text-gray-800">
                De pagina die u zoekt bestaat niet of is verplaatst.
              </p>
            </div>
            <div className="sm:pl-6">
              <p>
                <Link
                  to="/"
                  className="text-sky-700 hover:text-sky-900 no-underline hover:underline"
                >
                  Terug naar homepage
                </Link>
              </p>
              <p>
                <Link
                  to="/contact"
                  className="text-sky-700 hover:text-sky-900 no-underline hover:underline"
                >
                  Neem contact op
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
