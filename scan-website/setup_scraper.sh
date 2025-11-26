#!/bin/bash

# Script d'installation du scraper Python

echo "🔧 Installation du scraper Python..."

# Créer un environnement virtuel
python3 -m venv venv

# Activer l'environnement virtuel
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

echo "✅ Installation terminée!"
echo ""
echo "Pour utiliser le scraper:"
echo "1. Activez l'environnement virtuel: source venv/bin/activate"
echo "2. Lancez le scraper: python scraper.py <url>"
echo ""

