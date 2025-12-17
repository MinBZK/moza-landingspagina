---
title: MOZa Weekly 13 oktober
summary: Weekly update over MOZa ontwikkelingen - Eerste Pulse gehouden, GitHub project boards live, samenwerking met OBIS/MijnServices gestart, DigiD login + KvK API geïmplementeerd in proeftuin, en gebruikersonderzoeken worden voorbereid.
date: 13-10-2025
---

## Algemeen

1. Deze week hadden we de eerste Pulse. Dit heeft bij diverse deelnemers gedachtes geactiveerd welke met ons zijn gedeeld. Dit is erg waardevol, dus dank voor het delen. Gedeeltelijk is dit al opgevolgd. O.a. zijn de eerste afspraken al gemaakt.
2. Dianne is gestart in de rol van communicatie adviseur. Het inwerken is begonnen, en daarnaast wordt er gewerkt aan een MOZa pitch. We willen graag kort en krachtig uitleggen waar we voor staan.
3. De taken waar we aan werken, zijn vanaf nu te volgen op ons [GitHub project board](https://github.com/orgs/MinBZK/projects/40/). Er staat een UX, Developer en Research board. Het begin is er en we gaan het nog verbeteren. Zo gaan we bijvoorbeeld deze taken koppelen aan de prioriteiten van fase 2.
4. De MOZa code repositories worden overgezet naar GitHub, zodat ze daar publiek beschikbaar zijn. Hiervoor is er nu ook een [topic mijnoverheidzakelijk](https://github.com/search?q=topic:mijnoverheidzakelijk+&type=repositories) op GitHub waarop je ze kan vinden.
5. De actie om een gezamenlijke concept roadmap op te stellen is gestart. Er is een vragenlijst opgesteld die we deze week gaan versturen naar het regieteam. In het volgende overleg op 6 november leggen we de beelden bij elkaar.

## Afronden open eindes fase 1

1. De rapportage van het gebruikersonderzoek uit fase 1 staat op [de samenwerkruimte](https://www.samenwerkruimten.nl/teamsites/programma%20mijnoverheid%20voor%20ondernemers/Gedeelde%20%20documenten/MOZa%20Notificatie%20service/UX/Rapportage%20usability%20onderzoek%20inzichten%20MOZa%20(gesprekken%20met%20MKB'ers)_augustus%202025_UX%20Research.pdf). We kijken ook hoe we dit onderzoek kunnen delen via bijv. [gebruikersonderzoeken.nl](https://gebruikersonderzoeken.nl/).
2. We hebben gezeten over hoe we het onderzoek rondom Notificatie Templates af kunnen ronden. We gaan iedereen even opbellen en daarna de ontvangen input verwerken in een eerste versie.
3. Onze [documentatie over MOZa](https://www.mijnoverheidzakelijk.nl/) wordt geherstructureerd. O.a. zodat we het gaan beschrijven vanuit de verschillende services. Het doel is dat de documentatie beter te volgen wordt.

## Profiel service + componenten uitwerken

1. De samenwerking met OBIS/MijnServices wordt actief opgezocht. Naast het wekelijks overleg met de programmamanager, hebben we afgelopen week ook gesproken met de architect t.b.v. profiel service, contactherstel service, BBO, Mijn Zaken/Taken/etc. Technische specificaties worden met ons gedeeld.
2. In de proeftuin kan men nu inloggen met DigiD, waarna we via de KvK API de op jouw naam gekoppelde bedrijven ophalen.
3. De gebruikersonderzoeken die voor deze fase gepland staan, die worden voorbereid. O.a. worden er prototype schermen voor het onderzoek uitgewerkt.
4. Het aansluiten op NL Design System (NLDS) en Rijkshuisstijl Community (RHC) lukt voor deze onderzoeksronde nog niet. Er zijn momenteel veel ontwikkelingen rondom NLDS. Hoewel de intentie van NLDS goed zijn, is de gebruikerservaring nu nog niet optimaal. We zijn actief op zoek naar hoe we dit met de communities kunnen verbeteren:
    1. We doen actief mee op Code for NL, waar ook de NL Design System community zit.
    2. We haken aan op de sprint planning events van Rijkshuisstijl Community.
    3. Het Logius design systeem LUX  wordt gemigreerd naar het design system van Rijkshuisstijl Community. Op dinsdag werken we samen met dit team.
5. In de profiel service hebben we nu een eerste implementatie van [Logboek Dataverwerking](https://logius-standaarden.github.io/logboek-dataverwerkingen/) & Event Sourcing gerealiseerd. Dit draagt bij aan transparantie en reproduceerbaarheid. Voor de Event Sourcing zijn we ook in gesprek met [Uit betrouwbare bron](https://website-digilab-overheid-nl-research-uit-betrouw-e1f39021ce924c.gitlab.io/).
6. We zijn gestart met het beter beschrijven van de profiel service. Het laatste concept kun je vinden op [GitHub](https://github.com/MinBZK/MijnOverheidZakelijk/blob/main/Docs/structurizr/profielservicedocs/01-context.md).
7. Worth / VNG heeft een nieuwe e-mail verificatie service (VS) ontwikkeld. Wij maken hier in de proeftuin nu gebruik van. Ook hebben we feedback gegeven om een en ander te verbeteren.

## Verkenning Bedrijfsgegevens

1. Tijdens de aanname sessie voor het gebruikersonderzoek zijn de eerste ideeën besproken. Dit wordt verwerkt in een prototype en meegenomen in het onderzoek.

## Verkenning notificaties over relevante ontwikkelingen

1. Wekelijks is er een overlegmoment met [RegelRecht](https://minbzk.github.io/regelrecht/). We verkennen hoe we dit op een logische en efficiënte manier voor elkaar kunnen krijgen.

---

## Agenda

- **MOZa Pulse**: 21 oktober
- **Gebruikersonderzoeken**: 29 & 30 oktober
- **Logius Roadshow**: 30 oktober
- **Regieteam overleg**: 6 november
- **Stuurgroep**: 7 november (wordt als het goed is verplaatst)
- **[ECP Jaarfestival 2025](https://ecp.nl/ecp-jaarfestival/) - Bewust digitaal!**: donderdag 20 november
- **[Common Ground Fieldlab](https://commonground.nl/events/view/f6376a29-cfdd-47c0-ae8c-e08ea60ca0d7/common-ground-fieldlab-10-11-november-2025)**: 10 & 11 november 2025
- **[Fieldlab Digilab](https://fieldlab.bzlg.apps.digilab.network/) - Bestaanszekerheid bij Levensgebeurtenissen**: 24, 25 & 26 november (MOZa aanwezig)
