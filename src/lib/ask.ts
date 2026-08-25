export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// scope is the id of the project page the visitor is reading. the worker uses
// it to pick a server-side knowledge block; it validates the value against its
// own list, so an unknown id comes back as a 400 rather than being ignored.
export type AskOptions = { scope?: string; signal?: AbortSignal };

// the deployed cloudflare worker (VITE_ASK_ENDPOINT overrides it at build time)
const DEFAULT_ENDPOINT = 'https://ask-zaibei.lizaibeim.workers.dev';

const envEndpoint = (import.meta.env.VITE_ASK_ENDPOINT as string | undefined)?.trim();

export const ASK_ENDPOINT: string = envEndpoint || DEFAULT_ENDPOINT;

// an unsubstituted placeholder host means nobody has wired a worker up yet
export const isEndpointConfigured =
  /^https?:\/\/[^/]+/.test(ASK_ENDPOINT) && !ASK_ENDPOINT.includes('YOUR-SUBDOMAIN');

const SSE_PREFIX = 'data:';
const SSE_DONE = '[DONE]';

// pull the incremental token out of one openai-style chunk
const extractDelta = (payload: string): string => {
  let chunk: any;
  try {
    chunk = JSON.parse(payload);
  } catch {
    // a chunk that will not parse is usually a keepalive or a split frame, but it
    // can also be a real delta the model broke — an unescaped quote in a paper
    // title once silently ate a word here and the reader saw a mangled sentence.
    // dropping it stays the right call (a half-parsed frame is not text), but it
    // must not be invisible: a swallowed word is a bug worth seeing in the console.
    if (payload && payload !== '[DONE]' && payload.includes('"delta"')) {
      console.warn('[ask] dropped an unparseable stream chunk:', payload.slice(0, 200));
    }
    return '';
  }

  if (chunk?.error) {
    const message = typeof chunk.error === 'string' ? chunk.error : chunk.error?.message;
    throw new Error(message || 'The assistant failed mid-answer.');
  }

  const delta = chunk?.choices?.[0]?.delta?.content;
  return typeof delta === 'string' ? delta : '';
};

// read whatever the worker put in the body of a failed response
const readErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `The assistant returned ${response.status} ${response.statusText}`.trim();
  try {
    const raw = (await response.text()).trim();
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      const message =
        typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message || parsed?.message;
      return typeof message === 'string' && message ? message : raw;
    } catch {
      return raw;
    }
  } catch {
    return fallback;
  }
};

// the second argument used to be a bare AbortSignal; both shapes still work.
const toOptions = (arg?: AskOptions | AbortSignal): AskOptions => {
  if (!arg) return {};
  if (typeof AbortSignal !== 'undefined' && arg instanceof AbortSignal) return { signal: arg };
  return arg as AskOptions;
};

export async function* streamAsk(
  messages: ChatMessage[],
  options?: AskOptions | AbortSignal,
): AsyncGenerator<string> {
  const { scope, signal } = toOptions(options);
  const trimmedScope = typeof scope === 'string' ? scope.trim() : '';

  const response = await fetch(ASK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // omit the key entirely when there is no scope — the worker rejects a
    // present-but-empty one, and site-wide questions should not carry it
    body: JSON.stringify(trimmedScope ? { messages, scope: trimmedScope } : { messages }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (!response.body) {
    throw new Error('The assistant returned an empty response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // consume every complete line, leave the trailing partial one in the buffer
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');

        if (!line.startsWith(SSE_PREFIX)) continue;
        const payload = line.slice(SSE_PREFIX.length).trim();
        if (payload === SSE_DONE) return;

        const delta = extractDelta(payload);
        if (delta) yield delta;
      }
    }

    // flush anything the stream left without a closing newline
    const tail = (buffer + decoder.decode()).trim();
    if (tail.startsWith(SSE_PREFIX)) {
      const payload = tail.slice(SSE_PREFIX.length).trim();
      if (payload !== SSE_DONE) {
        const delta = extractDelta(payload);
        if (delta) yield delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
