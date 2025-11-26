#!/bin/bash

# Script helper pour utiliser le scraper Python

cd "$(dirname "$0")"

# Activer l'environnement virtuel
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Environnement virtuel non trouvé. Exécutez d'abord: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Exécuter le scraper avec tous les arguments
python3 scraper.py "$@"

