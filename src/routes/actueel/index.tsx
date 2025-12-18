import { Container } from "../../components/layout/Container.tsx";
import { BlogEntry } from "../../components/actueel/BlogEntry.tsx";
import { useEffect, useState } from "react";

import {
  type AgendaEntryType,
  type BlogEntryType,
  loadAllEntries,
} from "../../lib/markdown.ts";
import { ActueelNav } from "../../components/actueel/ActueelNav.tsx";
import { ActueelSection } from "../../components/actueel/actueelSection.tsx";

const Actueel = () => {
  const [weeklyEntries, setWeeklyEntries] = useState<{
    weekly: BlogEntryType[];
    nieuws: BlogEntryType[];
    agenda: AgendaEntryType[];
    presentaties: BlogEntryType[];
  }>({ weekly: [], nieuws: [], agenda: [], presentaties: [] });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function loadEntries() {
      try {
        const data = await loadAllEntries();
        if (!cancelled) {
          setWeeklyEntries(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load weekly markdown content",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading)
    return (
      <>
        <Container>
          <div className="pt-4">Loading...</div>
        </Container>
      </>
    );

  if (error)
    return (
      <>
        <Container>
          <div className="pt-4">Error: {error}</div>
        </Container>
      </>
    );

  return (
    <>
      <Container>
        <div className="pt-4">
          <Container>
            <ActueelNav />
          </Container>

          <ActueelSection
            title="Weekly"
            items={weeklyEntries.weekly}
            emptyText="Er zijn geen weekly berichten beschikbaar."
            allLink={{ to: "/actueel/weekly", label: "Alle weekly's" }}
            renderItem={(entry) => (
              <BlogEntry key={entry.filename} entry={entry} type="weekly" />
            )}
          />

          {/*<ActueelSection*/}
          {/*  title="Agenda"*/}
          {/*  items={weeklyEntries.agenda}*/}
          {/*  emptyText="Er zijn geen agenda items beschikbaar."*/}
          {/*  allLink={{ to: "/actueel/agenda", label: "Alle agenda items" }}*/}
          {/*  renderItem={(entry) => (*/}
          {/*    <AgendaItem key={entry.filename} {...entry} />*/}
          {/*  )}*/}
          {/*/>*/}

          <ActueelSection
            title="Presentaties"
            items={weeklyEntries.presentaties}
            emptyText="Er zijn nog geen presentaties beschikbaar."
            allLink={{
              to: "/actueel/presentaties",
              label: "Alle presentaties",
            }}
            className="mb-10 px-4 pt-2"
            renderItem={(entry) => (
              <BlogEntry
                key={entry.filename}
                entry={entry}
                type="presentaties"
              />
            )}
          />
        </div>
      </Container>
    </>
  );
};

export default Actueel;
