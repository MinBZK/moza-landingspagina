import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Container } from "./Container.tsx";

type BreadcrumbProps = {
  /**
   * Optional: provide nicer labels for certain path segments.
   * Example: { onderwerpen: "Onderwerpen", actueel: "Actueel" }
   */
  labelMap?: Record<string, React.ReactNode>;
  /**
   * Optional: hide the "Home" crumb.
   */
  hideHome?: boolean;
};

function titleFromSegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  if (!decoded) return decoded;
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

export default function Breadcrumb({ labelMap, hideHome }: BreadcrumbProps) {
  const { pathname } = useLocation();

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

              return (
                <li
                  key={`${c.to}-${i}`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isLast ? (
                    <span>{c.label}</span>
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
