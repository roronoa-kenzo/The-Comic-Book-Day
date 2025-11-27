# The Comic Book Day

Application web moderne pour lire des comics, construite avec Next.js, React et TypeScript.

## 🚀 Installation

```bash
npm install
```

Cette commande installe automatiquement toutes les dépendances Node.js et Python. Plus besoin d'environnement virtuel !

## 📋 Prérequis

- Node.js 18+
- Python 3.x
- Chrome/Chromium (pour Puppeteer/Selenium)

## 🎯 Démarrage Rapide

```bash
# Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour voir l'application.

## 🛠️ Scripts Disponibles

- `npm run dev` : Serveur de développement
- `npm run build` : Build de production
- `npm run start` : Serveur de production
- `npm run lint` : Linter ESLint
- `npm run scrape <url>` : Scraper un comic (TypeScript)
- `npm run scrape:python <url>` : Scraper un comic (Python)

## 📖 Scraping de Comics

### Scraper TypeScript (recommandé)

```bash
npm run scrape "https://readcomiconline.li/Comic/Batman-2025"
```

### Scraper Python

```bash
npm run scrape:python "https://readcomiconline.li/Comic/Batman-2025"
```

### Options

- `--max-chapters <number>` : Limite le nombre de chapitres à scraper
- `--output <path>` : Spécifie le fichier de sortie (par défaut: `./data/{comic-id}.json`)

Les comics sont automatiquement sauvegardés dans `./data/` avec un nom unique.

## 🏗️ Architecture

- **Frontend** : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes
- **Scraping** : TypeScript (Puppeteer/Cheerio) et Python (Selenium)
- **Stockage** : Fichiers JSON locaux

## 📁 Structure

```
scan-website/
├── app/                  # Pages Next.js et routes API
│   ├── api/              # Endpoints API
│   ├── comic/            # Pages de comics
│   └── page.tsx          # Page d'accueil
├── lib/                  # Logique métier
│   ├── scraper.ts        # Scraper TypeScript
│   ├── types.ts          # Types TypeScript
│   └── utils.ts          # Utilitaires
├── scripts/              # Scripts CLI
│   └── scrape-comic.ts   # Script de scraping
├── data/                 # Comics scrapés (JSON)
└── scraper.py            # Scraper Python
```

## 🎨 Fonctionnalités

- Bibliothèque de comics avec groupement par genre
- Navigation entre pages et chapitres
- Lecteur avec navigation clavier
- Design responsive et moderne
- Scraping automatique des métadonnées et pages

## 📝 Notes

- Les dépendances Python sont installées via le script `postinstall` dans `package.json`
- Chaque comic scrapé est sauvegardé dans son propre fichier JSON
- Le scraper inclut des délais pour respecter le serveur source
