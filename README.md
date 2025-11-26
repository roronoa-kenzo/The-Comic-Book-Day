# ScanWebsite - Comic Reader & Scraper

A complete web application for reading comics with a Python scraper for extracting comic data from ReadComicOnline.li.

## Project Structure

This project consists of two main components:

### 1. Next.js Web Application (`scan-website/`)

A modern comic reader built with Next.js, React, and TypeScript.

**Features:**
- Browse and read comics
- Chapter navigation
- Responsive design with Tailwind CSS
- API routes for comic data

**Quick Start:**
```bash
cd scan-website
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

See `scan-website/README.md` for more details.

### 2. Python Comic Scraper

A web scraper for extracting comic data from ReadComicOnline.li using Selenium and BeautifulSoup.

**Features:**
- Scrapes series information (title, description, genres, etc.)
- Extracts cover images
- Retrieves all chapters/issues
- Extracts all pages from each chapter
- Handles JavaScript with Selenium
- Filters duplicates and irrelevant images
- Saves data in JSON format compatible with the web app

**Quick Start:**
```bash
# Setup (installs dependencies in a virtual environment)
./setup_scraper.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run scraper
python scraper.py "https://readcomiconline.li/Comic/Batman-2025"
```

See `README_SCRAPER.md` for detailed usage instructions.

## Requirements

### Web Application
- Node.js 18+
- npm or yarn

### Scraper
- Python 3.8+
- ChromeDriver (for Selenium)
  - macOS: `brew install chromedriver`
  - Linux/Windows: Download from https://chromedriver.chromium.org/

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ScanWebsite
```

2. Setup the web application:
```bash
cd scan-website
npm install
```

3. Setup the scraper:
```bash
cd ..
./setup_scraper.sh
```

## Usage Workflow

1. **Scrape comic data:**
```bash
python scraper.py "https://readcomiconline.li/Comic/Your-Comic-Name"
```

2. **Move the generated JSON to the web app:**
```bash
cp data/comic.json scan-website/data/
```

3. **Run the web application:**
```bash
cd scan-website
npm run dev
```

## License

MIT

