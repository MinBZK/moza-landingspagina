import { Container } from "../../components/layout/Container.tsx";
const Over = () => {
  return (
    <Container>
      <div className="mx-auto flex px-2 py-8 sm:px-4 sm:py-6">
        <div className="flex w-full flex-col gap-2 lg:w-2/3">

          <h1 className="mt-0 mb-4 text-2xl font-semibold text-slate-700">
            MijnOverheid Zakelijk: Overzicht in wat er speelt
          </h1>

          <blockquote>
            <p className="text-slate-800">Ik zie door de bomen het bos niet meer. Geef mij een overzicht van wat ik moet doen en waar ik moet zijn. Ik heb geen tijd om dingen uit te zoeken.</p>
          </blockquote>

          <blockquote>
            <p className="text-slate-800">Vervelend, overal weer inloggen, of andere drempels en geen uniforme aanpak.</p>
          </blockquote>

          <blockquote>
            <p className="text-slate-800">Steeds opnieuw vragen om dezelfde gegevens is bizar en nutteloos. Dingen kunnen veel eenvoudiger.</p>
          </blockquote>

          <p className="my-8 text-lg font-semibold text-slate-800">
            MijnOverheid Zakelijk: alle informatie over je overheidszaken overzichtelijk bij elkaar en een seintje als je daarvoor iets moet doen.
          </p>

          <h2 className="mt-8 mb-1 text-xl text-slate-700">Alle informatie overzichtelijk bij elkaar</h2>
          <p className="mb-4 text-slate-800">
            Bedrijven en organisaties krijgen nu informatie van tientallen overheden — vaak versnipperd en onoverzichtelijk. Uit onderzoek weten we dat zij behoefte hebben aan een overheidsbrede aanpak waarin informatie en dienstverlening op een uniforme en toegankelijke wijze worden aangeboden, ongeacht via welk kanaal of bij welke organisatie iemand aanklopt.
          </p>
          <p className="mb-4 text-slate-800">
            MijnOverheid Zakelijk zorgt daarvoor. Deze digitale omgeving brengt alle informatie over overheidszaken <strong>overzichtelijk bij elkaar</strong>. En zorgt dat deze <strong>op dezelfde manier gepersonaliseerd aangeboden</strong> wordt. Denk aan taken, aanvragen of relevante wet- en regelgeving. Het werkt net als MijnOverheid, maar dan speciaal voor zakelijke gebruikers. Zo worden zij steeds goed geïnformeerd en weten ze waar ze aan toe zijn. 
          </p>

          <h2 className="mb-1 text-xl text-slate-700">MijnOverheid Zakelijk Services</h2>
          <p className="mb-4 text-slate-800">
            MijnOverheid Zakelijk bestaat uit verschillende digitale bouwstenen voor communicatie en regelzaken, die we <strong>services</strong> noemen. Deze worden aangeboden in een <strong>presentatielaag</strong> (gebruikersinterface). Daarin kunnen zakelijke gebruikers straks zelf hun voorkeuren instellen, bijvoorbeeld welke informatie zij digitaal willen ontvangen. De services kunnen ook gebruikt worden door <strong>overheden</strong> in hun eigen dienstverlening.
          </p>
          <p className="mb-4 text-slate-800">
            Sommige services bestaan al en worden hergebruikt voor MijnOverheid Zakelijk. Andere worden nieuw ontwikkeld. Dat doen we <strong>in samenwerking met de eindgebruikers</strong>, zodat deze digitale omgeving echt voor hen gaat werken. 
          </p>
          <p className="mb-4 text-slate-800">
            Overheidsorganisaties die samenwerken aan MijnOverheid Zakelijk zijn:
          </p>
          <ul className="list-disc space-y-2 pl-6 mb-4 text-slate-800">
            <li>de Belastingdienst</li>
            <li>douane</li>
            <li>KVK</li>
            <li>Logius</li>
            <li>Rijks ICT Gilde</li>
            <li>gemeente Rotterdam</li>
            <li>RVO</li>
            <li>ministerie van Binnenlandse Zaken en Koninkrijksrelaties</li>
            <li>ministerie van Economische Zaken</li>
            <li>UWV</li>
            <li>VNG</li>
          </ul>
          <p className="mb-4 text-slate-800">
            In <strong>2026</strong> worden de eerste services ontwikkeld en aangeboden als minimal viable product (MVP). Het gaat dan om:
          </p>
          <ul className="list-disc space-y-2 pl-6 mb-4 text-slate-800">
            <li><b>Profielservice</b>: op één plek je bedrijfsgegevens en contactvoorkeuren invoeren en bijhouden. Andere overheden kunnen deze gegevens waar nodig eenvoudig hergebruiken. Uiteraard alleen met toestemming van de ondernemer of op basis van een wettelijke grondslag.
</li>
            <li><b>Notificatieservice</b>: automatisch een seintje als je als ondernemer iets moet doen.</li>
            <li><b>Actuele onderwerpen</b>.</li>
          </ul>

          <h2 className="mb-1 text-xl text-slate-700">Toekomstperspectief</h2>
          <blockquote>
            <p className="text-slate-800">
              Een horecaondernemer die een terrasvergunning wil vernieuwen, ziet straks in het portaal direct welke documenten nodig zijn, krijgt automatisch een reminder voor deadlines en kan de status live volgen.
            </p>
          </blockquote>
          <blockquote>
            <p className="text-slate-800">
              Een horecaondernemer die in MijnOverheid Zakelijk heeft aangegeven interesse te hebben in subsidies, krijgt straks in zijn mailbox een seintje dat er informatie voor hem klaarstaat over een relevante subsidie. Hij logt in en besluit na het lezen van de informatie een aanvraag te starten. Zijn persoonlijke gegevens worden automatisch ingevuld en kan hij aanvullen waar nodig. Hij vult de aanvraag verder in en kan na indiening de voortgang eenvoudig blijven volgen. Als er een vervolgactie nodig is, dan krijgt hij een seintje en ziet de taken die hij moet vervullen.
            </p>
          </blockquote>
          <p className="text-slate-800">
            Na oplevering van het MVP bouwen we verder aan nieuwe services, met steeds meer handige functionaliteiten. Zoals de Berichtenservice: een digitale brievenbus voor post van de overheid. We maken prototypes en toetsen deze aan de behoeften van de eindgebruikers. We werken vanuit een gezamenlijke implementatiestrategie zodat de ontwikkeling en uitrol van functionaliteiten ook passend is voor de betrokken overheidsorganisaties. Daarbij hanteren we altijd de volgende principes:
          </p>
          <ul className="list-disc space-y-2 pl-6 mb-4 text-slate-800">
            <li><strong>Federatief</strong>: de <strong>informatie blijft bij de bron</strong>, daar waar het thuishoort, maar we kunnen deze in verschillende digitale digitale portalen en systemen tonen.</li>
            <li><strong>Event-gedreven architectuur</strong>: ondernemers krijgen een seintje zodra er iets relevants voor hun is, waarbij ze zelf aan kunnen geven (<strong>voorkeurensysteem</strong>) hoe, waar en wanneer ze geïnformeerd willen worden.
</li>
            <li><strong>Transparant</strong>: ondernemers hebben de <strong>controle</strong> over wie wat mag inzien en kunnen zien wanneer dat is gebeurd.</li>
          </ul>

          <h2 className="mb-1 text-xl text-slate-700">Minder administratieve lasten voor ondernemers én overheden</h2>
          <p className="text-slate-800">
            Met MijnOverheid Zakelijk zetten we een grote stap richting een uniforme en toegankelijke overheid, die onderling beter samenwerkt. Daarmee verminderen we niet alleen de administratieve lasten voor ondernemers, maar ook voor betrokken overheden. Hoe werkt dat precies? 
          </p>
          <ul className="list-disc space-y-2 pl-6 mb-4 text-slate-800">
            <li><strong>Minder tijd kwijt aan gegevensbeheer</strong>: gegevens van bedrijven worden bij de bron opgehaald en op één plek beheerd. Ze kunnen daardoor waar nodig (met toestemming van de ondernemer) eenvoudig hergebruikt worden door andere overheden.</li>
            <li><strong>Minder (herhaal)vragen, minder herstel</strong>: ondernemers ontvangen in MijnOverheid Zakelijk tijdig meldingen over acties die ze moeten ondernemen. Dat kan fouten en achterstanden helpen voorkomen en de druk op klantcontactcentra bij de overheid verlagen.</li>
            <li><strong>Minder zelf ontwikkelen</strong>: voor MijnOverheid Zakelijk maken betrokken overheden gebruik van gezamenlijke services, daardoor hoef je als organisatie zelf minder te ontwikkelen. De services voldoen bovendien aan wet- en regelgeving, zoals de wet modernisering elektronisch bestuurlijk verkeer.</li>
          </ul>

          <h2 className="mb-1 text-xl text-slate-700">Doe mee!</h2>
          <p className="text-slate-800">
            We nodigen je uit om als partner aan te sluiten bij de ontwikkeling van MijnOverheid Zakelijk. Samen werken we aan de één-overheidsbeleving. Samen realiseren we publieke dienstverlening die aansluit bij de behoeften en verwachtingen van onze eindgebruikers.
          </p>

        </div>
      </div>
    </Container>
  );
};

export default Over;
