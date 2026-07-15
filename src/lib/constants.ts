export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
export const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173';

export function blobPageUrl(id: string): string {
  return `${APP_URL}/b/${id}`;
}

export function blobApiHint(_id: string): string {
  return `${API_URL}/api/v1/getblobs`;
}
