import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { ScrapedData, ComicSeries } from "./types";

const DATA_DIR = join(process.cwd(), "data");

/**
 * Récupère tous les fichiers JSON dans le dossier data
 */
export function getAllComicFiles(): string[] {
  if (!existsSync(DATA_DIR)) {
    return [];
  }

  try {
    const files = readdirSync(DATA_DIR);
    return files.filter((file) => file.endsWith(".json"));
  } catch (error) {
    console.error("Erreur lors de la lecture du dossier data:", error);
    return [];
  }
}

/**
 * Charge un fichier comic par son nom
 */
export function loadComicFile(filename: string): ScrapedData | null {
  try {
    const filePath = join(DATA_DIR, filename);
    if (!existsSync(filePath)) {
      return null;
    }

    const fileContent = readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as ScrapedData;
  } catch (error) {
    console.error(`Erreur lors du chargement de ${filename}:`, error);
    return null;
  }
}

/**
 * Récupère tous les comics avec leurs informations de base
 */
export function getAllComics(): Array<{
  id: string;
  title: string;
  coverImage?: string;
  description?: string;
  totalChapters: number;
  genres?: string[];
  filename: string;
}> {
  const files = getAllComicFiles();
  const comics = files
    .map((filename) => {
      const data = loadComicFile(filename);
      if (!data) return null;

      return {
        id: data.series.id,
        title: data.series.title,
        coverImage: data.series.coverImage,
        description: data.series.description,
        totalChapters: data.series.totalChapters,
        genres: data.series.genres,
        filename,
      };
    })
    .filter((comic) => comic !== null) as Array<{
    id: string;
    title: string;
    coverImage?: string;
    description?: string;
    totalChapters: number;
    genres?: string[];
    filename: string;
  }>;

  return comics;
}

/**
 * Trouve un comic par son ID
 */
export function findComicById(comicId: string): ComicSeries | null {
  const files = getAllComicFiles();
  
  for (const filename of files) {
    const data = loadComicFile(filename);
    if (data && data.series.id === comicId) {
      return data.series;
    }
  }

  return null;
}

/**
 * Trouve un comic par son filename
 */
export function findComicByFilename(filename: string): ComicSeries | null {
  const data = loadComicFile(filename);
  return data ? data.series : null;
}

