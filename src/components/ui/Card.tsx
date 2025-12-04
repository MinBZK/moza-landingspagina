import { Link } from "react-router-dom";
import type { HomeCard } from "../../types/card.ts";

export function Card({
  title,
  description,
  href,
  imageUrl,
  imageAlt,
  external,
}: HomeCard) {
  return (
    <article
      className={`w-full overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-slate-200`}
    >
      <div className="relative h-56 w-full bg-gray-100">
        <Link
          to={href}
          {...(external
            ? { target: "_blank", rel: "noreferrer noopener" }
            : {})}
          className="flex h-full w-full items-center justify-center"
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            className="h-4/5 object-contain"
            loading="lazy"
          />
        </Link>
      </div>
      <div className="space-y-2 px-4 py-3">
        <Link
          {...(external
            ? { target: "_blank", rel: "noreferrer noopener" }
            : {})}
          to={href}
          className="flex items-center font-semibold text-sky-800 hover:text-sky-900 no-underline hover:underline"
        >
          <span className="text-2xl font-light">{title}</span>
        </Link>

        <p className="leading-relaxed text-slate-800">{description}</p>
      </div>
    </article>
  );
}
