import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import type { ComicSeries, ComicChapter, ComicPage } from "./types";

const BASE_URL = "https://readcomiconline.li";

// Headers pour simuler un navigateur
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

// Délai entre les requêtes pour respecter le serveur
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Récupère le contenu HTML d'une URL
 */
async function fetchPage(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération de ${url}:`, error);
    throw error;
  }
}

/**
 * Extrait les informations d'une série de comics depuis la page principale
 */
export async function scrapeComicSeries(comicUrl: string): Promise<ComicSeries> {
  console.log(`Scraping de la série: ${comicUrl}`);
  const html = await fetchPage(comicUrl);
  const $ = cheerio.load(html);

  // Extraction des informations de base
  // Le titre est généralement dans un lien vers le comic
  let title = $("a[href*='/Comic/']").first().text().trim();
  if (!title || title.includes("information")) {
    // Fallback: chercher dans le title de la page
    title = $("title").text().trim();
    title = title.replace(/\s*comic\s*\|\s*Read.*/i, "").trim();
  }
  // Nettoyer le titre
  title = title.replace(/\s+information\s*$/i, "").trim();
  
  // Extraction de la description (Summary)
  let description = "";
  $("p").each((_, el) => {
    const text = $(el).text().trim();
    // Chercher un paragraphe long qui contient la description
    if (text.length > 100 && (text.toLowerCase().includes("alien") || text.toLowerCase().includes("invasion") || text.toLowerCase().includes("spider"))) {
      description = text.replace(/^summary:\s*/i, "").trim();
      return false; // Sortir de la boucle
    }
    // Sinon chercher après "Summary:"
    if (text.toLowerCase().includes("summary:")) {
      const descText = text.replace(/^summary:\s*/i, "").trim();
      if (descText.length > 50) {
        description = descText;
        return false;
      }
    }
  });
  
  // Extraction de l'image de couverture
  // Chercher dans la section "Cover"
  let coverImage = "";
  
  // Méthode 1: Chercher dans une section avec le texte "Cover"
  $("*").each((_, el) => {
    const text = $(el).text();
    if (text && text.trim() === "Cover") {
      const img = $(el).siblings("img").first();
      if (img.length) {
        const src = img.attr("src");
        if (src && !src.includes("user-small") && !src.includes("logo")) {
          coverImage = src.startsWith("http") ? src : `${BASE_URL}${src}`;
          return false; // Sortir de la boucle
        }
      }
      // Chercher aussi dans les enfants
      const childImg = $(el).find("img").first();
      if (childImg.length) {
        const src = childImg.attr("src");
        if (src && !src.includes("user-small") && !src.includes("logo")) {
          coverImage = src.startsWith("http") ? src : `${BASE_URL}${src}`;
          return false;
        }
      }
    }
  });
  
  // Méthode 2: Fallback - chercher directement
  if (!coverImage) {
    coverImage = $("img[src*='cover']").attr("src") || 
                 $(".manga-detail-top img").attr("src") ||
                 $("img[alt*='cover']").attr("src") ||
                 "";
    if (coverImage && !coverImage.startsWith("http")) {
      coverImage = `${BASE_URL}${coverImage}`;
    }
  }

  // Extraction des métadonnées depuis les paragraphes
  const metadata: Record<string, string> = {};
  $("p").each((_, el) => {
    const text = $(el).text();
    if (text.includes("Writer:")) {
      const link = $(el).find("a");
      metadata.writer = link.text().trim();
    }
    if (text.includes("Publisher:")) {
      const link = $(el).find("a");
      metadata.publisher = link.text().trim();
    }
    if (text.includes("Status:")) {
      const statusText = text.replace(/Status:\s*/i, "").trim();
      metadata.status = statusText.split(/\s+/)[0]; // Prendre le premier mot
    }
  });

  // Extraction des genres
  const genres: string[] = [];
  $("a[href*='/Genre/']").each((_, el) => {
    const genre = $(el).text().trim();
    if (genre && !genres.includes(genre)) {
      genres.push(genre);
    }
  });

  // Extraction des chapitres depuis le tableau
  const chapters: ComicChapter[] = [];
  
  // Méthode 1: Chercher dans le tableau avec la classe "listing"
  $("table.listing tbody tr").each((index, el) => {
    const row = $(el);
    const link = row.find("td:first-child a");
    const chapterUrl = link.attr("href");
    const chapterTitle = link.text().trim();

    // Ignorer les lignes d'en-tête ou vides
    if (chapterUrl && chapterTitle && !row.find("th").length) {
      const fullUrl = chapterUrl.startsWith("http") ? chapterUrl : `${BASE_URL}${chapterUrl}`;
      chapters.push({
        id: `chapter-${chapters.length + 1}`,
        title: chapterTitle,
        url: fullUrl,
        pages: [],
        pageCount: 0,
      });
    }
  });

  // Méthode 2: Si aucun chapitre trouvé, chercher dans d'autres sélecteurs
  if (chapters.length === 0) {
    $("table tbody tr").each((index, el) => {
      const row = $(el);
      const link = row.find("a[href*='/Issue-']");
      const chapterUrl = link.attr("href");
      const chapterTitle = link.text().trim();

      if (chapterUrl && chapterTitle && !row.find("th").length) {
        const fullUrl = chapterUrl.startsWith("http") ? chapterUrl : `${BASE_URL}${chapterUrl}`;
        chapters.push({
          id: `chapter-${chapters.length + 1}`,
          title: chapterTitle,
          url: fullUrl,
          pages: [],
          pageCount: 0,
        });
      }
    });
  }

  // Inverser l'ordre pour avoir les chapitres du plus récent au plus ancien
  chapters.reverse();

  return {
    id: comicUrl.split("/").pop() || "unknown",
    title,
    description,
    coverImage,
    author: metadata.author || metadata.writer,
    publisher: metadata.publisher || metadata.company,
    genres,
    status: metadata.status,
    url: comicUrl,
    chapters,
    totalChapters: chapters.length,
  };
}

/**
 * Extrait toutes les pages d'un chapitre avec Puppeteer (pour JavaScript)
 */
export async function scrapeChapterPages(
  chapterUrl: string,
  delayMs: number = 1000
): Promise<ComicPage[]> {
  console.log(`Scraping des pages du chapitre: ${chapterUrl}`);
  await delay(delayMs); // Respect du serveur

  let browser;
  try {
    // Lancer Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Définir les headers
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Naviguer vers la page
    await page.goto(chapterUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Attendre que #divImage soit chargé
    await page.waitForSelector("#divImage", { timeout: 10000 }).catch(() => {
      // Si #divImage n'existe pas, continuer quand même
    });

    // Attendre un peu pour que les images se chargent
    await delay(2000);

    // Extraire les pages depuis le DOM
    // Utiliser une fonction sans types pour éviter les problèmes de compilation TypeScript
    const pages = await page.evaluate(function() {
      'use strict';
      const result = [];
      const seenUrls = new Set();

      // Fonction pour normaliser l'URL
      function normalizeUrl(url: any) {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const filenameMatch = pathname.match(/\/([^/]+\.(jpg|jpeg|png|webp))$/i);
          if (filenameMatch) {
            return filenameMatch[1].toLowerCase();
          }
          return pathname.split("?")[0].split("#")[0];
        } catch (e) {
          const filenameMatch = url.match(/\/([^/?#]+\.(jpg|jpeg|png|webp))$/i);
          if (filenameMatch) {
            return filenameMatch[1].toLowerCase();
          }
          return url.split("?")[0].split("#")[0];
        }
      }

      // Fonction pour vérifier si c'est une vraie page de comic
      function isValidComicPage(url: any) {
        const lowerUrl = url.toLowerCase();
        const excludePatterns = [
          "logo",
          "user-small",
          "read.png",
          "previous.png",
          "next.png",
          "error.png",
          "search.png",
          "button",
          "icon",
          "avatar",
          "advertisement",
          "ad",
          "banner",
          "widget",
          "sharethis",
          "facebook",
          "twitter",
          "google",
          "discord",
          "mgid.com",
          "a-ads.com",
          "lowseelor.com",
        ];

        for (let i = 0; i < excludePatterns.length; i++) {
          if (lowerUrl.includes(excludePatterns[i])) {
            return false;
          }
        }

        const isValidHost =
          lowerUrl.includes("blogspot") ||
          lowerUrl.includes("bp.blogspot") ||
          lowerUrl.includes("blogger.com");

        const hasComicFileName =
          /rco\d+\.(jpg|jpeg|png|webp)/i.test(url) ||
          /\/s\d+\//.test(url) ||
          /\/pw\//.test(url) ||
          /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);

        return isValidHost && hasComicFileName;
      }

      // Méthode 1: Chercher dans #divImage
      const divImage = document.getElementById("divImage");
      if (divImage) {
        const images = divImage.querySelectorAll("img");
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const imgUrl = img.getAttribute("src");
          if (!imgUrl || imgUrl.includes("data:image")) continue;

          const fullUrl = imgUrl.startsWith("http") ? imgUrl : "https:" + imgUrl;

          if (isValidComicPage(fullUrl)) {
            const normalizedUrl = normalizeUrl(fullUrl);
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              result.push({
                pageNumber: result.length + 1,
                imageUrl: fullUrl,
              });
            }
          }
        }
      }

      // Méthode 2: Si pas assez de pages, chercher dans tous les scripts
      if (result.length < 5) {
        const scripts = document.querySelectorAll("script");
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          const scriptContent = script.innerHTML || script.textContent || "";
          const imageUrlPattern =
            /https?:\/\/[^\s"']+blogspot[^\s"']*\.(jpg|jpeg|png|webp)(\?[^\s"']*)?/gi;
          const matches = scriptContent.match(imageUrlPattern);

          if (matches) {
            for (let j = 0; j < matches.length; j++) {
              const imgUrl = matches[j];
              if (isValidComicPage(imgUrl)) {
                const normalizedUrl = normalizeUrl(imgUrl);
                if (!seenUrls.has(normalizedUrl)) {
                  seenUrls.add(normalizedUrl);
                  result.push({
                    pageNumber: result.length + 1,
                    imageUrl: imgUrl,
                  });
                }
              }
            }
          }
        }
      }

      // Méthode 3: Chercher toutes les images blogspot dans le DOM
      if (result.length < 5) {
        const allImages = document.querySelectorAll("img");
        for (let i = 0; i < allImages.length; i++) {
          const img = allImages[i];
          const imgUrl = img.getAttribute("src");
          if (!imgUrl || imgUrl.includes("data:image")) continue;

          const fullUrl = imgUrl.startsWith("http") ? imgUrl : "https:" + imgUrl;

          if (isValidComicPage(fullUrl)) {
            const normalizedUrl = normalizeUrl(fullUrl);
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              result.push({
                pageNumber: result.length + 1,
                imageUrl: fullUrl,
              });
            }
          }
        }
      }

      // Trier par numéro de page dans le nom de fichier
      result.sort(function (a, b) {
        const matchA = a.imageUrl.match(/rco(\d+)/i);
        const matchB = b.imageUrl.match(/rco(\d+)/i);
        if (matchA && matchB) {
          return parseInt(matchA[1]) - parseInt(matchB[1]);
        }
        return a.pageNumber - b.pageNumber;
      });

      // Réassigner les numéros
      for (let i = 0; i < result.length; i++) {
        result[i].pageNumber = i + 1;
      }

      return result;
    });

    await browser.close();
    console.log(`Pages trouvées: ${pages.length}`);
    return pages;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error(`Erreur lors du scraping avec Puppeteer: ${error}`);
    // Fallback vers cheerio si Puppeteer échoue
    return scrapeChapterPagesFallback(chapterUrl);
  }
}

/**
 * Fallback: Extrait les pages avec cheerio (sans JavaScript)
 */
async function scrapeChapterPagesFallback(
  chapterUrl: string
): Promise<ComicPage[]> {
  const html = await fetchPage(chapterUrl);
  const $ = cheerio.load(html);

  const pages: ComicPage[] = [];
  const seenUrls = new Set<string>();

  // Fonction pour vérifier si une URL est une vraie page de comic
  const isValidComicPage = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    
    // Exclure les images qui ne sont pas des pages de comics
    const excludePatterns = [
      "logo",
      "user-small",
      "read.png",
      "previous.png",
      "next.png",
      "error.png",
      "search.png",
      "button",
      "icon",
      "avatar",
      "advertisement",
      "ad",
      "banner",
      "widget",
      "sharethis",
      "facebook",
      "twitter",
      "google",
      "discord",
      "mgid.com",
      "a-ads.com",
      "lowseelor.com",
    ];
    
    // Vérifier les patterns d'exclusion
    if (excludePatterns.some((pattern) => lowerUrl.includes(pattern))) {
      return false;
    }
    
    // Les vraies pages de comics sont généralement sur blogspot
    const isValidHost = lowerUrl.includes("blogspot") || 
                       lowerUrl.includes("bp.blogspot") ||
                       lowerUrl.includes("blogger.com");
    
    // Vérifier le format du nom de fichier (généralement RCO suivi de chiffres, ou pattern blogspot)
    const hasComicFileName = /rco\d+\.(jpg|jpeg|png|webp)/i.test(url) ||
                            /\/s\d+\//.test(url) || // Pattern blogspot avec /s1600/ ou similaire
                            /\/pw\//.test(url) || // Pattern blogspot avec /pw/ (nouveau format)
                            /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url); // Extension d'image avec ou sans paramètres
    
    return isValidHost && hasComicFileName;
  };

  // Fonction pour normaliser l'URL (enlever les paramètres de tracking et extraire le nom de fichier)
  const normalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Pour les URLs blogspot, extraire le nom de fichier final (ex: RCO001.jpg)
      const pathname = urlObj.pathname;
      const filenameMatch = pathname.match(/\/([^/]+\.(jpg|jpeg|png|webp))$/i);
      if (filenameMatch) {
        // Utiliser le nom de fichier comme identifiant unique
        return filenameMatch[1].toLowerCase();
      }
      // Fallback: utiliser le pathname sans paramètres
      return pathname.split("?")[0].split("#")[0];
    } catch {
      // Fallback: extraire le nom de fichier manuellement
      const filenameMatch = url.match(/\/([^/?#]+\.(jpg|jpeg|png|webp))$/i);
      if (filenameMatch) {
        return filenameMatch[1].toLowerCase();
      }
      return url.split("?")[0].split("#")[0];
    }
  };

  // Méthode 1: Recherche des images dans #divImage (méthode principale)
  $("#divImage img").each((index, el) => {
    const imgUrl = $(el).attr("src");
    if (!imgUrl || imgUrl.includes("data:image")) return;
    
    const fullUrl = imgUrl.startsWith("http") ? imgUrl : `https:${imgUrl}`;
    
    // Vérifier que c'est une vraie page de comic
    if (isValidComicPage(fullUrl)) {
      const normalizedUrl = normalizeUrl(fullUrl);
      
      // Éviter les doublons
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        pages.push({
          pageNumber: pages.length + 1,
          imageUrl: fullUrl,
        });
      }
    }
  });
  
  // Si on a trouvé des pages mais moins que le nombre dans le select, chercher dans les scripts
  const pageSelect = $("select option");
  const expectedPageCount = pageSelect.length;
  if (pages.length > 0 && pages.length < expectedPageCount) {
    // Les pages sont peut-être chargées dynamiquement, chercher dans les scripts
    $("script").each((_, el) => {
      const scriptContent = $(el).html() || "";
      // Chercher les URLs d'images blogspot dans les scripts
      const imageUrlPattern = /https?:\/\/[^\s"']+blogspot[^\s"']+\.(jpg|jpeg|png|webp)[^\s"']*/gi;
      const matches = scriptContent.match(imageUrlPattern);
      if (matches) {
        matches.forEach((imgUrl) => {
          if (isValidComicPage(imgUrl)) {
            const normalizedUrl = normalizeUrl(imgUrl);
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              pages.push({
                pageNumber: pages.length + 1,
                imageUrl: imgUrl,
              });
            }
          }
        });
      }
    });
  }

  // Méthode 2: Si aucune image trouvée ou pas assez, chercher dans le HTML complet et les scripts
  if (pages.length === 0 || pages.length < 5) {
    const bodyText = $.html();
    // Pattern amélioré pour capturer les URLs blogspot avec paramètres
    const imageUrlPattern = /https?:\/\/[^\s"']+blogspot[^\s"']*\.(jpg|jpeg|png|webp)(\?[^\s"']*)?/gi;
    const matches = bodyText.match(imageUrlPattern);
    
    if (matches) {
      matches.forEach((imgUrl) => {
        if (isValidComicPage(imgUrl)) {
          const normalizedUrl = normalizeUrl(imgUrl);
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            pages.push({
              pageNumber: pages.length + 1,
              imageUrl: imgUrl,
            });
          }
        }
      });
    }
  }

  // Méthode 3: Recherche dans les scripts JavaScript
  if (pages.length === 0) {
    $("script").each((_, el) => {
      const scriptContent = $(el).html() || "";
      const imageUrlPattern = /https?:\/\/[^\s"']+blogspot[^\s"']+\.(jpg|jpeg|png|webp)/gi;
      const matches = scriptContent.match(imageUrlPattern);
      if (matches) {
        matches.forEach((imgUrl) => {
          if (isValidComicPage(imgUrl)) {
            const normalizedUrl = normalizeUrl(imgUrl);
            if (!seenUrls.has(normalizedUrl)) {
              seenUrls.add(normalizedUrl);
              pages.push({
                pageNumber: pages.length + 1,
                imageUrl: imgUrl,
              });
            }
          }
        });
      }
    });
  }

  // Méthode 4: Si toujours rien, essayer de trouver toutes les images et filtrer
  if (pages.length === 0) {
    $("img").each((index, el) => {
      const imgUrl = $(el).attr("src");
      if (!imgUrl || imgUrl.includes("data:image")) return;
      
      const fullUrl = imgUrl.startsWith("http") ? imgUrl : `https:${imgUrl}`;
      
      // Vérifier que c'est une vraie page de comic
      if (isValidComicPage(fullUrl)) {
        const normalizedUrl = normalizeUrl(fullUrl);
        
        // Éviter les doublons
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          pages.push({
            pageNumber: pages.length + 1,
            imageUrl: fullUrl,
          });
        }
      }
    });
  }
  
  // Trier les pages par numéro de page dans le nom de fichier si possible
  pages.sort((a, b) => {
    const matchA = a.imageUrl.match(/rco(\d+)/i);
    const matchB = b.imageUrl.match(/rco(\d+)/i);
    if (matchA && matchB) {
      return parseInt(matchA[1]) - parseInt(matchB[1]);
    }
    return a.pageNumber - b.pageNumber;
  });
  
  // Réassigner les numéros de page après le tri
  pages.forEach((page, index) => {
    page.pageNumber = index + 1;
  });

  console.log(`Pages trouvées: ${pages.length}`);
  return pages;
}

/**
 * Scrape une série complète avec tous ses chapitres et pages
 */
export async function scrapeFullSeries(
  comicUrl: string,
  options: {
    maxChapters?: number;
    delayBetweenChapters?: number;
    delayBetweenPages?: number;
  } = {}
): Promise<ComicSeries> {
  const { maxChapters, delayBetweenChapters = 2000, delayBetweenPages = 500 } = options;

  // Scrape les informations de base de la série
  const series = await scrapeComicSeries(comicUrl);

  // Limiter le nombre de chapitres si spécifié
  const chaptersToScrape = maxChapters
    ? series.chapters.slice(0, maxChapters)
    : series.chapters;

  console.log(`Scraping de ${chaptersToScrape.length} chapitres...`);

  // Scrape chaque chapitre
  for (let i = 0; i < chaptersToScrape.length; i++) {
    const chapter = chaptersToScrape[i];
    console.log(`Chapitre ${i + 1}/${chaptersToScrape.length}: ${chapter.title}`);

    try {
      const pages = await scrapeChapterPages(chapter.url, delayBetweenPages);
      chapter.pages = pages;
      chapter.pageCount = pages.length;

      // Délai entre les chapitres pour ne pas surcharger le serveur
      if (i < chaptersToScrape.length - 1) {
        await delay(delayBetweenChapters);
      }
    } catch (error) {
      console.error(`Erreur lors du scraping du chapitre ${chapter.title}:`, error);
    }
  }

  // Mettre à jour le nombre total de chapitres
  series.totalChapters = chaptersToScrape.length;

  return series;
}

/**
 * Recherche des comics sur le site
 */
export async function searchComics(query: string): Promise<Array<{ title: string; url: string }>> {
  console.log(`Recherche de: ${query}`);
  const searchUrl = `${BASE_URL}/Search/${encodeURIComponent(query)}`;
  const html = await fetchPage(searchUrl);
  const $ = cheerio.load(html);

  const results: Array<{ title: string; url: string }> = [];

  $(".item-title a, .manga-item a, a[href*='/Comic/']").each((_, el) => {
    const title = $(el).text().trim();
    const url = $(el).attr("href");
    if (title && url) {
      const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
      results.push({ title, url: fullUrl });
    }
  });

  return results;
}

