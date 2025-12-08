import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
import { useEffect, useRef, useState } from "react";
import "../../../styles/rijkshuisstijl_reveal.css";
import { useNavigate, useParams } from "react-router-dom";
import { loadBlogMarkdownByFilename } from "../../../lib/markdown.ts";
import NotFound from "../../errors/404.tsx";

const Slug = () => {
  const { name } = useParams();

  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const deckRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<Reveal.Api | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");

  useEffect(() => {
    const fetchContent = async () => {
      if (!name) return;
      setIsLoading(true);

      try {
        const data = await loadBlogMarkdownByFilename(name, "presentaties");

        setHtmlContent(data.content);
      } catch {
        setError("Bestand niet gevonden");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [name]);

  useEffect(() => {
    if (deckRef.current && htmlContent && !revealRef.current) {
      revealRef.current = new Reveal(deckRef.current, {
        embedded: true, // Important for embedding in a page
        controls: true,
        progress: true,
        overview: true,
        // display: "block", // Add this to ensure slides use block display

        hash: true,
      });

      revealRef.current.initialize();
    }

    return () => {
      if (revealRef.current) {
        revealRef.current.destroy();
        revealRef.current = null;
      }
    };
  }, [htmlContent]);

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

  if (!htmlContent) {
    return null;
  }

  return (
    <div className="h-[100vh]">
      <button
        className="absolute top-4 right-4 z-10 cursor-pointer text-5xl text-[#2b5480]"
        onClick={() => {
          console.log(htmlContent);
          navigate(-1);
        }}
      >
        &#10539;
      </button>
      <style>{`nav, footer, header { display: none;}
         img#header-logo:has(+ div section.present.hide-logo) { display: none; }   
         
        `}</style>
      <img
        src="/assets/images/rijksoverheid.svg"
        alt="Logo"
        id="header-logo"
        className="fixed top-0"
      />
      <div ref={deckRef} className="reveal">
        <div
          className="slides"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
};

export default Slug;
