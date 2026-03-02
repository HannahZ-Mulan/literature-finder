'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

interface Literature {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  doi: string;
  publication_date: string;
  journal: string;
  citation_count: number;
  source: string;
  keywords: string[] | null;
  notes: string | null;
  saved_at: string;
}

interface Category {
  id: number;
  user_id: number;
  name: string;
  sort_order: number;
  is_default: boolean;
}

interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

interface ReadingList {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
}

export function useLibrary(params?: { search?: string; page?: number; limit?: number; sort?: string; category_id?: number | null; tag_id?: number | null }) {
  const { token } = useAuth();
  const [data, setData] = useState<{ literature: Literature[]; pagination: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const fetchLibrary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.set('search', params.search);
        if (params?.page) queryParams.set('page', params.page.toString());
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.sort) queryParams.set('sort', params.sort);
        if (params?.category_id !== undefined && params?.category_id !== null) queryParams.set('category_id', params.category_id.toString());
        if (params?.tag_id !== undefined && params?.tag_id !== null) queryParams.set('tag_id', params.tag_id.toString());

        console.log('Fetching library with params:', params);
        const response = await fetch(`/api/literature/library?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch library');
        }
        const data = await response.json();
        console.log('Library data:', data);
        setData(data);
      } catch (err: any) {
        console.error('Error fetching library:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibrary();
  }, [token, params?.search, params?.page, params?.limit, params?.sort, params?.category_id, params?.tag_id]);

  return { data, isLoading, error };
}

export function useCategories() {
  const { token } = useAuth();
  const [data, setData] = useState<Category[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/categories', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setData(data.categories);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [token]);

  return { data, isLoading, error };
}

export function useTags() {
  const { token } = useAuth();
  const [data, setData] = useState<Tag[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchTags = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/tags', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch tags');
        const data = await response.json();
        setData(data.tags);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [token]);

  return { data, isLoading, error };
}

export function useReadingLists() {
  const { token } = useAuth();
  const [data, setData] = useState<ReadingList[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchReadingLists = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/reading-lists', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch reading lists');
        const data = await response.json();
        setData(data.reading_lists);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadingLists();
  }, [token]);

  return { data, isLoading, error };
}
