"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ComicSeries, ComicChapter } from "@/lib/types";

export default function ChapterReaderPage() {
  const params = useParams();
  const router = useRouter();
  const [comic, setComic] = useState<ComicSeries | null>(null);
  const [chapter, setChapter] = useState<ComicChapter | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComic() {
      try {
        const response = await fetch(`/api/comics/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setComic(data.comic);
          const foundChapter = data.comic.chapters.find(
            (ch: ComicChapter) => ch.id === params.chapterId
          );
          setChapter(foundChapter || null);
        }
      } catch (error) {
        console.error("Erreur lors du chargement:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id && params.chapterId) {
      fetchComic();
    }
  }, [params.id, params.chapterId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!chapter) return;

      if (e.key === "ArrowLeft" && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < chapter.pages.length - 1) {
        setCurrentPage(currentPage + 1);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentPage, chapter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!comic || !chapter) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Chapitre non trouvé</h1>
          <Link
            href={`/comic/${params.id}`}
            className="rounded-full bg-white px-6 py-2 text-black transition-opacity hover:opacity-90"
          >
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const currentPageData = chapter.pages[currentPage];
  const chapterIndex = comic.chapters.findIndex((ch) => ch.id === chapter.id);
  const prevChapter = chapterIndex > 0 ? comic.chapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex < comic.chapters.length - 1 ? comic.chapters[chapterIndex + 1] : null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 z-50 w-full bg-black/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href={`/comic/${comic.id}`} className="text-xl font-bold">
            {comic.title}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Page {currentPage + 1} / {chapter.pages.length}
            </span>
            <button
              onClick={() => router.back()}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20"
            >
              Fermer
            </button>
          </div>
        </div>
      </nav>

      {/* Reader */}
      <div className="flex min-h-screen flex-col pt-16">
        {/* Chapter Info */}
        <div className="mx-auto w-full max-w-4xl px-6 py-4 text-center">
          <h2 className="text-xl font-semibold">{chapter.title}</h2>
        </div>

        {/* Page Display */}
        <div className="flex flex-1 items-center justify-center">
          {currentPageData ? (
            <div className="relative w-full max-w-5xl">
              <img
                src={currentPageData.imageUrl}
                alt={`Page ${currentPage + 1}`}
                className="mx-auto h-auto w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1200'%3E%3Crect fill='%23333' width='800' height='1200'/%3E%3Ctext x='50%25' y='50%25' fill='white' text-anchor='middle' dy='.3em' font-size='24'%3EImage non disponible%3C/text%3E%3C/svg%3E";
                }}
              />

              {/* Navigation Overlay */}
              <div className="absolute left-0 top-1/2 flex h-full w-1/4 -translate-y-1/2 items-center justify-start pl-4 opacity-0 transition-opacity hover:opacity-100">
                {currentPage > 0 && (
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="rounded-full bg-black/50 p-4 backdrop-blur-sm transition-all hover:bg-black/70"
                  >
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <div className="absolute right-0 top-1/2 flex h-full w-1/4 -translate-y-1/2 items-center justify-end pr-4 opacity-0 transition-opacity hover:opacity-100">
                {currentPage < chapter.pages.length - 1 && (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="rounded-full bg-black/50 p-4 backdrop-blur-sm transition-all hover:bg-black/70"
                  >
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">Aucune page disponible</div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="mx-auto w-full max-w-4xl border-t border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {prevChapter && (
                <Link
                  href={`/comic/${comic.id}/chapter/${prevChapter.id}`}
                  className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20"
                >
                  ← Chapitre précédent
                </Link>
              )}
            </div>

            <div className="flex gap-2">
              {chapter.pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentPage ? "bg-white" : "bg-white/30"
                  }`}
                  aria-label={`Aller à la page ${index + 1}`}
                />
              ))}
            </div>

            <div>
              {nextChapter && (
                <Link
                  href={`/comic/${comic.id}/chapter/${nextChapter.id}`}
                  className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20"
                >
                  Chapitre suivant →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

