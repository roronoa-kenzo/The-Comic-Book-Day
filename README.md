# The Comic Book Day

Une application web complète pour lire des comics avec des scrapers intégrés pour extraire les données de comics depuis ReadComicOnline.li.

## 🚀 Installation

**Tout se fait en une seule commande :**

```bash
cd scan-website
npm install
```

Cette commande installe automatiquement :
- Toutes les dépendances Node.js (Next.js, React, TypeScript, etc.)
- Toutes les dépendances Python (Selenium, BeautifulSoup, etc.) via le script `postinstall`

**C'est tout !** Plus besoin d'environnement virtuel Python ou de configuration supplémentaire.

## 📋 Prérequis

- **Node.js 18+** (avec npm)
- **Python 3.x** (pour le scraper Python)
- **Chrome/Chromium** (pour Puppeteer et Selenium)

## 🎯 Utilisation

### Lancer l'application web

```bash
cd scan-website
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Scraper un comic

**Option 1 : Scraper TypeScript (recommandé)**
```bash
npm run scrape "https://readcomiconline.li/Comic/Batman-2025"
```

**Option 2 : Scraper Python**
```bash
npm run scrape:python "https://readcomiconline.li/Comic/Batman-2025"
```

**Limiter le nombre de chapitres :**
```bash
npm run scrape "https://readcomiconline.li/Comic/Batman-2025" --max-chapters 5
```

Les comics scrapés sont automatiquement sauvegardés dans `scan-website/data/` avec un nom unique basé sur l'ID du comic (ex: `Batman-2025.json`).

## 📁 Structure du Projet

```
The-Comic-Book-Day/
├── scan-website/          # Application Next.js
│   ├── app/              # Pages et routes API
│   ├── lib/              # Logique métier
│   ├── scripts/          # Scripts de scraping
│   ├── data/             # Comics scrapés (JSON)
│   └── scraper.py        # Scraper Python
└── README.md
```

## ✨ Fonctionnalités

- 📚 **Bibliothèque de comics** : Parcourir et lire vos comics scrapés
- 🔍 **Navigation par chapitres** : Accès direct aux chapitres
- 📖 **Lecteur de pages** : Navigation fluide avec clavier (flèches)
- 🎨 **Design moderne** : Interface responsive avec Tailwind CSS
- 🤖 **Scraping automatique** : Extraction complète des métadonnées et pages
- 💾 **Persistance** : Chaque comic est sauvegardé dans son propre fichier JSON

## 🛠️ Scripts Disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run build` : Build de production
- `npm run start` : Lance le serveur de production
- `npm run scrape <url>` : Scrape un comic (TypeScript)
- `npm run scrape:python <url>` : Scrape un comic (Python)

## 📝 Notes

- Les dépendances Python sont installées automatiquement lors de `npm install`
- Les comics sont sauvegardés dans `scan-website/data/` avec des noms uniques
- Le scraper respecte des délais entre les requêtes pour ne pas surcharger le serveur

## 📄 License

MIT
