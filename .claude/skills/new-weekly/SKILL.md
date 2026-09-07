---
name: new-weekly
description: Gebruik bij het maken van een nieuwe MOZa Weekly.
---

# Nieuwe MOZa Weekly

## Stappen

1. Vraag welke datum (of gebruik vandaag). Sla over als de datum al gegeven is.
2. **Lees de laatste 3-5 weeklies** in `content/weekly/YYYY/`. Hieruit volgen: huidige sectie-indeling, toon, linkpatronen en de lopende agenda. Kopieer het patroon, schrijf niet vanaf nul.
3. Run: `hugo new content weekly/YYYY/YYYY-MM-DD.md`.
4. Verzamel input (sla over als de input al gegeven is):
   - Standaardbron is de Mattermost-pipeline: run `just moza-weekly` (zie `scripts/moza-weekly/README.md`). Dat levert drie bestanden op in `tmp/moza-weekly/`.
   - Gebruik `tmp/moza-weekly/<datum>.anonymized.json` als input. Nooit de `.yaml` of `.html` gebruiken: die bevatten namen.
   - De gebruiker cureert eventueel de YAML; run daarna `just moza-weekly-anonymize tmp/moza-weekly/<datum>.yaml` om de JSON te verversen.
   - **Controleer op gemiste namen**: run `just moza-weekly-namencheck tmp/moza-weekly/<datum>.anonymized.json`. Loop het rapport langs en leg de kandidaten die écht een persoon zijn voor aan de gebruiker, met de vraag of ze in `~/.config/moza-weekly/extra-namen.txt` moeten. Voeg zelf niets toe: dat bestand staat buiten de repo en is van de gebruiker. Vul je die aan, draai dan `just moza-weekly-anonymize` opnieuw.
     - De meeste kandidaten zijn vakjargon, teams of tools; die horen niet in het namenbestand maar eventueel in `GEEN_PERSOON` in `namencheck.py`.
     - Ook persona-namen uit gebruikersonderzoek moeten blijven staan: dat zijn geen echte personen.
   - Vraag de gebruiker om aanvullende input die niet uit Mattermost komt.
   - Ontbreekt `DOCS_SESSION` of is die verlopen, dan meldt `fetch.py` dat met instructies. Geef die door aan de gebruiker: zonder die cookie blijven de gespreksverslagen buiten de input.
5. Groepeer de input in secties op basis van wat er deze week speelt — secties zijn niet vast, ze volgen de onderwerpen. Laat een sectie weg als er geen inhoud voor is.

## Secties zijn onderwerp-gedreven

Secties sluiten vaak aan op bestaande onderwerpen (zie `content/onderwerpen/`) of lopende werkstromen. Ze zijn **niet voorgeschreven**: voeg toe, laat weg of combineer op basis van wat die week speelt. Kijk in de vorige weeklies welke secties actief zijn.

**Interne links**: als er voor een onderwerp een eigen pagina bestaat in `content/onderwerpen/`, link intern in plaats van extern (bv. `[Profielservice](/onderwerpen/profielservice/)`). Verifieer dat interne URL's correct zijn — ook sub-pagina's hebben het `/onderwerpen/` prefix nodig.

**Externe links** voor terugkerende diensten en projecten: zoek in eerdere weeklies naar het linkpatroon (bv. `[RegelRecht](https://regelrecht.rijks.app/)`, `[Digilab](https://digilab.overheid.nl/)`). Link bij de eerste vermelding in de weekly.

## Stijlregels

- Bullet-stijl volgt de vorige weekly (typisch: `* **Label:** tekst.`)
- B1 Nederlands, actieve zinnen (zie `.claude/rules/taal-en-stijl.md`)
- "profielservice", "notificatieservice" (één woord)
- **Geen persoonlijke namen** en geen persoonlijk nieuws (ziek zijn, verjaardagen, etc.)

## Agenda

Agenda is **cumulatief**: neem items uit de vorige weekly over die nog niet zijn geweest, verwijder voorbije items (inclusief de publicatiedatum zelf — de weekly verschijnt 's ochtends). Structuur en inleidingsregel uit de vorige weekly overnemen. Items staan in **chronologische volgorde**.

**Vaste overleggen altijd op de agenda**: MOZa Pulse, Regieteam en Stuurgroep horen altijd met een eerstvolgende datum op de agenda. Als één van deze drie is geweest en er geen nieuwe datum in de input staat, vraag proactief om de volgende datum voordat je de weekly afrondt.

## Bij onduidelijkheden

Benoem expliciet aan de gebruiker wat ontbreekt (datums, links, context) in plaats van te gokken.

**Voorbije events zonder update**: loop de agenda van de vorige weekly langs en kijk welke items tussen toen en nu zijn geweest. Als een voorbij event niet in de input wordt genoemd, vraag proactief of er toch iets over te melden is — soms is dat namelijk wel zo.

## Publiceren

- Branch: `weekly/YYYY-MM-DD`
- Commit-bericht: `MOZa Weekly DD maand YYYY` (bv. `MOZa Weekly 15 april 2026`)
