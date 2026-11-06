const projectId = '8787c644-648d-490b-8a91-ad09ced1e3e0';
export function allowedOrigin(origin: string) {
  if (origin === 'http://localhost:8080' || origin === 'https://clip-universe.lovable.app' || origin === 'https://preview--clip-universe.lovable.app') return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.port) return false;
    return url.hostname === `${projectId}.lovableproject.com`
      || new RegExp(`^${projectId}-(?:thr_[a-zA-Z0-9_-]+)\\.lovableproject\\.com$`).test(url.hostname)
      || new RegExp(`^[a-zA-Z0-9-]+-(?:s|l)\\.${projectId}\\.lovableproject\\.com$`).test(url.hostname)
      || new RegExp(`^id-preview(?:[a-zA-Z0-9-]*)--${projectId}\\.lovable\\.app$`).test(url.hostname);
  } catch { return false; }
}