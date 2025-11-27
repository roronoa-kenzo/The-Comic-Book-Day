"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Comic {
  id: string;
  title: string;
  coverImage?: string;
  description?: string;
  totalChapters: number;
  genres?: string[];
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredComic, setFeaturedComic] = useState<Comic | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function fetchComics() {
      try {
        const response = await fetch("/api/comics");
        if (response.ok) {
          const data = await response.json();
          setComics(data.comics || []);
          if (data.comics && data.comics.length > 0) {
            setFeaturedComic(data.comics[0]);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des comics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchComics();
  }, []);

  // Grouper les comics par genre
  const comicsByGenre: Record<string, Comic[]> = {};
  comics.forEach((comic) => {
    if (comic.genres && comic.genres.length > 0) {
      comic.genres.forEach((genre) => {
        if (!comicsByGenre[genre]) {
          comicsByGenre[genre] = [];
        }
        if (!comicsByGenre[genre].find((c) => c.id === comic.id)) {
          comicsByGenre[genre].push(comic);
        }
      });
    }
  });

  const categories = [
    { name: "Tous les comics", comics: comics.slice(0, 12) },
    ...Object.entries(comicsByGenre).map(([genre, genreComics]) => ({
      name: genre,
      comics: genreComics.slice(0, 12),
    })),
  ];

  return (
    <div className="min-h-screen text-white">
      {/* Navigation */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "bg-black/95 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            The Comic Book Day
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium transition-opacity hover:opacity-70">
              Accueil
            </Link>
            <Link href="/" className="text-sm font-medium transition-opacity hover:opacity-70">
              Bibliothèque
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {featuredComic && (
        <section className="relative w-full overflow-hidden bg-black pt-20" id="hero-section">
          {/* Dégradé gauche - Cyan/Blue discret */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-1/4 bg-linear-to-r from-cyan-500/10 via-transparent to-transparent" />
          
          {/* Dégradé droite - Violet/Purple discret */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/4 bg-linear-to-l from-purple-500/10 via-transparent to-transparent" />
          
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-12 md:flex-row md:items-start md:gap-12">
            {/* Image du comic à sa taille normale */}
            {featuredComic.coverImage && (
              <div className="shrink-0">
                <img
                  src={featuredComic.coverImage}
                  alt={featuredComic.title}
                  className="h-auto w-[200px] rounded-lg object-cover shadow-2xl md:w-[280px]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Contenu texte */}
            <div className="flex-1">
              <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                {featuredComic.title}
              </h1>
              {featuredComic.description && (
                <p className="mb-8 text-base leading-relaxed text-gray-300 md:text-lg">
                  {featuredComic.description}
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                <Link
                  href={`/comic/${featuredComic.id}`}
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:scale-105 hover:bg-gray-200 md:px-8 md:py-3 md:text-base"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Lire maintenant
                </Link>
                <Link
                  href={`/comic/${featuredComic.id}`}
                  className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20 md:px-8 md:py-3 md:text-base"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Plus d&apos;infos
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <section className="relative w-full overflow-hidden bg-black pt-20" id="loading-section">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-xl text-gray-400">Chargement des comics...</div>
          </div>
        </section>
      )}

      {/* Content Rows */}
      <section 
        className="relative z-10 space-y-12 pb-16 pt-8" 
        id="comics-section"
        style={{ backgroundColor: 'lab(2 0 -0.03)' }}
      >
        {categories.length > 0 ? (
          categories.map((category) => (
            <div key={category.name} className="px-6">
              <h2 className="mb-6 text-xl font-semibold text-gray-200">{category.name}</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {category.comics.map((comic) => (
                  <Link
                    key={comic.id}
                    href={`/comic/${comic.id}`}
                    className="group shrink-0 cursor-pointer transition-all hover:scale-[1.03]"
                  >
                    <div className="relative w-[180px] overflow-hidden rounded-lg">
                      {comic.coverImage ? (
                        <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-gray-900">
                          <img
                            src={comic.coverImage}
                            alt={comic.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='270'%3E%3Crect fill='%23333' width='180' height='270'/%3E%3Ctext x='50%25' y='50%25' fill='white' text-anchor='middle' dy='.3em' font-size='12'%3EImage non disponible%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      ) : (
                        <div className="flex aspect-2/3 items-center justify-center rounded-lg bg-gray-800">
                          <span className="text-xs text-gray-500">Pas d&apos;image</span>
                        </div>
                      )}
                      <div className="mt-2">
                        <h3 className="line-clamp-2 text-base font-medium leading-tight text-white group-hover:text-gray-300">
                          {comic.title}
                        </h3>
                        {comic.totalChapters > 0 && (
                          <p className="mt-1 text-sm text-gray-400">
                            {comic.totalChapters} chapitre{comic.totalChapters > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          !loading && (
            <div className="px-6 text-center text-gray-400">
              <p className="mb-4 text-xl">Aucun comic disponible</p>
              <p className="text-sm">
                Utilisez le script de scraping pour ajouter des comics à votre bibliothèque.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  );
}
