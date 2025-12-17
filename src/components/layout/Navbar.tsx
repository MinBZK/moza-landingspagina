import { useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "./Container.tsx";

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Actueel", href: "/actueel" },
  { label: "Onderwerpen", href: "/onderwerpen" },
  {
    label: "Documenten",
    href: "https://docs.mijnoverheidzakelijk.nl",
    external: true,
  },
  // { label: "Nieuws", href: "/nieuws" },
  {
    label: "GitHub",
    href: "https://github.com/MinBZK/MijnOverheidZakelijk",
    external: true,
  },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="flex min-h-[64px] w-full items-center bg-[#154273] text-white">
      <Container>
        <div className="px-4">
          <div className="flex items-center">
            <span className="text-xl hover:underline mt-4 mb-4">
              <Link to="/">Home</Link>
            </span>

            {/* Hamburger button - visible on xs and sm screens */}
            <button
              aria-expanded={isMenuOpen}
              className="ml-auto md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Desktop menu - hidden on xs and sm screens */}
            <ul className=" hidden w-fit text-xl md:flex">
              {NAV_ITEMS.map((item) => (
                <li key={item.label} className="ml-6 hover:underline">
                  <Link
                    {...(item.external
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    to={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile menu - visible when hamburger is clicked */}
          {isMenuOpen && (
            <div className="pb-4 md:hidden md:border-none">
              <ul className="flex flex-col text-xl">
                {NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      {...(item.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                      className="block py-2 hover:underline focus:underline"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>
    </nav>
  );
}
