import { Container } from "../../components/layout/Container.tsx";
import { BlogEntry } from "../../components/actueel/BlogEntry.tsx";
import { useEffect, useState } from "react";

import {
  type AgendaEntryType,
  type BlogEntryType,
  loadAllEntries,
} from "../../lib/markdown.ts";
import AgendaItem from "../../components/actueel/AgendaEntry.tsx";
import ChevronIcon from "../../components/ui/ChevronIcon.tsx";
import { IconText } from "../../components/ui/iconText.tsx";

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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <Container>
        <div className="pt-4">
          {/*<div id="nieuws" className="border-t border-gray-200 px-4 pt-2">*/}
          {/*  <h1 className="py-2 text-3xl font-bold text-slate-700">Nieuws</h1>*/}
          {/*</div>*/}
          {/*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">*/}
          {/*  {weeklyEntries.nieuws.length === 0 ? (*/}
          {/*    <p className="mb-10 px-4 py-2">*/}
          {/*      Nog geen nieuwsberichten beschikbaar.*/}
          {/*    </p>*/}
          {/*  ) : (*/}
          {/*    weeklyEntries.nieuws.map((entry) => (*/}
          {/*      <BlogEntry entry={entry} type={"nieuws"} />*/}
          {/*    ))*/}
          {/*  )}*/}
          {/*</div>*/}

          <div className="bg-[#f3f3f3] pl-2">
            <Container>
              <div className="px-4 pl-2 mb-6">
                <ul className="flex py-3 text-base">
                  {["Weekly", "Agenda", "Presentaties"].map((item) => (
                    <li key={item} className="text-sky-700 ml-0 mr-2">
                      <IconText
                        IconBefore={(props) => (
                          <ChevronIcon {...props} className="h-3 w-4" />
                        )}
                      >
                        <a
                          href={`#${item.toLowerCase()}`}
                          className="flex items-center hover:underline"
                        >
                          {item}
                        </a>
                      </IconText>
                    </li>
                  ))}
                </ul>
              </div>
              </Container>
          </div>

          <div id="weekly" className="px-4 pt-0">
            <h1 className="py-2 text-2xl font-bold text-slate-700">Weekly</h1>
          </div>

          <div className="grid grid-cols-1 py-2 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyEntries.weekly.length === 0 ? (
              <p className="mb-10 px-4 py-2">
                Er zijn geen weekly berichten beschikbaar.
              </p>
            ) : (
              weeklyEntries.weekly.map((entry) => (
                <BlogEntry entry={entry} type={"weekly"} />
              ))
            )}
          </div>

          <div id="agenda" className="px-4">
            <h1 className="py-2 text-2xl font-bold text-slate-700">Agenda</h1>
          </div>
          <div className="grid grid-cols-1 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyEntries.agenda.length === 0 ? (
              <p className="mb-10 px-4 py-2">Er zijn geen agenda items beschikbaar.</p>
            ) : (
              weeklyEntries.agenda.map((entry) => <AgendaItem {...entry} />)
            )}
          </div>

          <div id="presentaties" className="px-4">
            <h1 className="py-2 text-2xl font-bold text-slate-700">
              Presentaties
            </h1>
          </div>
          <div className="grid grid-cols-1 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyEntries.presentaties.length === 0 ? (
              <p className="mb-10 px-4 py-2">
                Er zijn nog geen presentaties beschikbaar.
              </p>
            ) : (
              weeklyEntries.presentaties.map((entry) => (
                <BlogEntry entry={entry} type={"presentaties"} />
              ))
            )}
          </div>
        </div>
      </Container>
    </>
  );
};

export default Actueel;
