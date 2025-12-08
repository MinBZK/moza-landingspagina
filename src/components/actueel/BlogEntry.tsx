import { Link } from "react-router-dom";
import type { BlogEntryType } from "../../lib/markdown.ts";

export const BlogEntry = ({
  entry,
  type,
}: {
  entry: BlogEntryType;
  type: "weekly" | "nieuws" | "presentaties";
}) => (
  <div className="mb-10">
    <Link
      to={`/actueel/${type}/${entry.filename}`}
      className="group relative flex h-[220px] flex-col space-y-2 self-end px-4 lg:m-0"
    >
      <h2 className="text-2xl text-[#01689b] group-hover:underline">
        {entry.title}
      </h2>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-xl">📅</span>
        <p className="font-bold text-gray-600">
          {entry.date.toLocaleDateString("nl-NL", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <div className="line-clamp-3 overflow-hidden text-ellipsis">
        {entry.summary}
      </div>
    </Link>
  </div>
);
