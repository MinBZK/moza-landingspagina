import "@rijkshuisstijl-community/design-tokens/dist/index.css";
import "@rijkshuisstijl-community/components-css/dist/index.css";
import "./styles/index.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Actueel from "./routes/actueel";
import Detail from "./routes/actueel/[type]/[slug].tsx";
import OnderwerpenLijst from "./routes/onderwerpen";
import Profielservice from "./routes/onderwerpen/profielservice.tsx";
import Portaal from "./routes/onderwerpen/portaal.tsx";
import Home from "./routes/home.tsx";
import { Header } from "./components/layout/Header.tsx";
import { Navbar } from "./components/layout/Navbar.tsx";
import Contact from "./routes/contact.tsx";
import NotFound from "./routes/errors/404.tsx";
import { Container } from "./components/layout/Container.tsx";
import Presentaties from "./routes/actueel/presentaties/[slug].tsx";
import OpenWerken from "./routes/onderwerpen/openwerken.tsx";
import Documentatie from "./routes/onderwerpen/documentatie.tsx";
import Ontwerp from "./routes/onderwerpen/ontwerp.tsx";
import Breadcrumb from "./components/layout/Breadcrumb.tsx";

function App() {
  return (
    <Router>
      <div className="rhc-theme moza-theme-overrides flex min-h-screen flex-col">
        <Header />
        <Navbar />
        <Breadcrumb />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/actueel" element={<Actueel />} />
            <Route
              path="/actueel/presentaties/:name"
              element={<Presentaties />}
            />
            <Route path="/actueel/:type/:name" element={<Detail />} />
            <Route path="/onderwerpen" element={<OnderwerpenLijst />} />
            <Route
              path="/onderwerpen/profielservice"
              element={<Profielservice />}
            />
            <Route path="/onderwerpen/portaal" element={<Portaal />} />
            <Route path="/onderwerpen/openwerken" element={<OpenWerken />} />
            <Route
              path="/onderwerpen/documentatie"
              element={<Documentatie />}
            />
            <Route path="/onderwerpen/ontwerp" element={<Ontwerp />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="h-auto w-full bg-[#154273] p-4 pb-8">
          <Container>
            <div className="flex justify-between px-4 pt-5">
              <span className="serif text-2xl text-white italic">
                Eén Overheid. Voor iedereen!
              </span>
              <div className="flex gap-16">
                <dl className="text-white">
                  <dt className="text-2xl mb-2">Service</dt>
                  <dd>
                    <ul className="text-lg">
                      <li><a href="/contact">Contact</a></li>
                      <li><a href="https://docs.mijnoverheidzakelijk.nl" rel="external">Documentatie</a></li>
                      <li><a href="https://github.com/MinBZK/MijnOverheidZakelijk" rel="external">GitHub</a></li>
                      <li><a href="#">Sitemap</a></li>
                    </ul>
                  </dd>
                </dl>
                <dl className="text-white">
                  <dt className="text-2xl mb-2">Over deze site</dt>
                  <dd>
                    <ul className="text-lg">
                      <li><a href="#">Copyright</a></li>
                      <li><a href="#">Privacy</a></li>
                      <li><a href="#">Cookies</a></li>
                      <li><a href="#">Toegankelijkheid</a></li>
                      <li><a href="#">Kwetsbaarheid melden</a></li>
                    </ul>
                  </dd>
                </dl>
              </div>
            </div>
          </Container>
        </footer>
      </div>
    </Router>
  );
}

export default App;
