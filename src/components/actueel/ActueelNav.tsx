import { IconText } from "../ui/iconText.tsx";
import ChevronIcon from "../ui/ChevronIcon.tsx";
import { Link } from "react-router-dom";

const NAV_ITEMS = ["Weekly", "Presentaties"] as const;

export function ActueelNav() {
  return (
    <div className="bg-[#f3f3f3] pl-2">
      <div className="mb-6 px-4 pl-2">
        <ul className="flex py-3 text-base">
          {NAV_ITEMS.map((item) => (
            <li key={item} className="mr-2 ml-0 text-sky-700">
              <IconText
                IconBefore={(props) => (
                  <ChevronIcon {...props} className="h-3 w-4" />
                )}
              >
                <Link
                  to={`/actueel/${item.toLowerCase()}`}
                  className="flex items-center hover:underline"
                >
                  {item}
                </Link>
              </IconText>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
