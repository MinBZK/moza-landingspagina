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
    <div className="">
      <Link
        to={`/actueel/agenda/${filename.replace(/\.md$/, "") as string}`}
        className="group relative flex h-[220px] flex-col space-y-1 self-end lg:m-0"
      >
        <h2 className="text-xl text-sky-700 group-hover:underline">{title}</h2>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-base">📅</span>
          <p className="text-sm font-bold text-gray-600">
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
        <div className="mt-1 flex items-center gap-1">
          <span className="text-base">📍</span>
          <p className="text-sm font-bold text-gray-600">{location}</p>
        </div>
        <div className="line-clamp-5 overflow-hidden text-ellipsis">
          {summary}
        </div>
      </Link>
    </div>
  );
};

export default AgendaItem;
