/** Development-only LAN targets are canonical private IPv4 addresses. */
export function isPrivateKliniAiHost(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || String(Number(part)) !== part || Number(part) > 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

/** Expo Go uses its packager's private address; web and ADB keep loopback. */
export function resolveKliniAiConnection({ endpoint, development, platform, expoHostUri }: { endpoint?: string; development: boolean; platform: string; expoHostUri?: string }): { endpoint?: string; lanHost?: string } {
  if (!endpoint?.trim() || !development || (platform !== 'ios' && platform !== 'android')) return { endpoint };
  const match = /^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/.exec(expoHostUri ?? '');
  if (!match || !isPrivateKliniAiHost(match[1]) || Number(match[2]) < 1 || Number(match[2]) > 65535) return { endpoint };
  let url: URL;
  try { url = new URL(endpoint.trim()); } catch { return { endpoint }; }
  if (url.protocol !== 'http:' || url.port !== '8098' || url.pathname !== '/chat' || url.username || url.password || url.search || url.hash) return { endpoint };
  const lanHost = match[1];
  if (['127.0.0.1', 'localhost', '10.0.2.2', '[::1]'].includes(url.hostname)) url.hostname = lanHost;
  return url.hostname === lanHost ? { endpoint: url.href, lanHost } : { endpoint };
}
