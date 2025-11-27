#!/usr/bin/env python3
"""
Scraper pour readcomiconline.li
Extrait les informations des comics et leurs pages
"""

import json
import time
import re
import sys
import os
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup
import requests

BASE_URL = "https://readcomiconline.li"

def setup_driver(headless: bool = True):
    """Configure et retourne un driver Selenium"""
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        return driver
    except Exception as e:
        print(f"Erreur lors de l'initialisation de Chrome: {e}")
        print("Assurez-vous que ChromeDriver est installé et dans le PATH")
        sys.exit(1)

def scrape_comic_series(comic_url: str) -> Dict:
    """Scrape les informations d'une série de comics"""
    print(f"Scraping de la série: {comic_url}")
    
    driver = setup_driver()
    try:
        driver.get(comic_url)
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Extraction du titre
        title = ""
        title_link = soup.find('a', href=lambda x: x and '/Comic/' in x)
        if title_link:
            title = title_link.get_text(strip=True)
        if not title or 'information' in title.lower():
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text(strip=True)
                title = re.sub(r'\s*comic\s*\|\s*Read.*', '', title, flags=re.IGNORECASE).strip()
        
        # Extraction de la description
        description = ""
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 100 and ('alien' in text.lower() or 'invasion' in text.lower() or 'batman' in text.lower() or 'spider' in text.lower()):
                description = text
                break
            if 'summary:' in text.lower():
                description = re.sub(r'^summary:\s*', '', text, flags=re.IGNORECASE).strip()
                if len(description) > 50:
                    break
        
        # Extraction de l'image de couverture
        cover_image = ""
        # Chercher dans la section Cover
        cover_section = soup.find(string=re.compile('Cover', re.I))
        if cover_section:
            parent = cover_section.find_parent()
            if parent:
                img = parent.find_next('img')
                if img and img.get('src'):
                    src = img.get('src')
                    if not src.startswith('http'):
                        src = urljoin(BASE_URL, src)
                    if 'user-small' not in src and 'logo' not in src.lower():
                        cover_image = src
        
        # Si pas trouvé, chercher ailleurs
        if not cover_image:
            img = soup.find('img', src=lambda x: x and 'cover' in x.lower())
            if img:
                cover_image = img.get('src')
                if not cover_image.startswith('http'):
                    cover_image = urljoin(BASE_URL, cover_image)
        
        # Extraction des métadonnées
        metadata = {}
        for p in paragraphs:
            text = p.get_text()
            if 'Writer:' in text:
                link = p.find('a')
                if link:
                    metadata['writer'] = link.get_text(strip=True)
            if 'Publisher:' in text:
                link = p.find('a')
                if link:
                    metadata['publisher'] = link.get_text(strip=True)
            if 'Status:' in text:
                status_text = re.sub(r'Status:\s*', '', text, flags=re.IGNORECASE).strip()
                metadata['status'] = status_text.split()[0] if status_text else ""
        
        # Extraction des genres
        genres = []
        genre_links = soup.find_all('a', href=lambda x: x and '/Genre/' in x)
        for link in genre_links:
            genre = link.get_text(strip=True)
            if genre and genre not in genres:
                genres.append(genre)
        
        # Extraction des chapitres
        chapters = []
        seen_urls = set()
        
        # Méthode 1: Chercher dans un tableau avec classe 'listing'
        table = soup.find('table', class_='listing')
        if table:
            rows = table.find_all('tr')
            for row in rows:
                # Ignorer les en-têtes et les lignes vides
                if row.find('th') or not row.find('td'):
                    continue
                
                # Chercher des liens vers des issues ou des versions "Full"
                link = row.find('a', href=True)
                if link:
                    href = link.get('href', '')
                    # Accepter les liens vers /Issue-, /issue-, /Full, ou autres formats de chapitres
                    if href and ('/Issue-' in href or '/issue-' in href or '/Full' in href or 
                                 '/full' in href or '?id=' in href):
                        chapter_url = href
                        chapter_title = link.get_text(strip=True)
                        
                        if chapter_url:
                            if not chapter_url.startswith('http'):
                                chapter_url = urljoin(BASE_URL, chapter_url)
                            
                            if chapter_url not in seen_urls:
                                seen_urls.add(chapter_url)
                                chapters.append({
                                    'id': f"chapter-{len(chapters) + 1}",
                                    'title': chapter_title,
                                    'url': chapter_url,
                                    'pages': [],
                                    'pageCount': 0
                                })
        
        # Méthode 2: Chercher tous les liens vers des issues/chapitres
        if len(chapters) == 0:
            # Chercher tous les liens contenant Issue, issue, Full, ou id= dans l'URL
            all_links = soup.find_all('a', href=True)
            for link in all_links:
                href = link.get('href', '')
                if href and ('/Issue-' in href or '/issue-' in href or '/Full' in href or 
                            '/full' in href or '?id=' in href):
                    chapter_url = href
                    chapter_title = link.get_text(strip=True)
                    
                    if not chapter_url.startswith('http'):
                        chapter_url = urljoin(BASE_URL, chapter_url)
                    
                    # Vérifier que c'est bien un chapitre (pas la page principale)
                    if chapter_url != comic_url and chapter_url not in seen_urls:
                        # Accepter si c'est un lien vers un chapitre/issue/full
                        is_chapter = (
                            re.search(r'Issue-?\d+|issue-?\d+', chapter_url) or
                            '/Full' in chapter_url or '/full' in chapter_url or
                            '?id=' in chapter_url
                        )
                        
                        if is_chapter:
                            seen_urls.add(chapter_url)
                            if not chapter_title:
                                # Extraire le titre depuis l'URL si nécessaire
                                match = re.search(r'Issue-?(\d+)', chapter_url, re.I)
                                if match:
                                    chapter_title = f"Issue {match.group(1)}"
                                elif '/Full' in chapter_url or '/full' in chapter_url:
                                    chapter_title = "Full"
                                else:
                                    chapter_title = "Chapter " + str(len(chapters) + 1)
                            
                            chapters.append({
                                'id': f"chapter-{len(chapters) + 1}",
                                'title': chapter_title,
                                'url': chapter_url,
                                'pages': [],
                                'pageCount': 0
                            })
        
        # Méthode 3: Chercher dans les listes (ul/ol)
        if len(chapters) == 0:
            lists = soup.find_all(['ul', 'ol'])
            for list_elem in lists:
                list_items = list_elem.find_all('li')
                for li in list_items:
                    link = li.find('a', href=True)
                    if link:
                        href = link.get('href', '')
                        if href and ('/Issue-' in href or '/issue-' in href or '/Full' in href or 
                                    '/full' in href or '?id=' in href):
                            chapter_url = href
                            chapter_title = link.get_text(strip=True)
                            
                            if not chapter_url.startswith('http'):
                                chapter_url = urljoin(BASE_URL, chapter_url)
                            
                            if chapter_url not in seen_urls:
                                seen_urls.add(chapter_url)
                                chapters.append({
                                    'id': f"chapter-{len(chapters) + 1}",
                                    'title': chapter_title or f"Chapter {len(chapters) + 1}",
                                    'url': chapter_url,
                                    'pages': [],
                                    'pageCount': 0
                                })
        
        # Inverser l'ordre pour avoir les plus récents en premier
        chapters.reverse()
        
        comic_id = urlparse(comic_url).path.split('/')[-1] or "unknown"
        
        return {
            'id': comic_id,
            'title': title,
            'description': description,
            'coverImage': cover_image,
            'author': metadata.get('writer', ''),
            'publisher': metadata.get('publisher', ''),
            'genres': genres,
            'status': metadata.get('status', ''),
            'url': comic_url,
            'chapters': chapters,
            'totalChapters': len(chapters)
        }
    finally:
        driver.quit()

def scrape_chapter_pages(chapter_url: str, delay: float = 1.0) -> List[Dict]:
    """Scrape toutes les pages d'un chapitre"""
    print(f"Scraping des pages du chapitre: {chapter_url}")
    time.sleep(delay)
    
    driver = setup_driver()
    pages = []
    seen_urls = set()
    
    try:
        driver.get(chapter_url)
        
        # Attendre que #divImage soit chargé
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "divImage"))
            )
        except:
            pass
        
        # Obtenir le nombre de pages depuis le select
        page_count = 0
        try:
            selects = driver.find_elements(By.CSS_SELECTOR, "select")
            for select in selects:
                options = select.find_elements(By.TAG_NAME, "option")
                # Chercher le select qui contient des numéros de pages (généralement le deuxième)
                if len(options) > 1 and options[0].text.strip().isdigit():
                    page_count = len(options)
                    print(f"Nombre de pages détecté dans le select: {page_count}")
                    break
        except Exception as e:
            print(f"Impossible de lire le select de pages: {e}")
        
        # Attendre que les images se chargent et scroller pour déclencher le chargement
        time.sleep(2)
        
        # Scroller pour charger toutes les images
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(2)
        
        # Attendre que toutes les images soient chargées
        try:
            WebDriverWait(driver, 10).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except:
            pass
        
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        def normalize_url(url: str) -> str:
            """Normalise l'URL pour détecter les doublons"""
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                pathname = parsed.path
                filename_match = re.search(r'/([^/]+\.(jpg|jpeg|png|webp))$', pathname, re.I)
                if filename_match:
                    return filename_match.group(1).lower()
                return pathname.split('?')[0].split('#')[0]
            except:
                filename_match = re.search(r'/([^/?#]+\.(jpg|jpeg|png|webp))$', url, re.I)
                if filename_match:
                    return filename_match.group(1).lower()
                return url.split('?')[0].split('#')[0]
        
        def is_valid_comic_page(url: str) -> bool:
            """Vérifie si l'URL est une vraie page de comic"""
            lower_url = url.lower()
            
            exclude_patterns = [
                'logo', 'user-small', 'read.png', 'previous.png', 'next.png',
                'error.png', 'search.png', 'button', 'icon', 'avatar',
                'advertisement', 'ad', 'banner', 'widget', 'sharethis',
                'facebook', 'twitter', 'google', 'discord', 'mgid.com',
                'a-ads.com', 'lowseelor.com'
            ]
            
            if any(pattern in lower_url for pattern in exclude_patterns):
                return False
            
            is_valid_host = any(x in lower_url for x in ['blogspot', 'bp.blogspot', 'blogger.com'])
            
            has_comic_filename = (
                re.search(r'rco\d+\.(jpg|jpeg|png|webp)', url, re.I) or
                re.search(r'/s\d+/', url) or
                re.search(r'/pw/', url) or
                re.search(r'\.(jpg|jpeg|png|webp)(\?|$)', url, re.I)
            )
            
            return is_valid_host and has_comic_filename
        
        # Méthode 1: Chercher dans #divImage
        div_image = soup.find('div', id='divImage')
        if div_image:
            images = div_image.find_all('img')
            for img in images:
                img_url = img.get('src')
                if not img_url or 'data:image' in img_url:
                    continue
                
                if not img_url.startswith('http'):
                    img_url = 'https:' + img_url
                
                if is_valid_comic_page(img_url):
                    normalized = normalize_url(img_url)
                    if normalized not in seen_urls:
                        seen_urls.add(normalized)
                        pages.append({
                            'pageNumber': len(pages) + 1,
                            'imageUrl': img_url
                        })
        
        # Méthode 2: Si on connaît le nombre de pages, parcourir toutes les pages
        # pour collecter toutes les images
        if page_count > 0 and len(pages) < page_count:
            print(f"Parcours de toutes les {page_count} pages pour collecter les images...")
            try:
                # Trouver le select de pages (généralement le deuxième select)
                selects = driver.find_elements(By.CSS_SELECTOR, "select")
                page_select_element = None
                for sel in selects:
                    options = sel.find_elements(By.TAG_NAME, "option")
                    if len(options) > 1 and options[0].text.strip().isdigit():
                        page_select_element = sel
                        break
                
                if page_select_element:
                    from selenium.webdriver.support.ui import Select
                    page_select = Select(page_select_element)
                    
                    # Parcourir toutes les pages (commencer à 0 car selectedIndex est 0-based)
                    for page_num in range(0, page_count):
                        try:
                            # Utiliser JavaScript directement pour changer la page
                            driver.execute_script(f"""
                                var select = arguments[0];
                                select.selectedIndex = {page_num};
                                var event = new Event('change', {{ bubbles: true }});
                                select.dispatchEvent(event);
                            """, page_select_element)
                            time.sleep(2)  # Attendre le chargement de la page
                            
                            # Attendre que l'image soit chargée
                            try:
                                WebDriverWait(driver, 5).until(
                                    EC.presence_of_element_located((By.CSS_SELECTOR, "#divImage img"))
                                )
                            except:
                                pass
                            
                            # Extraire l'image de la page actuelle
                            try:
                                # Attendre que l'image soit chargée
                                WebDriverWait(driver, 5).until(
                                    EC.presence_of_element_located((By.CSS_SELECTOR, "#divImage img"))
                                )
                                
                                current_imgs = driver.find_elements(By.CSS_SELECTOR, "#divImage img")
                                for current_img in current_imgs:
                                    img_url = current_img.get_attribute("src")
                                    if img_url:
                                        if not img_url.startswith('http'):
                                            img_url = 'https:' + img_url
                                        
                                        if is_valid_comic_page(img_url):
                                            normalized = normalize_url(img_url)
                                            if normalized not in seen_urls:
                                                seen_urls.add(normalized)
                                                pages.append({
                                                    'pageNumber': len(pages) + 1,
                                                    'imageUrl': img_url
                                                })
                                                print(f"  Page {len(pages)} collectée")
                            except Exception as img_error:
                                # Si l'image n'est pas trouvée, continuer
                                pass
                        except Exception as e:
                            # Continuer même en cas d'erreur
                            pass
            except Exception as e:
                print(f"Erreur lors du parcours des pages: {e}")
        
        # Méthode 3: Utiliser JavaScript pour extraire toutes les URLs d'images depuis le DOM et les scripts
        # Toujours exécuter cette méthode pour être sûr d'avoir toutes les pages
        print("Extraction des URLs depuis JavaScript...")
        image_urls = driver.execute_script("""
                var urls = [];
                var seen = {};
                
                // Fonction pour vérifier si c'est une page valide
                function isValid(url) {
                    var lower = url.toLowerCase();
                    var exclude = ['logo', 'user-small', 'read.png', 'previous.png', 'next.png', 
                                   'error.png', 'search.png', 'button', 'icon', 'avatar',
                                   'advertisement', 'ad', 'banner', 'widget', 'sharethis',
                                   'facebook', 'twitter', 'google', 'discord', 'mgid.com',
                                   'a-ads.com', 'lowseelor.com'];
                    for (var i = 0; i < exclude.length; i++) {
                        if (lower.indexOf(exclude[i]) !== -1) return false;
                    }
                    var isBlogspot = lower.indexOf('blogspot') !== -1 || 
                                   lower.indexOf('bp.blogspot') !== -1 ||
                                   lower.indexOf('blogger.com') !== -1;
                    var hasImage = /rco\\d+\\.(jpg|jpeg|png|webp)/i.test(url) ||
                                  /\\/s\\d+\\//.test(url) ||
                                  /\\/pw\\//.test(url) ||
                                  /\\.(jpg|jpeg|png|webp)(\\?|$)/i.test(url);
                    return isBlogspot && hasImage;
                }
                
                // Normaliser l'URL
                function normalize(url) {
                    try {
                        var match = url.match(/\\/([^/\\?#]+\\.(jpg|jpeg|png|webp))$/i);
                        if (match) return match[1].toLowerCase();
                        return url.split('?')[0].split('#')[0];
                    } catch(e) {
                        return url.split('?')[0].split('#')[0];
                    }
                }
                
                // Chercher dans tous les scripts
                var scripts = document.getElementsByTagName('script');
                for (var i = 0; i < scripts.length; i++) {
                    var content = scripts[i].innerHTML || scripts[i].textContent || '';
                    var matches = content.match(/https?:\\/\\/[^\\s"']+blogspot[^\\s"']*\\.(jpg|jpeg|png|webp)(\\?[^\\s"']*)?/gi);
                    if (matches) {
                        for (var j = 0; j < matches.length; j++) {
                            var url = matches[j];
                            if (isValid(url)) {
                                var norm = normalize(url);
                                if (!seen[norm]) {
                                    seen[norm] = true;
                                    urls.push(url);
                                }
                            }
                        }
                    }
                }
                
                // Chercher dans toutes les images du DOM
                var images = document.getElementsByTagName('img');
                for (var i = 0; i < images.length; i++) {
                    var img = images[i];
                    var src = img.src || img.getAttribute('src');
                    if (src && src.indexOf('data:image') === -1) {
                        if (!src.startsWith('http')) {
                            src = 'https:' + src;
                        }
                        if (isValid(src)) {
                            var norm = normalize(src);
                            if (!seen[norm]) {
                                seen[norm] = true;
                                urls.push(src);
                            }
                        }
                    }
                }
                
                // Chercher aussi dans le HTML source complet pour être sûr
                var htmlContent = document.documentElement.innerHTML;
                var htmlMatches = htmlContent.match(/https?:\\/\\/[^\\s"']+blogspot[^\\s"']*\\.(jpg|jpeg|png|webp)(\\?[^\\s"']*)?/gi);
                if (htmlMatches) {
                    for (var k = 0; k < htmlMatches.length; k++) {
                        var url = htmlMatches[k];
                        if (isValid(url)) {
                            var norm = normalize(url);
                            if (!seen[norm]) {
                                seen[norm] = true;
                                urls.push(url);
                            }
                        }
                    }
                }
                
                return urls;
            """)
        
        if image_urls:
            print(f"URLs trouvées dans JavaScript: {len(image_urls)}")
            for img_url in image_urls:
                if is_valid_comic_page(img_url):
                    normalized = normalize_url(img_url)
                    if normalized not in seen_urls:
                        seen_urls.add(normalized)
                        pages.append({
                            'pageNumber': len(pages) + 1,
                            'imageUrl': img_url
                        })
        else:
            print("Aucune URL trouvée dans JavaScript")
        
        # Méthode 3: Chercher dans les scripts avec BeautifulSoup (fallback)
        if len(pages) < 5:
            scripts = soup.find_all('script')
            for script in scripts:
                script_content = script.string or script.get_text()
                if script_content:
                    matches = re.findall(
                        r'https?://[^\s"\']+blogspot[^\s"\']*\.(jpg|jpeg|png|webp)(\?[^\s"\']*)?',
                        script_content,
                        re.I
                    )
                    for match in matches:
                        img_url = match[0] if isinstance(match, tuple) else match
                        if is_valid_comic_page(img_url):
                            normalized = normalize_url(img_url)
                            if normalized not in seen_urls:
                                seen_urls.add(normalized)
                                pages.append({
                                    'pageNumber': len(pages) + 1,
                                    'imageUrl': img_url
                                })
        
        # Méthode 3: Chercher toutes les images blogspot
        if len(pages) < 5:
            all_images = soup.find_all('img')
            for img in all_images:
                img_url = img.get('src')
                if not img_url or 'data:image' in img_url:
                    continue
                
                if not img_url.startswith('http'):
                    img_url = 'https:' + img_url
                
                if is_valid_comic_page(img_url):
                    normalized = normalize_url(img_url)
                    if normalized not in seen_urls:
                        seen_urls.add(normalized)
                        pages.append({
                            'pageNumber': len(pages) + 1,
                            'imageUrl': img_url
                        })
        
        # Trier par numéro de page
        def get_page_number(page):
            match = re.search(r'rco(\d+)', page['imageUrl'], re.I)
            return int(match.group(1)) if match else page['pageNumber']
        
        pages.sort(key=get_page_number)
        
        # Réassigner les numéros
        for i, page in enumerate(pages, 1):
            page['pageNumber'] = i
        
        print(f"Pages trouvées: {len(pages)}")
        return pages
        
    finally:
        driver.quit()

def scrape_full_series(comic_url: str, max_chapters: Optional[int] = None, 
                       delay_between_chapters: float = 2.0,
                       delay_between_pages: float = 0.5) -> Dict:
    """Scrape une série complète avec tous ses chapitres et pages"""
    series = scrape_comic_series(comic_url)
    
    chapters_to_scrape = series['chapters']
    if max_chapters:
        chapters_to_scrape = chapters_to_scrape[:max_chapters]
    
    print(f"Scraping de {len(chapters_to_scrape)} chapitres...")
    
    for i, chapter in enumerate(chapters_to_scrape, 1):
        print(f"Chapitre {i}/{len(chapters_to_scrape)}: {chapter['title']}")
        try:
            pages = scrape_chapter_pages(chapter['url'], delay_between_pages)
            chapter['pages'] = pages
            chapter['pageCount'] = len(pages)
            
            if i < len(chapters_to_scrape):
                time.sleep(delay_between_chapters)
        except Exception as e:
            print(f"Erreur lors du scraping du chapitre {chapter['title']}: {e}")
    
    series['totalChapters'] = len(chapters_to_scrape)
    
    return series

def main():
    """Point d'entrée principal"""
    if len(sys.argv) < 2:
        print("""
Usage:
  python scraper.py <comic-url> [options]
  
Options:
  --max-chapters <number>    Limite le nombre de chapitres à scraper
  --output <path>            Chemin du fichier de sortie (défaut: ./data/<comic-id>.json)
  
Exemples:
  python scraper.py "https://readcomiconline.li/Comic/Batman-2025"
  python scraper.py "https://readcomiconline.li/Comic/Batman-2025" --max-chapters 5
  python scraper.py "https://readcomiconline.li/Comic/Batman-2025" --output ./data/batman.json
        """)
        sys.exit(1)
    
    comic_url = sys.argv[1]
    max_chapters = None
    output_path = None
    
    # Parser les arguments
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--max-chapters" and i + 1 < len(sys.argv):
            max_chapters = int(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == "--output" and i + 1 < len(sys.argv):
            output_path = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    print(f"\n🚀 Début du scraping de: {comic_url}")
    if max_chapters:
        print(f"📚 Limite: {max_chapters} chapitres")
    
    try:
        series = scrape_full_series(comic_url, max_chapters=max_chapters)
        
        # Générer un nom de fichier unique basé sur l'ID du comic si non spécifié
        if not output_path:
            # Nettoyer l'ID pour qu'il soit un nom de fichier valide
            comic_id = series.get('id', 'comic')
            # Remplacer les caractères invalides
            safe_id = re.sub(r'[^\w\-_\.]', '_', comic_id)
            output_path = f"./data/{safe_id}.json"
        
        print(f"💾 Sortie: {output_path}\n")
        
        scraped_data = {
            'series': series,
            'scrapedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
            'source': comic_url
        }
        
        # Créer le dossier si nécessaire
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Sauvegarder
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(scraped_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Scraping terminé avec succès!")
        print(f"📊 Statistiques:")
        print(f"   - Titre: {series['title']}")
        print(f"   - Chapitres: {series['totalChapters']}")
        total_pages = sum(ch['pageCount'] for ch in series['chapters'])
        print(f"   - Pages totales: {total_pages}")
        print(f"   - Fichier sauvegardé: {output_path}\n")
        
    except Exception as e:
        print(f"\n❌ Erreur lors du scraping: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

