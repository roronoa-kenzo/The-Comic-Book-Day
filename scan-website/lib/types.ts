export interface ComicPage {
  pageNumber: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface ComicChapter {
  id: string;
  title: string;
  url: string;
  pages: ComicPage[];
  pageCount: number;
}

export interface ComicSeries {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  author?: string;
  publisher?: string;
  genres?: string[];
  status?: string;
  url: string;
  chapters: ComicChapter[];
  totalChapters: number;
}

export interface ScrapedData {
  series: ComicSeries;
  scrapedAt: string;
  source: string;
}

