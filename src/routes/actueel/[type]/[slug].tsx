import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Container } from "../../../components/layout/Container.tsx";
import NotFound from "../../errors/404.tsx";
import {
  type AgendaDetailType,
  type BlogDetailType,
  loadBlogMarkdownByFilename,
} from "../../../lib/markdown.ts";
import { useEffect, useState } from "react";

const ActueelDetail = () => {
  const { name, type } = useParams();
  const [data, setData] = useState<BlogDetailType | AgendaDetailType>();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      if (!name) return;
      setIsLoading(true);

      try {
        const data = await loadBlogMarkdownByFilename(
          name,
          type as "weekly" | "nieuws",
        );
        setData(data);
      } catch {
        setError("Bestand niet gevonden");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [name]);

  if (isLoading) {
    return (
      <div className="my-50 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#154273] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return <NotFound />;
  }

  if (!data) {
    return null;
  }

  return (
    <Container>
      <div className="mx-auto flex w-full justify-center px-2 py-6 sm:px-4 sm:py-10">
        <div className="w-full max-w-[1200px]">
          <div className="">
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <div className="flex flex-wrap gap-4">
              {"fromDate" in data ? (
                <>
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-sm">📅</span>
                    <div className="text-sm font-medium">
                      <div>
                        {data.fromDate.toLocaleDateString("nl-NL", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>

                      {data.toDate && !isNaN(data.toDate.getTime()) && (
                        <div>
                          tot{" "}
                          {data.toDate.toLocaleDateString("nl-NL", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-base">📍</span>
                    <span className="text-sm font-medium">{data.location}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <span className="text-base">📅</span>
                  <span className="text-sm font-medium">
                    {data.date.toLocaleDateString("nl-NL", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="prose py-2">
            <ReactMarkdown>{data.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ActueelDetail;
