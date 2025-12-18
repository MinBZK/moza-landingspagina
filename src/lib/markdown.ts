import { default as matter } from "gray-matter";
import { parse } from "date-fns";

export interface BaseEntryType {
  filename: string;
  title: string;
  summary: string;
}

export interface BlogEntryType extends BaseEntryType {
  date: Date;
}

export interface AgendaEntryType extends BaseEntryType {
  fromDate: Date;
  toDate: Date;
  location: string;
}

export interface BlogDetailType {
  content: string;
  title: string;
  summary: string;
  date: Date;
}

export interface AgendaDetailType {
  content: string;
  title: string;
  summary: string;
  fromDate: Date;
  toDate: Date;
  location: string;
}

// Create a map of all Markdown files from all subdirectories
const markdownModules = import.meta.glob<string>("../assets/**/*.md", {
  query: "?raw",
  import: "default",
});

async function loadEntriesByPath<T>(
  path: string,
  mapper: (data: { [p: string]: string }, filename: string) => T,
  sorter: (a: T, b: T) => number,
): Promise<T[]> {
  const loadedEntries: T[] = await Promise.all(
    Object.entries(markdownModules)
      .filter(([modulePath]) => modulePath.includes(`/assets/${path}/`))
      .map(async ([modulePath, loader]) => {
        const content = await loader();
        const { data } = matter(content);
        const filename = modulePath.split("/").pop() ?? modulePath;
        return mapper(data, filename);
      }),
  );

  return loadedEntries.sort(sorter);
}

export async function loadAllWeeklyEntries(): Promise<BlogEntryType[]> {
  return loadEntriesByPath(
    "weekly",
    (data, filename) => ({
      filename,
      title: data.title,
      summary: data.summary,
      date: parse(data.date, "dd-MM-yyyy", new Date()),
    }),
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export async function loadAllNieuwsEntries(): Promise<BlogEntryType[]> {
  return loadEntriesByPath(
    "nieuws",
    (data, filename) => ({
      filename,
      title: data.title,
      summary: data.summary,
      date: parse(data.date, "dd-MM-yyyy", new Date()),
    }),
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export async function loadAllAgendaEntries(): Promise<AgendaEntryType[]> {
  return loadEntriesByPath(
    "agenda",
    (data, filename) => ({
      filename,
      title: data.title,
      summary: data.summary,
      fromDate: parse(data["from-date"], "dd-MM-yyyy", new Date()),
      toDate: parse(data["to-date"], "dd-MM-yyyy", new Date()),
      location: data.location,
    }),
    (a, b) => b.fromDate.getTime() - a.fromDate.getTime(),
  );
}

export async function loadAllPresentaties(): Promise<BlogEntryType[]> {
  return loadEntriesByPath(
    "presentaties",
    (data, filename) => ({
      filename,
      title: data.title,
      summary: data.summary,
      date: parse(data.date, "dd-MM-yyyy", new Date()),
    }),
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export async function loadBlogMarkdownByFilename(
  filename: string,
  contentType: "weekly" | "nieuws" | "agenda" | "presentaties",
): Promise<BlogDetailType | AgendaDetailType> {
  const matchingFiles = Object.keys(markdownModules).filter(
    (path) =>
      path.includes(`/assets/${contentType}/`) &&
      path.endsWith(`/${filename + ".md"}`),
  );

  if (matchingFiles.length === 0) {
    throw new Error(`File not found: ${filename} in ${contentType}`);
  }

  const rawContent = await markdownModules[matchingFiles[0]]();
  const { data, content } = matter(rawContent);

  if (contentType === "agenda") {
    return {
      content,
      title: data.title,
      summary: data.summary,
      fromDate: parse(data["from-date"], "dd-MM-yyyy", new Date()),
      toDate: parse(data["to-date"], "dd-MM-yyyy", new Date()),
      location: data.location,
    };
  } else {
    return {
      content,
      title: data.title,
      summary: data.summary,
      date: parse(data.date, "dd-MM-yyyy", new Date()),
    };
  }
}

export async function loadAllEntries(): Promise<{
  weekly: BlogEntryType[];
  nieuws: BlogEntryType[];
  agenda: AgendaEntryType[];
  presentaties: BlogEntryType[];
}> {
  const [weekly, nieuws, agenda, presentaties] = await Promise.all([
    loadAllWeeklyEntries(),
    loadAllNieuwsEntries(),
    loadAllAgendaEntries(),
    loadAllPresentaties(),
  ]);

  return {
    weekly,
    nieuws,
    agenda,
    presentaties,
  };
}
