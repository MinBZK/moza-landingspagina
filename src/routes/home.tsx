import { Hero } from "../components/ui/Hero.tsx";
import { Container } from "../components/layout/Container.tsx";
import { Card } from "../components/ui/Card.tsx";
import { HOME_CARDS } from "../constants/cards.ts";

export default function Home() {
  return (
    <>
      <Hero
        title="MijnOverheid Zakelijk"
        subtitle="Een overheidsbrede samenwerking om de communicatie en interactie met bedrijven en organisaties te verbeteren."
      />
      
      <Container>
        <div className="pt-14 mb-10">
          <div className="xs:grid-cols-1 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_CARDS.map((card) => (
              <Card key={card.href} {...card} />
            ))}
          </div>
        </div>
      </Container>

      <div className="">
        <Container>
          <div className="">
            <div className="rounded-xs rounded-tr-4xl bg-[#d9ebf7] xs:w-full flex flex-col m-4 p-4 pb-3 mb-4 lg:w-2/3">
              <p className="">
                <svg className="mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.04 3.78C21.88 2.83 21.16 2.11 20.21 1.95C17.48 1.5 12.91 1.5 12 1.5C11.09 1.5 6.52 1.5 3.78 1.96C2.84 2.11 2.11 2.84 1.96 3.78C1.5 6.52 1.5 11.09 1.5 12C1.5 12.91 1.5 17.48 1.96 20.22C2.12 21.17 2.84 21.89 3.79 22.05C6.53 22.51 11.09 22.51 12.01 22.51C12.92 22.51 17.49 22.51 20.23 22.05C21.18 21.89 21.9 21.17 22.06 20.22C22.52 17.48 22.52 12.92 22.52 12C22.5 9.26 22.5 6.52 22.04 3.78Z" fill="#007BC7"/>
                  <path d="M10.71 6.93C10.71 6.59 10.82 6.3 11.04 6.05C11.26 5.8 11.58 5.67 11.99 5.67C12.4 5.67 12.71 5.79 12.93 6.03C13.15 6.27 13.26 6.57 13.26 6.93C13.26 7.25 13.15 7.54 12.93 7.79C12.71 8.04 12.39 8.16 11.99 8.16C11.58 8.16 11.27 8.04 11.04 7.81C10.82 7.57 10.71 7.28 10.71 6.93ZM13.11 9.32V18.28H10.9V9.41L13.11 9.32Z" fill="white"/>
                </svg> MijnOverheid Zakelijk is in ontwikkeling. We werken hier samen aan met diverse overheidsorganisaties en eindgebruikers.
              </p>
              <p className="">
                Heb je vragen of mis je informatie? <a href="/contact" className="text-sky-700  hover:text-sky-900 hover:underline">Kijk dan op onze contactpagina</a> en kom met ons in contact.
              </p>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
