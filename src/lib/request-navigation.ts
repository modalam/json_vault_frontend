const RETURN_PATH_KEY = 'jv_request_return_path';

export function getRequestReturnPath(): string {
  return sessionStorage.getItem(RETURN_PATH_KEY) || '/';
}

export function setRequestReturnPath(path: string): void {
  sessionStorage.setItem(RETURN_PATH_KEY, path);
}
