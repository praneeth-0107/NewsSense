import type { NewsCategory, UserProfile } from '../types';

export const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:3001/api'
  : '/api';

export async function apiRegister(username: string, password: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Registration failed');
  }

  const data = await response.json();
  return {
    username: data.username,
    password: password, // kept for client-side compatibility (though normally hidden)
    preferredCategories: data.preferredCategories
  };
}

export async function apiLogin(username: string, password: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Login failed');
  }

  const data = await response.json();
  return {
    username: data.username,
    password: password,
    preferredCategories: data.preferredCategories
  };
}

export async function apiUpdatePreferences(username: string, categories: NewsCategory[]): Promise<boolean> {
  const response = await fetch(`${API_BASE}/auth/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, categories })
  });

  if (!response.ok) return false;
  return true;
}

export async function apiUpdateProfile(oldUsername: string, newUsername: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldUsername, newUsername })
  });

  if (!response.ok) return false;
  return true;
}
