import type { ReactNode } from "react";
import { IconText } from "../ui/iconText.tsx";
import ChevronIcon from "../ui/ChevronIcon.tsx";
import { Link } from "react-router-dom";

type Props<T> = {
  title: string;
  items: T[];
  emptyText: string;
  allLink: { to: string; label: string };
  renderItem: (item: T) => ReactNode;
  className?: string;
  limit?: number;
};

export function ActueelSection<T>({
  title,
  items,
  emptyText,
  allLink,
  renderItem,
  className,
  limit = 6,
}: Props<T>) {
  const visibleItems = items.slice(0, limit);

  return (
    <section className={className ?? "px-4 pt-2"}>
      <h1 className="py-2 text-2xl font-bold text-slate-700">{title}</h1>

      <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <p className="mb-10 py-2">{emptyText}</p>
        ) : (
          visibleItems.map(renderItem)
        )}
      </div>

      <div>
        <IconText
          IconBefore={(props) => (
            <ChevronIcon
              {...props}
              bold={true}
              className="h-3 w-4 font-bold text-[#056ba9]"
            />
          )}
        >
          <Link to={allLink.to} className="font-bold text-[#056ba9]">
            {allLink.label}
          </Link>
        </IconText>
      </div>
    </section>
  );
}
