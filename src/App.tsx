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

function App() {
  return (
    <Router>
      <div className="rhc-theme moza-theme-overrides flex min-h-screen flex-col">
        <Header />
        <Navbar />
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
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="h-56 w-full bg-[#154273] p-4">
          <Container>
            <div className="px-4 pt-5">
              <span className="serif text-3xl text-white italic">
                Eén Overheid. Voor iedereen!
              </span>
            </div>
          </Container>
        </footer>
      </div>
    </Router>
  );
}

export default App;
