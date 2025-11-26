# Scraper Python pour ReadComicOnline.li

## Installation

1. Installer les dépendances (avec environnement virtuel) :
```bash
# Créer et activer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

Ou utilisez le script d'installation :
```bash
./setup_scraper.sh
```

2. Installer ChromeDriver :
   - Sur macOS : `brew install chromedriver`
   - Sur Linux : Télécharger depuis https://chromedriver.chromium.org/
   - Sur Windows : Télécharger et ajouter au PATH

## Utilisation

### Scraper un comic complet :
```bash
python scraper.py "https://readcomiconline.li/Comic/Batman-2025"
```

### Limiter le nombre de chapitres :
```bash
python scraper.py "https://readcomiconline.li/Comic/Batman-2025" --max-chapters 5
```

### Spécifier un fichier de sortie :
```bash
python scraper.py "https://readcomiconline.li/Comic/Batman-2025" --output ./data/batman.json
```

## Fonctionnalités

- ✅ Scrape les informations de la série (titre, description, genres, etc.)
- ✅ Extrait l'image de couverture
- ✅ Récupère tous les chapitres/issues
- ✅ Extrait toutes les pages de chaque chapitre
- ✅ Gère le JavaScript avec Selenium
- ✅ Filtre les doublons et les images non pertinentes
- ✅ Sauvegarde en JSON compatible avec le site web

## Notes

- Le scraper utilise Selenium pour gérer le JavaScript
- Les délais entre les requêtes sont configurés pour respecter le serveur
- Les données sont sauvegardées dans `./data/comic.json` par défaut

