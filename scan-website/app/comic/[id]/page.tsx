"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { ComicSeries } from "@/lib/types";

export default function ComicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [comic, setComic] = useState<ComicSeries | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComic() {
      try {
        const response = await fetch(`/api/comics/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setComic(data.comic);
        } else {
          console.error("Comic non trouvé");
        }
      } catch (error) {
        console.error("Erreur lors du chargement du comic:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchComic();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  if (!comic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Comic non trouvé</h1>
          <Link
            href="/"
            className="rounded-full bg-white px-6 py-2 text-black transition-opacity hover:opacity-90"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-black/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            The Comic Book Day
          </Link>
          <button
            onClick={() => router.back()}
            className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20"
          >
            Retour
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mt-16 min-h-[60vh] w-full overflow-hidden bg-black">
        {comic.coverImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${comic.coverImage})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </div>
        )}

        <div className="relative z-10 flex h-full items-end pb-12 pt-8">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-end">
              {comic.coverImage && (
                <div className="shrink-0">
                  <img
                    src={comic.coverImage}
                    alt={comic.title}
                    className="h-64 w-48 rounded-lg object-cover shadow-2xl md:h-80 md:w-56"
                  />
                </div>
              )}
              <div className="flex-1 pb-4">
                <h1 className="mb-4 text-4xl font-bold md:text-6xl">{comic.title}</h1>
                {comic.description && (
                  <p className="mb-4 max-w-2xl text-lg text-gray-300">{comic.description}</p>
                )}
                <div className="mb-4 flex flex-wrap gap-4 text-sm">
                  {comic.author && (
                    <div>
                      <span className="text-gray-400">Auteur:</span>{" "}
                      <span className="text-white">{comic.author}</span>
                    </div>
                  )}
                  {comic.publisher && (
                    <div>
                      <span className="text-gray-400">Éditeur:</span>{" "}
                      <span className="text-white">{comic.publisher}</span>
                    </div>
                  )}
                  {comic.status && (
                    <div>
                      <span className="text-gray-400">Statut:</span>{" "}
                      <span className="text-white">{comic.status}</span>
                    </div>
                  )}
                </div>
                {comic.genres && comic.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {comic.genres.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chapters Section */}
      <section
        className="mx-auto max-w-7xl rounded-xl px-6 py-12"
        style={{ backgroundColor: "lab(2 0 -0.03)" }}
      >
        <h2 className="mb-6 text-3xl font-bold">
          Chapitres ({comic.totalChapters})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comic.chapters.map((chapter, index) => (
            <Link
              key={chapter.id}
              href={`/comic/${comic.id}/chapter/${chapter.id}`}
              className="group rounded-lg border border-white/10 bg-white/5 p-6 transition-all hover:border-white/30 hover:bg-white/10"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{chapter.title}</h3>
                {chapter.pageCount > 0 && (
                  <span className="text-sm text-gray-400">{chapter.pageCount} pages</span>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Chapitre {comic.chapters.length - index}
              </div>
            </Link>
          ))}
        </div>
        {comic.chapters.length === 0 && (
          <div className="text-center text-gray-400">
            Aucun chapitre disponible pour le moment.
          </div>
        )}
      </section>
    </div>
  );
}

