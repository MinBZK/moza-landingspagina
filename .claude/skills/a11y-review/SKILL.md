---
name: a11y-review
description: Controleer toegankelijkheid conform WCAG 2.1 AA. Gebruik bij het reviewen van templates, CSS of HTML, of wanneer de gebruiker vraagt om toegankelijkheid te checken.
---

Controleer templates, CSS en content op WCAG 2.1 niveau AA.

Draai eerst `just a11y` (pa11y-ci met HTML_CodeSniffer en axe-core, plus eigen
controles op koppenvolgorde en diagram-alt). Dat dekt ongeveer een derde van de
succescriteria; de checklist hieronder gaat over de rest. De `.odt`- en
`.pdf`-downloads vallen erbuiten: die bestaan pas na `just build`.

## Checklist

### HTML/Templates
- Semantische elementen (nav, main, article, aside)
- Correcte koppenhiërarchie
- ARIA-labels waar nodig, en niet overbodig
- Skip links aanwezig
- Taalattribuut op `html`, en op anderstalige fragmenten

### Interactie
- Focus states zichtbaar
- Toetsenbordnavigatie mogelijk, geen keyboard trap
- Touch targets minimaal 44x44px

### Visueel
- Contrast minimaal 4,5:1 (tekst) en 3:1 (grote tekst, focusranden, iconen)
- Informatie niet alleen via kleur
- Leesbaar bij 200% zoom en op 320px breed

### Media
- Alt-teksten beschrijvend, niet "afbeelding van..."
- Geen tekst als afbeelding. Een schermafdruk van een slide of document zakt op
  1.4.5: neem de tekst als tekst op. Diagrammen, foto's en logo's mogen wel
- Captions bij video's
- Geen autoplay met geluid

## Presentaties

Reveal.js zet alle slides behalve de huidige op `aria-hidden`, dus pa11y toetst
er feitelijk één. De eigen controles lezen de HTML-bron en dekken wel alle
slides, en `presentaties.js` toetst het gedrag: sluitknop, pijltjesnavigatie,
aankondiging van een slidewissel, en of de focus de presentatie weer verlaat.
Scan niet met `?print-pdf`: die modus rendert alles maar laat `aria-hidden`
staan, wat meldingen oplevert die alleen in die modus bestaan.

Handmatig blijft: contrast meten (axe kan het hier niet berekenen door reveal's
transforms) en beoordelen of de aankondiging ook begrijpelijk klinkt. Noteer
gemeten verhoudingen, zodat een volgende toets ze niet opnieuw hoeft vast te
stellen.

## Downloads

De `.odt`- en `.pdf`-bestanden bestaan pas na `npm run render-downloads <map>`.

**PDF.** `just pdfua` toetst ze tegen PDF/UA met veraPDF (`brew install
verapdf`) en eist nul fouten. De PDF's claimen PDF/UA in hun metadata, dus een
melding is een echte fout en niet iets om weg te strepen.

Chromium levert de tagstructuur maar niet alles wat PDF/UA eist;
`scripts/downloads/pdf-metadata.js` vult in een incrementele update aan wat
ontbreekt: een RoleMap voor `Strong` en `Em`, een beschrijving bij elke
linkannotatie, een `LBody` in elk lijstitem, en de kop en staart van elke
pagina als artefact. Print-CSS laat het externe-linkicoon weg, omdat een
CSS-masker in de PDF een tweemaal aangeroepen transparantiegroep wordt.

**ODF.** Er is geen validator. Een ODT is een zip, dus controleer de XML zelf:

```bash
python3 -c "
import zipfile, re
z = zipfile.ZipFile('pad/naar.odt')
meta, inhoud, stijlen = (z.read(n).decode() for n in ['meta.xml','content.xml','styles.xml'])
print('titel:', re.findall(r'<dc:title>(.*?)</dc:title>', meta))
print('taal:', re.findall(r'<dc:language>(.*?)</dc:language>', meta),
      sorted(set(re.findall(r'fo:language=\"(\w+)\"', stijlen))))
print('koppen:', {n: inhoud.count(f'text:outline-level=\"{n}\"') for n in '123456'})
print('tabellen:', inhoud.count('<table:table '), 'met koprij:', inhoud.count('<table:table-header-rows>'))
print('afbeeldingen:', inhoud.count('<draw:frame'), 'met beschrijving:', inhoud.count('<svg:desc>'))
"
```

Wat je wilt zien: een gevulde `dc:title` (2.4.2), taal `nl` in zowel `meta.xml`
als `styles.xml` (3.1.1), koppen die op niveau 1 beginnen en niet springen
(1.3.1), evenveel tabelkoppen als tabellen, en een `svg:desc` bij elke
`draw:frame` (1.1.1). De taal komt uit `--metadata lang=nl` in de pandoc-aanroep;
zonder dat erft het document het Engels uit `reference.odt`.

Alle downloads komen uit dezelfde generator, dus één document controleren dekt
het patroon.

## Output

Per bevinding: WCAG-succescriterium (bijv. 1.4.3), ernst
(kritiek/belangrijk/advies), locatie in de code, en een voorgestelde oplossing.
