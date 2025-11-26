/**
 * Exemple d'utilisation du scraper
 * Ce fichier montre comment utiliser les fonctions de scraping
 */

import { scrapeComicSeries, scrapeChapterPages, scrapeFullSeries, searchComics } from "./scraper";

// Exemple 1: Rechercher un comic
async function exampleSearch() {
  const results = await searchComics("Batman");
  console.log("Résultats de recherche:", results);
}

// Exemple 2: Scraper les informations d'une série (sans les pages)
async function exampleScrapeSeries() {
  const series = await scrapeComicSeries("https://readcomiconline.li/Comic/Spider-Man");
  console.log("Série:", series.title);
  console.log("Chapitres:", series.totalChapters);
}

// Exemple 3: Scraper les pages d'un chapitre spécifique
async function exampleScrapeChapter() {
  const chapterUrl = "https://readcomiconline.li/Comic/Spider-Man/Issue-1";
  const pages = await scrapeChapterPages(chapterUrl);
  console.log(`Pages trouvées: ${pages.length}`);
  pages.forEach((page) => {
    console.log(`Page ${page.pageNumber}: ${page.imageUrl}`);
  });
}

// Exemple 4: Scraper une série complète avec tous les chapitres et pages
async function exampleScrapeFullSeries() {
  const series = await scrapeFullSeries("https://readcomiconline.li/Comic/Spider-Man", {
    maxChapters: 5, // Limiter à 5 chapitres pour l'exemple
    delayBetweenChapters: 2000, // 2 secondes entre chaque chapitre
    delayBetweenPages: 500, // 500ms entre chaque page
  });

  console.log(`Série: ${series.title}`);
  console.log(`Total de chapitres: ${series.totalChapters}`);
  
  series.chapters.forEach((chapter) => {
    console.log(`\n${chapter.title}:`);
    console.log(`  Pages: ${chapter.pageCount}`);
    chapter.pages.forEach((page) => {
      console.log(`    - Page ${page.pageNumber}: ${page.imageUrl}`);
    });
  });
}

// Décommenter pour tester
// exampleSearch();
// exampleScrapeSeries();
// exampleScrapeChapter();
// exampleScrapeFullSeries();

