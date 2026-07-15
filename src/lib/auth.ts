const PREFIX = 'jv_edit_token:';

export function getEditToken(blobId: string): string | null {
  try {
    return localStorage.getItem(`${PREFIX}${blobId}`);
  } catch {
    return null;
  }
}

export function setEditToken(blobId: string, token: string): void {
  try {
    localStorage.setItem(`${PREFIX}${blobId}`, token);
  } catch {
    // ignore quota / private mode
  }
}

export function clearEditToken(blobId: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${blobId}`);
  } catch {
    // ignore
  }
}
