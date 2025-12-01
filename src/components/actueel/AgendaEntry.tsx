import type { AgendaEntryType } from "../../lib/markdown.ts";
import { Link } from "react-router-dom";

export const AgendaItem = ({
  title,
  location,
  summary,
  filename,
  toDate,
  fromDate,
}: AgendaEntryType) => {
  return (
    <div className="mb-10">
      <Link
        to={`/actueel/agenda/${filename}`}
        className="group relative flex h-[220px] flex-col space-y-2 self-end px-4 lg:m-0"
      >
        <h2 className="text-2xl text-[#01689b] group-hover:underline">
          {title}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <span>📅</span>
          <p className="font-bold">
            {fromDate.toLocaleDateString("nl-NL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            {toDate && !isNaN(toDate.getTime()) && (
              <>
                {"- "}
                {toDate.toLocaleDateString("nl-NL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </>
            )}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span>📍</span>
          <p className="font-bold">{location}</p>
        </div>
        <div className="line-clamp-3 overflow-hidden text-ellipsis">
          {summary}
        </div>
      </Link>
    </div>
  );
};

export default AgendaItem;
