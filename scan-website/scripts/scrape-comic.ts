#!/usr/bin/env node

import { scrapeFullSeries, searchComics } from "../lib/scraper";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { ScrapedData } from "../lib/types";

/**
 * Script CLI pour scraper un comic
 * Usage: npm run scrape <comic-url> [options]
 * Exemple: npm run scrape "https://readcomiconline.li/Comic/Spider-Man"
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  npm run scrape <comic-url> [options]
  
Options:
  --max-chapters <number>    Limite le nombre de chapitres à scraper
  --output <path>            Chemin du fichier de sortie (défaut: ./data/comic.json)
  --search <query>           Recherche un comic au lieu de scraper directement
  
Exemples:
  npm run scrape "https://readcomiconline.li/Comic/Spider-Man"
  npm run scrape "https://readcomiconline.li/Comic/Spider-Man" --max-chapters 5
  npm run scrape --search "Batman"
    `);
    process.exit(1);
  }

  // Gestion de la recherche
  const searchIndex = args.indexOf("--search");
  if (searchIndex !== -1) {
    const query = args[searchIndex + 1];
    if (!query) {
      console.error("Erreur: Veuillez fournir un terme de recherche");
      process.exit(1);
    }

    console.log(`Recherche de: "${query}"...\n`);
    const results = await searchComics(query);

    if (results.length === 0) {
      console.log("Aucun résultat trouvé.");
      return;
    }

    console.log(`Résultats trouvés (${results.length}):\n`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   ${result.url}\n`);
    });

    return;
  }

  // Récupération de l'URL du comic
  const comicUrl = args[0];
  if (!comicUrl.startsWith("http")) {
    console.error("Erreur: L'URL doit commencer par http:// ou https://");
    process.exit(1);
  }

  // Options
  const maxChaptersIndex = args.indexOf("--max-chapters");
  const maxChapters = maxChaptersIndex !== -1 ? parseInt(args[maxChaptersIndex + 1]) : undefined;

  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex !== -1 ? args[outputIndex + 1] : join(process.cwd(), "data", "comic.json");

  console.log(`\n🚀 Début du scraping de: ${comicUrl}`);
  if (maxChapters) {
    console.log(`📚 Limite: ${maxChapters} chapitres`);
  }
  console.log(`💾 Sortie: ${outputPath}\n`);

  try {
    // Scraping de la série complète
    const series = await scrapeFullSeries(comicUrl, {
      maxChapters,
      delayBetweenChapters: 2000,
      delayBetweenPages: 500,
    });

    // Création de l'objet de données
    const scrapedData: ScrapedData = {
      series,
      scrapedAt: new Date().toISOString(),
      source: comicUrl,
    };

    // Sauvegarde des données
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, JSON.stringify(scrapedData, null, 2), "utf-8");

    console.log(`\n✅ Scraping terminé avec succès!`);
    console.log(`📊 Statistiques:`);
    console.log(`   - Titre: ${series.title}`);
    console.log(`   - Chapitres: ${series.totalChapters}`);
    console.log(`   - Pages totales: ${series.chapters.reduce((sum, ch) => sum + ch.pageCount, 0)}`);
    console.log(`   - Fichier sauvegardé: ${outputPath}\n`);
  } catch (error) {
    console.error("\n❌ Erreur lors du scraping:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Erreur fatale:", error);
  process.exit(1);
});

