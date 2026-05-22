import type { Article, NewsCategory } from '../types';
import { API_BASE } from './api';

async function fetchNews(url: string): Promise<Article[]> {
  const response = await fetch(url);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to load news');
  }
  
  if (data.status !== 'ok') {
    throw new Error(data.message || 'Failed to load news');
  }
  
  return data.articles as Article[];
}

export async function fetchTopHeadlines(page = 1): Promise<Article[]> {
  const url = `${API_BASE}/news/top-headlines?country=us&pageSize=12&page=${page}`;
  return fetchNews(url);
}

export async function searchNews(query: string, page = 1): Promise<Article[]> {
  const url = `${API_BASE}/news/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=12&page=${page}`;
  return fetchNews(url);
}

export async function fetchCategoryNews(category: NewsCategory, page = 1): Promise<Article[]> {
  const url = `${API_BASE}/news/top-headlines?category=${category.toLowerCase()}&country=us&pageSize=10&page=${page}`;
  return fetchNews(url);
}

export async function fetchFilteredNews(params: {
  keywords: string;
  source: string;
  page?: number;
}): Promise<Article[]> {
  const queryParams = new URLSearchParams({
    q: params.keywords,
    sortBy: 'relevancy',
    language: 'en',
    pageSize: '12',
    page: String(params.page || 1),
  });
  if (params.source) {
    queryParams.set('sources', params.source);
  }
  const url = `${API_BASE}/news/everything?${queryParams.toString()}`;
  return fetchNews(url);
}
