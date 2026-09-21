export function micErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (!window.isSecureContext) return 'The microphone needs HTTPS. Open the https:// address instead.';
  if (name === 'NotAllowedError') {
    return 'Microphone access is blocked. In Safari tap "aA" → Website Settings → Microphone → Allow (or Settings → Apps → Safari → Microphone), then reload.';
  }
  if (name === 'NotFoundError') return 'No microphone was found.';
  return `Could not start the microphone (${name || String(e)}).`;
}
