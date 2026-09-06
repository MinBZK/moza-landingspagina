---
title: Bijdragen aan handboek
description: Hoe je bijdraagt aan dit MOZa handboek.
weight: 10
---

Dit handboek is er voor het hele team. Iedereen kan bijdragen door content aan te passen, pagina's toe te voegen of verbeteringen voor te stellen.

## Waarom bijdragen

Door bij te dragen aan het handboek help je:
- Het handboek actueel en correct te houden
- Nieuwe teamleden sneller op weg te helpen
- Kennis te delen met het hele team
- De documentatie te verbeteren

## Hoe bij te dragen

Het handboek staat in de [Git repository op GitHub](https://github.com/minbzk/moza-site). Je kunt wijzigingen voorstellen via een [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests).

### Suggestie indienen zonder code

Je kunt een [issue aanmaken](https://github.com/minbzk/moza-site/issues/new) met je suggestie, dan zal iemand anders het oppakken.

### Eenvoudig: direct editen op GitHub

De snelste manier om een wijziging door te voeren:

1. **Ga naar de pagina** - Navigeer naar het bestand op [GitHub](https://github.com/minbzk/moza-site/tree/main/content/handboek)
2. **Klik op "Edit this file"** - De knop heet "Edit this file" en heeft een potlood als icoon, rechtsboven het bestand
3. **Bewerk de tekst** - Pas de markdown aan
4. **Commit wijziging** - Vul een beschrijving in en klik op "Propose changes"
5. **Maak pull request** - GitHub maakt automatisch een pull request aan

### Gevorderd: via lokale clone

Voor grotere wijzigingen of als je lokaal wilt testen:

1. **Clone de repository** - Haal de code op naar je lokale machine
2. **Maak een branch** - Maak een nieuwe branch voor je wijziging
3. **Bewerk de content** - Pas markdown bestanden aan in `content/handboek/`
4. **Test lokaal** - Draai `just up` om je wijziging te zien
5. **Commit je wijziging** - Leg je wijziging vast met een duidelijke commit message
6. **Push naar GitHub** - Upload je branch naar GitHub
7. **Maak een pull request** - Vraag je wijziging te reviewen

## Schrijfrichtlijnen

### Taal en stijl

- **Nederlands** - Alle content is in het Nederlands
- **B1-niveau** - Houd de taal eenvoudig en toegankelijk
- **Korte zinnen** - Max 15-20 woorden per zin
- **Actieve zinnen** - "We doen" in plaats van "wordt gedaan"
- **Informeel maar respectvol** - Spreek de lezer aan met "je"

### Structuur

- **Duidelijke koppen** - Gebruik H2 (##) en H3 (###) voor structuur
- **Korte alinea's** - Max 3-4 zinnen per alinea
- **Opsommingen** - Gebruik lists voor overzichten
- **Links** - Verwijs naar relevante bronnen

### Front matter

Elke pagina heeft YAML front matter met:
- **title** - De titel van de pagina
- **description** - Korte beschrijving (max 160 tekens)

Voorbeeld:
```yaml
---
title: Mijn pagina
description: Korte beschrijving van deze pagina.
---
```

## Reviews

Alle wijzigingen worden gereviewd voordat ze live gaan. Dit zorgt ervoor dat:

- De content klopt
- De taal en stijl consistent is
- Er geen fouten in zitten
- Links werken

Je kunt ook helpen door pull requests van anderen te reviewen.

## Wat kun je bijdragen

### Correcties

- Tikfouten of taalfouten herstellen
- Verouderde informatie bijwerken
- Dode links vervangen

### Verbeteringen

- Onduidelijke tekst verduidelijken
- Ontbrekende informatie aanvullen
- Voorbeelden toevoegen

### Nieuwe pagina's

- Nieuwe onderwerpen toevoegen
- FAQ's schrijven
- Tutorials of how-to's maken

## Niet zeker of het goed is?

Doe gerust een voorstel door ons een opzet te sturen, of maak een pull request. Ook als je niet zeker bent of het klopt. Dat is waar reviews voor zijn. Liever een imperfecte bijdrage dan helemaal geen bijdrage.

Als je twijfelt, vraag het eerst in [Mattermost](../../jouw-start/accounts-en-tools/#mattermost). We denken graag mee.

## Vragen?

Vragen over hoe je kunt bijdragen aan het handboek? Vraag het in [Mattermost](../../jouw-start/accounts-en-tools/#mattermost) of [zoek contact](../../contact) met ons.
