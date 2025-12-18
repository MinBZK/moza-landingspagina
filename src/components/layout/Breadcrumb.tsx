import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Container } from "./Container.tsx";
import { useBreadcrumb } from "../../context/BreadcrumbContext.tsx";

type BreadcrumbProps = {
  labelMap?: Record<string, React.ReactNode>;
  hideHome?: boolean;
};

function titleFromSegment(segment: string) {
  let decoded = decodeURIComponent(segment);
  decoded = decoded.replace("-", " ");
  if (!decoded) return decoded;
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

export default function Breadcrumb({ labelMap, hideHome }: BreadcrumbProps) {
  const { pathname } = useLocation();
  const { title } = useBreadcrumb();

  const segments = pathname.split("/").filter(Boolean);

  let acc = "";
  const crumbs = segments.map((seg) => {
    acc += `/${seg}`;
    const label = labelMap?.[seg] ?? titleFromSegment(seg);

    return { to: acc, label };
  });

  const allCrumbs = hideHome ? crumbs : [{ to: "/", label: "Home" }, ...crumbs];

  if (allCrumbs.length <= 1) return null;

  return (
    <Container>
      <div className="mt-4 px-4">
        <nav aria-label="Breadcrumb">
          <ol className="mb-2 flex">
            {allCrumbs.map((c, i) => {
              const isLast = i === allCrumbs.length - 1;

              const displayLabel = isLast
                ? // Prefer dynamic title from context (e.g., when landing directly on detail pages)
                  (title ?? c.label)
                : c.label;

              return (
                <li
                  key={`${c.to}-${i}`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isLast ? (
                    <span>{displayLabel}</span>
                  ) : (
                    <Link
                      to={c.to}
                      className="text-sky-700 after:mx-[0.5em] after:inline-block after:h-[0.5em] after:w-[0.5em] after:content-[url('/chevron-r.svg')] hover:underline"
                    >
                      {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </Container>
  );
}
