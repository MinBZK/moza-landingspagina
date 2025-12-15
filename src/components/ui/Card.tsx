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
      className={`w-full overflow-hidden`}
    >
       <div className="relative h-10">
        <Link
          to={href}
          {...(external
            ? { target: "_blank", rel: "noreferrer noopener" }
            : {})}
          className="flex h-full w-full px-4"
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            className="h-5/5 object-contain"
            loading="lazy"
          />
        </Link>
      </div>
      <div className="space-y-2 px-4 py-3 pt-0">
        <Link
          {...(external
            ? { target: "_blank", rel: "noreferrer noopener" }
            : {})}
          to={href}
          className="flex items-center mb-0 text-2xl font-bold text-sky-800 hover:text-sky-900 no-underline hover:underline"
        >
          {title}
        </Link>

        <p className="leading-relaxed text-slate-800">{description}</p>
      </div>
    </article>
  );
}
