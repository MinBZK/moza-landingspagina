/**
 * Schrijf documenteigenschappen in een PDF met een incrementele update.
 *
 * De bestaande objecten blijven onaangeroerd, zodat de tagstructuur van Chrome
 * (`/StructTreeRoot`, `/MarkInfo`, `/Lang`) blijft staan. Bibliotheken die de
 * PDF opnieuw wegschrijven, zoals pdf-lib, verliezen die.
 *
 * Werkt alleen op een klassieke xref-tabel; een xref-stream (PDF 1.5+) heeft een
 * ander formaat en laat dit hard falen.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const XREF_ENTRY_LENGTH = 20;

/** PDF-tekst als hexstring in UTF-16BE, zodat accenten en aanhalingstekens kloppen. */
function pdfString(value) {
  const bom = Buffer.from([0xfe, 0xff]);
  const body = Buffer.from(value, "utf16le").swap16();
  return `<${Buffer.concat([bom, body]).toString("hex").toUpperCase()}>`;
}

function decodePdfString(raw) {
  if (raw.startsWith("<")) {
    const bytes = Buffer.from(raw.slice(1, -1).replace(/\s/g, ""), "hex");
    if (bytes.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) {
      return Buffer.from(bytes.subarray(2)).swap16().toString("utf16le");
    }
    return bytes.toString("latin1");
  }
  return raw.slice(1, -1).replace(/\\([()\\])/g, "$1");
}

function escapeXml(value) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]
  );
}

/** Leest het dictionary-fragment dat op `start` begint, met gebalanceerde haken. */
function readDict(text, start) {
  const open = text.indexOf("<<", start);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < text.length - 1; i++) {
    if (text.startsWith("<<", i)) {
      depth++;
      i++;
    } else if (text.startsWith(">>", i)) {
      depth--;
      i++;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

/** Gegevens uit de laatste trailer die een incrementele update nodig heeft. */
function readTrailer(buffer) {
  const text = buffer.toString("latin1");

  const startxref = text.lastIndexOf("startxref");
  if (startxref === -1) throw new Error("Geen startxref gevonden; dit is geen bruikbare PDF.");
  const xrefOffset = Number(text.slice(startxref + 9).match(/\d+/)?.[0]);
  if (!Number.isInteger(xrefOffset)) throw new Error("Kon de xref-offset niet lezen.");

  if (!text.startsWith("xref", xrefOffset)) {
    throw new Error(
      "De PDF gebruikt geen klassieke xref-tabel (waarschijnlijk een xref-stream). " +
        "Deze incrementele update ondersteunt dat niet."
    );
  }

  const trailerDict = readDict(text, text.indexOf("trailer", xrefOffset));
  if (!trailerDict) throw new Error("Geen trailer-dictionary gevonden na de xref-tabel.");

  const size = Number(trailerDict.match(/\/Size\s+(\d+)/)?.[1]);
  const root = trailerDict.match(/\/Root\s+(\d+\s+\d+\s+R)/)?.[1];
  const id = trailerDict.match(/\/ID\s*(\[[^\]]*\])/)?.[1];
  if (!Number.isInteger(size) || !root) {
    throw new Error("Trailer mist /Size of /Root.");
  }

  return { xrefOffset, size, root, id };
}

/**
 * Positie van de laatste definitie van objectnummer `number`.
 *
 * Zoeken op de tekst "1 0 obj" vindt ook de staart van "31 0 obj"; vandaar de
 * cijfergrens ervoor.
 */
function findObject(text, number) {
  const pattern = new RegExp(`(^|[^0-9])${number}\\s+0\\s+obj`, "g");
  let position = -1;
  for (const match of text.matchAll(pattern)) {
    position = match.index + match[1].length;
  }
  return position;
}

/** De ruwe /Key waarde-paren uit de Info-dictionary waar de trailer naar wijst. */
function readInfoEntries(text, xrefOffset) {
  const trailerDict = readDict(text, text.indexOf("trailer", xrefOffset));
  const infoNumber = trailerDict?.match(/\/Info\s+(\d+)\s+\d+\s+R/)?.[1];
  if (!infoNumber) return {};

  const start = findObject(text, infoNumber);
  const infoDict = start === -1 ? null : readDict(text, start);
  if (!infoDict) return {};

  const entries = {};
  for (const [, key, value] of infoDict.matchAll(/\/(\w+)\s*(<[0-9A-Fa-f\s]*>|\([^)]*\))/g)) {
    entries[key] = value;
  }
  return entries;
}

/**
 * XMP-pakket met Dublin Core-velden. De publicatie-URL hoort in `dc:identifier`;
 * `dc:source` is voor het werk waaruit een document is afgeleid.
 *
 * `pdfuaid:part` claimt conformiteit aan ISO 14289-1.
 */
function buildXmp({ title, description, url, creator }) {
  const veld = (naam, waarde) =>
    waarde ? `\n    <${naam}>${escapeXml(waarde)}</${naam}>` : "";
  const taalveld = (naam, waarde) =>
    waarde
      ? `\n    <${naam}><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(waarde)}` +
        `</rdf:li></rdf:Alt></${naam}>`
      : "";

  return (
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">\n` +
    ` <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n` +
    `  <rdf:Description rdf:about=""\n` +
    `    xmlns:dc="http://purl.org/dc/elements/1.1/"\n` +
    `    xmlns:xmp="http://ns.adobe.com/xap/1.0/"\n` +
    `    xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">\n` +
    `    <pdfuaid:part>1</pdfuaid:part>` +
    taalveld("dc:title", title) +
    taalveld("dc:description", description) +
    veld("dc:identifier", url) +
    veld("xmp:CreatorTool", creator) +
    `\n  </rdf:Description>\n </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>\n`
  );
}

/** Groepeert objectnummers in aaneengesloten xref-subsecties. */
function xrefSections(objects) {
  const sorted = [...objects].sort((a, b) => a.number - b.number);
  const sections = [];

  for (const object of sorted) {
    const last = sections.at(-1);
    if (last && object.number === last.start + last.offsets.length) {
      last.offsets.push(object.offset);
    } else {
      sections.push({ start: object.number, offsets: [object.offset] });
    }
  }

  return sections
    .map(({ start, offsets }) => {
      const rows = offsets.map((offset) => {
        const entry = `${String(offset).padStart(10, "0")} 00000 n \n`;
        if (entry.length !== XREF_ENTRY_LENGTH) {
          throw new Error(
            `xref-regel is ${entry.length} bytes in plaats van ${XREF_ENTRY_LENGTH}.`
          );
        }
        return entry;
      });
      return `${start} ${offsets.length}\n${rows.join("")}`;
    })
    .join("");
}

/** Alle objecten met hun dictionary, in bestandsvolgorde. */
function objectDictionaries(text) {
  const gevonden = [];
  for (const kop of text.matchAll(/(?:^|[\r\n])(\d+)\s+\d+\s+obj\b/g)) {
    const begin = kop.index + kop[0].length;
    const einde = text.indexOf("endobj", begin);
    if (einde === -1) continue;
    const romp = text.slice(begin, einde);
    const dictEinde = romp.indexOf("stream");
    const dict = (dictEinde === -1 ? romp : romp.slice(0, dictEinde)).trim();
    if (!dict.startsWith("<<") || !dict.endsWith(">>")) continue;
    gevonden.push({ nummer: Number(kop[1]), dict, begin, einde });
  }
  return gevonden;
}

/** De inhoud van een streamobject, uitgepakt wanneer die met Flate is ingepakt. */
function readStream(text, object) {
  const start = text.indexOf("stream", object.begin);
  if (start === -1 || start > object.einde) return null;
  const na = text[start + 6] === "\r" ? start + 8 : start + 7;
  const eind = text.lastIndexOf("endstream", object.einde);
  if (eind === -1) return null;
  const ruw = Buffer.from(text.slice(na, eind).replace(/\r?\n$/, ""), "latin1");
  if (!object.dict.includes("/FlateDecode")) return ruw;
  try {
    return inflateSync(ruw);
  } catch {
    return null;
  }
}

/**
 * PDF/UA 7.2-20: een `LI` mag alleen `Lbl` en `LBody` bevatten. Chromium zet de
 * inhoud direct naast het opsommingsteken en schrijft nooit een `LBody`.
 */
function buildLijstParts(text, objecten, eersteVrijeNummer) {
  const perNummer = new Map(objecten.map((o) => [o.nummer, o]));
  const parts = [];
  let volgend = eersteVrijeNummer;

  for (const object of objecten) {
    if (!/\/S\s*\/LI\b/.test(object.dict)) continue;
    const kinderen = object.dict.match(/\/K\s*\[([^\]]*)\]/);
    if (!kinderen) continue;
    const verwijzingen = [...kinderen[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => Number(m[1]));
    if (verwijzingen.length < 2) continue;
    const [label, ...inhoud] = verwijzingen;
    if (!/\/S\s*\/Lbl\b/.test(perNummer.get(label)?.dict ?? "")) continue;

    const body = volgend++;
    parts.push({
      number: body,
      bytes: Buffer.from(
        `${body} 0 obj\n<< /Type /StructElem /S /LBody /P ${object.nummer} 0 R ` +
          `/K [${inhoud.map((n) => `${n} 0 R`).join(" ")}] >>\nendobj\n`,
        "latin1"
      ),
    });
    for (const nummer of inhoud) {
      const kind = perNummer.get(nummer);
      if (!kind) continue;
      parts.push({
        number: nummer,
        bytes: Buffer.from(
          `${nummer} 0 obj\n${kind.dict.replace(/\/P\s+\d+\s+\d+\s+R/, `/P ${body} 0 R`)}\nendobj\n`,
          "latin1"
        ),
      });
    }
    parts.push({
      number: object.nummer,
      bytes: Buffer.from(
        `${object.nummer} 0 obj\n` +
          object.dict.replace(/\/K\s*\[[^\]]*\]/, `/K [${label} 0 R ${body} 0 R]`) +
          `\nendobj\n`,
        "latin1"
      ),
    });
  }
  return { parts, volgendNummer: volgend };
}

/**
 * PDF/UA 7.1-3: elk stukje inkt moet getagde inhoud zijn of een artefact.
 * Chromium laat de paginavulling vóór de eerste tag en het briefhoofd erna
 * ongemarkeerd staan. Alleen die kop en staart worden omsloten; de getagde
 * inhoud ertussen blijft byte voor byte gelijk.
 */
function buildPaginaParts(text, objecten) {
  const perNummer = new Map(objecten.map((o) => [o.nummer, o]));
  const parts = [];

  for (const object of objecten) {
    if (!/\/Type\s*\/Page\b/.test(object.dict)) continue;
    const verwijzing = object.dict.match(/\/Contents\s+(\d+)\s+\d+\s+R/);
    if (!verwijzing) continue;
    const stroom = perNummer.get(Number(verwijzing[1]));
    if (!stroom) continue;
    const inhoud = readStream(text, stroom);
    if (!inhoud) continue;

    const tekst = inhoud.toString("latin1");
    const eersteTag = tekst.indexOf("BDC");
    const laatsteTag = tekst.lastIndexOf("EMC");
    if (eersteTag === -1 || laatsteTag === -1) continue;

    const kopEinde = tekst.lastIndexOf("\n", eersteTag) + 1;
    const staartBegin = laatsteTag + 3;
    const staart = tekst.slice(staartBegin);
    // Een XObject in de staart hoort bij de structuurboom en mag dus niet in
    // een artefact belanden; dat zou regel 7.1-2 breken.
    if (/\bDo\b/.test(staart)) {
      throw new Error(
        `Pagina-object ${object.nummer} heeft een XObject na de laatste tag; ` +
          `dat kan niet als artefact gemarkeerd worden.`
      );
    }

    const kop = tekst.slice(0, kopEinde);
    const naTransformatie = kop.indexOf("\n") + 1;
    const nieuw = Buffer.from(
      kop.slice(0, naTransformatie) +
        "/Artifact BMC\n" +
        kop.slice(naTransformatie) +
        "EMC\n" +
        tekst.slice(kopEinde, staartBegin) +
        "\n/Artifact << /Type /Pagination >> BDC" +
        staart +
        "\nEMC\n",
      "latin1"
    );
    const ingepakt = deflateSync(nieuw);
    parts.push({
      number: stroom.nummer,
      bytes: Buffer.concat([
        Buffer.from(
          `${stroom.nummer} 0 obj\n<< /Filter /FlateDecode /Length ${ingepakt.length} >>\nstream\n`,
          "latin1"
        ),
        ingepakt,
        Buffer.from("\nendstream\nendobj\n", "latin1"),
      ]),
    });
  }
  return parts;
}

/** Bouwt de bytes die achter de bestaande PDF geplakt worden. */
function buildIncrementalUpdate(buffer, meta) {
  if (!meta.title && !meta.description && !meta.url && !meta.creator) return null;

  const { xrefOffset, size, root, id } = readTrailer(buffer);
  const text = buffer.toString("latin1");
  const rootNumber = Number(root.match(/^(\d+)/)[1]);

  const infoNumber = size;
  const metadataNumber = size + 1;

  // Wat we niet zelf zetten, zoals Producer en CreationDate, nemen we
  // ongewijzigd over: het nieuwe object vervangt het oude volledig.
  const eigen = { Title: meta.title, Subject: meta.description, Creator: meta.creator };
  const entries = [
    ...Object.entries(eigen)
      .filter(([, value]) => value)
      .map(([key, value]) => `/${key} ${pdfString(value)}`),
    ...Object.entries(readInfoEntries(text, xrefOffset))
      .filter(([key]) => !(key in eigen))
      .map(([key, value]) => `/${key} ${value}`),
  ];

  const catalogStart = findObject(text, rootNumber);
  const catalogDict = catalogStart === -1 ? null : readDict(text, catalogStart);
  if (!catalogDict) {
    throw new Error(`Catalogusobject ${rootNumber} niet gevonden; mogelijk een object-stream.`);
  }
  const catalog = catalogDict.includes("/Metadata")
    ? catalogDict.replace(/\/Metadata\s+\d+\s+\d+\s+R/, `/Metadata ${metadataNumber} 0 R`)
    : `${catalogDict.slice(0, -2)} /Metadata ${metadataNumber} 0 R >>`;

  // PDF/UA 7.1-5: Chromium tagt <strong> en <em> als structuurtypen die de
  // PDF-standaard niet kent. Zonder RoleMap naar een standaardtype zakt elk
  // document op deze regel.
  const structNumber = Number((catalogDict.match(/\/StructTreeRoot\s+(\d+)\s+\d+\s+R/) || [])[1]);
  let structPart = null;
  if (structNumber) {
    const structStart = findObject(text, structNumber);
    const structDict = structStart === -1 ? null : readDict(text, structStart);
    if (structDict && !structDict.includes("/RoleMap")) {
      const metRoleMap = `${structDict.slice(0, -2)} /RoleMap << /Strong /Span /Em /Span >> >>`;
      structPart = {
        number: structNumber,
        bytes: Buffer.from(`${structNumber} 0 obj\n${metRoleMap}\nendobj\n`, "latin1"),
      };
    }
  }

  // PDF/UA 7.18.1-2 en 7.18.5-2: een linkannotatie moet een beschrijving hebben,
  // en Chromium schrijft die niet.
  //
  // Zoeken vanuit de annotatie terug naar zijn objectkop vindt ook cijferparen
  // binnen inhoudsstromen, en één regex over de hele dictionary kost
  // exponentiële tijd. Vandaar de gang langs de objecten zelf.
  const linkParts = [];
  for (const kop of text.matchAll(/(?:^|[\r\n])(\d+)\s+\d+\s+obj\b/g)) {
    const begin = kop.index + kop[0].length;
    const einde = text.indexOf("endobj", begin);
    if (einde === -1) continue;
    const dict = text.slice(begin, einde).trim();
    if (!dict.startsWith("<<") || !dict.endsWith(">>")) continue;
    if (!/\/Subtype\s*\/Link\b/.test(dict) || dict.includes("/Contents")) continue;
    const uri = dict.match(/\/URI\s*\(([^)]*)\)/);
    // Een verwijzing binnen het document draagt geen URI maar een naam, die uit
    // de kop is afgeleid. Daar valt een leesbare beschrijving uit te maken.
    const dest = dict.match(/\/Dest\s*\/([^\s/\]>]+)/);
    let beschrijving;
    if (uri) {
      beschrijving = uri[1];
    } else if (dest) {
      const woorden = decodeURIComponent(dest[1]).replace(/^\d+-/, "").replace(/-/g, " ");
      beschrijving = `Verwijzing naar ${woorden}`;
    } else {
      continue;
    }
    linkParts.push({
      number: Number(kop[1]),
      bytes: Buffer.from(
        `${kop[1]} 0 obj\n${dict.slice(0, -2)} /Contents ${pdfString(beschrijving)} >>\nendobj\n`,
        "latin1"
      ),
    });
  }

  const objecten = objectDictionaries(text);
  const { parts: lijstParts, volgendNummer } = buildLijstParts(text, objecten, size + 2);
  const paginaParts = buildPaginaParts(text, objecten);
  const hoogsteNummer = Math.max(volgendNummer - 1, metadataNumber);

  const xmp = Buffer.from(buildXmp(meta), "utf8");
  const parts = [
    {
      number: infoNumber,
      bytes: Buffer.from(`${infoNumber} 0 obj\n<< ${entries.join(" ")} >>\nendobj\n`, "latin1"),
    },
    {
      number: metadataNumber,
      bytes: Buffer.concat([
        Buffer.from(
          `${metadataNumber} 0 obj\n<< /Type /Metadata /Subtype /XML ` +
            `/Length ${xmp.length} >>\nstream\n`,
          "latin1"
        ),
        xmp,
        Buffer.from("\nendstream\nendobj\n", "latin1"),
      ]),
    },
    {
      number: rootNumber,
      bytes: Buffer.from(`${rootNumber} 0 obj\n${catalog}\nendobj\n`, "latin1"),
    },
    ...(structPart ? [structPart] : []),
    ...linkParts,
    ...lijstParts,
    ...paginaParts,
  ];

  const prefix = buffer.subarray(-1).toString("latin1") === "\n" ? "" : "\n";
  let offset = buffer.length + prefix.length;
  for (const part of parts) {
    part.offset = offset;
    offset += part.bytes.length;
  }

  const trailer =
    `trailer\n<< /Size ${hoogsteNummer + 1} /Root ${root} ` +
    `/Info ${infoNumber} 0 R${id ? ` /ID ${id}` : ""} /Prev ${xrefOffset} >>\n` +
    `startxref\n${offset}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(prefix, "latin1"),
    ...parts.map((part) => part.bytes),
    Buffer.from(`xref\n${xrefSections(parts)}${trailer}`, "latin1"),
  ]);
}

/** Leest de Info-dictionary terug via de nieuwste trailer. */
function readPdfMetadata(buffer) {
  const text = buffer.toString("latin1");
  const { xrefOffset } = readTrailer(buffer);

  const result = {};
  for (const [key, value] of Object.entries(readInfoEntries(text, xrefOffset))) {
    result[key] = decodePdfString(value);
  }
  return result;
}

/** Leest het XMP-pakket waar de catalogus naar verwijst. */
function readXmp(buffer) {
  const text = buffer.toString("latin1");
  const { root } = readTrailer(buffer);
  const rootNumber = Number(root.match(/^(\d+)/)[1]);

  const catalogStart = findObject(text, rootNumber);
  const catalogDict = catalogStart === -1 ? null : readDict(text, catalogStart);
  const metadataNumber = catalogDict?.match(/\/Metadata\s+(\d+)\s+\d+\s+R/)?.[1];
  if (!metadataNumber) return null;

  const start = findObject(text, metadataNumber);
  if (start === -1) return null;

  const streamStart = text.indexOf("stream\n", start) + "stream\n".length;
  const streamEnd = text.indexOf("\nendstream", streamStart);
  return buffer.subarray(streamStart, streamEnd).toString("utf8");
}

/** Schrijft de eigenschappen in het bestand op `path`. */
function setPdfMetadata(path, meta) {
  const buffer = readFileSync(path);
  const update = buildIncrementalUpdate(buffer, meta);
  if (update) writeFileSync(path, Buffer.concat([buffer, update]));
}

export {
  setPdfMetadata,
  buildIncrementalUpdate,
  buildLijstParts,
  buildPaginaParts,
  objectDictionaries,
  readPdfMetadata,
  readXmp,
  buildXmp,
  pdfString,
};
