import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { isEndpointConfigured, streamAsk, type ChatMessage } from '../lib/ask';

export interface ChatSurfaceProps {
  // narrows what the worker answers about; omitted means the whole site
  scope?: string;
  suggestions?: string[];
  intro?: string;
  autoFocus?: boolean;
  className?: string;
  // lets a host show its "new chat" control only once there is one to discard
  onHasMessagesChange?: (hasMessages: boolean) => void;
}

// what hosts can drive from outside; the trigger buttons live in the hosts
export interface ChatSurfaceHandle {
  reset(): void;
}

// the offline notice renders as jsx so the address stays a real mailto link
type SurfaceMessage = ChatMessage & { error?: boolean };

const CONTACT_EMAIL = 'zali@di.ku.dk';
const OFFLINE_PREFIX = 'The assistant is offline right now. You can always reach Zaibei directly at ';
const OFFLINE_MESSAGE = `${OFFLINE_PREFIX}${CONTACT_EMAIL}.`;

const HISTORY_LIMIT = 12;
const NEAR_BOTTOM_PX = 80;

const DEFAULT_SUGGESTIONS = [
  'What does Zaibei research?',
  'What is OpenMMLA?',
  'Tell me about CoLA.',
  'How can I contact Zaibei?',
];

const DEFAULT_INTRO =
  "An assistant trained on Zaibei's work. Ask anything — it answers from his research, projects, and CV.";

// the floating panel unmounts as it closes, so transcripts live outside the
// component and come back on the next mount; one per conversation scope
const SITE_SCOPE = '__site__';
const transcripts = new Map<string, SurfaceMessage[]>();

// replies render as raw text, so any markdown the model slips in would show up as
// literal punctuation; strip the light formatting it actually reaches for
const stripMarkdown = (text: string): string =>
  text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n');

// the site's link styling — the same underline the offline notice's mailto
// carries, applied to every link found in an answer
const LINK_CLASS =
  'text-white/90 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white';

// hosts whose bare, protocol-less form actually turns up in answers: the
// worker's wikipedia pointer, and the repositories, papers, and profiles the
// knowledge base spells without a scheme. anything else has to carry an
// explicit http(s):// before it is treated as a link.
const LINK_HOSTS = [
  'wikipedia.org',
  'github.com',
  'github.io',
  'doi.org',
  'arxiv.org',
  'linkedin.com',
  'ucph-cola.org',
];

const URL_SOURCE = `https?://[^\\s<>]+|(?:[a-z0-9-]+\\.)*(?:${LINK_HOSTS.join('|').replace(
  /\./g,
  '\\.',
)})(?:/[^\\s<>]*)?`;

// a match glued to the preceding character is part of something longer — an
// address (zali@di.ku.dk), a path, a hostname we did not mean (notgithub.com)
const GLUED_BEFORE = /[\w@./-]/;

// punctuation that ends the sentence rather than the address
const TRAILING_PUNCTUATION = /[.,;:!?'"’”\]}，。、；：！？）】》…]/;

// peel sentence punctuation off the end of a match. a closing parenthesis only
// counts as punctuation when the match does not open one itself, so
// "(github.com/x)" loses its bracket while ".../Foo_(bar)" keeps it.
const splitTrailingPunctuation = (match: string): [string, string] => {
  let url = match;
  let tail = '';

  while (url) {
    const last = url[url.length - 1];
    if (last === ')') {
      const opened = (url.match(/\(/g) || []).length;
      const closed = (url.match(/\)/g) || []).length;
      if (closed <= opened) break;
    } else if (!TRAILING_PUNCTUATION.test(last)) {
      break;
    }
    tail = last + tail;
    url = url.slice(0, -1);
  }

  return [url, tail];
};

// turn the urls in an answer into real anchors at render time. elements are
// constructed, never markup: nothing here goes near innerHTML, so a link in the
// model's output cannot become anything but a link. text with no url comes back
// as the same string it went in as.
export function linkify(text: string): React.ReactNode {
  const pattern = new RegExp(URL_SOURCE, 'gi');
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const start = match.index;
    if (start > 0 && GLUED_BEFORE.test(text[start - 1])) continue;

    const [url] = splitTrailingPunctuation(match[0]);
    if (!url) continue;

    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      <a
        key={`${start}-${url}`}
        href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
        target="_blank"
        rel="noreferrer"
        className={LINK_CLASS}
      >
        {url}
      </a>,
    );

    cursor = start + url.length;
    // the punctuation we peeled off is text again, so rewind to it
    pattern.lastIndex = cursor;
  }

  if (nodes.length === 0) return text;
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

// a plus inside a speech bubble: the usual "start over" icon, drawn as strokes so
// it inherits whatever text colour the host button carries
const NewChatIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className="h-4 w-4"
  >
    <path d="M20.5 11.6a8.5 8.5 0 0 1-9.4 8.4L4 21l1-4.9a8.5 8.5 0 1 1 15.5-4.5Z" />
    <path d="M12 8.9v5.2" />
    <path d="M9.4 11.5h5.2" />
  </svg>
);

// the reset trigger both hosts render; kept here so the icon and hit target stay
// identical in the floating panel and the docked agent
export const NewChatButton: React.FC<{ onClick: () => void; className?: string }> = ({
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Start a new chat"
    title="Start a new chat"
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${className}`.trim()}
  >
    <NewChatIcon />
  </button>
);

export const ChatSurface = forwardRef<ChatSurfaceHandle, ChatSurfaceProps>(function ChatSurface(
  {
    scope,
    suggestions = DEFAULT_SUGGESTIONS,
    intro = DEFAULT_INTRO,
    autoFocus = false,
    className = '',
    onHasMessagesChange,
  },
  ref,
) {
  const scopeKey = scope || SITE_SCOPE;

  const [messages, setMessages] = useState<SurfaceMessage[]>(() => transcripts.get(scopeKey) ?? []);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // mirror of the transcript, so a send never reads a stale closure
  const historyRef = useRef<SurfaceMessage[]>(messages);
  const stickToBottomRef = useRef(true);
  const scopeRef = useRef(scopeKey);

  const commit = (next: SurfaceMessage[]) => {
    historyRef.current = next;
    transcripts.set(scopeRef.current, next);
    setMessages(next);
  };

  // the field is only worth raising (with its soft keyboard) on pointer devices
  const canRaiseInput = () =>
    autoFocus && window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;

  // drops the whole thread — including any refusal the classifier would keep
  // reading as an off-topic conversation — and hands back the empty state
  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    stickToBottomRef.current = true;
    commit([]);
    setInput('');
    setStreaming(false);
    if (canRaiseInput()) inputRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({ reset }));

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    // a new question supersedes whatever was still streaming
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    commit([...historyRef.current, { role: 'user', content: text }]);
    setInput('');
    setStreaming(true);
    stickToBottomRef.current = true;

    let reply = '';
    let opened = false;

    const appendOffline = () => {
      const next = historyRef.current.slice();
      const offline: SurfaceMessage = { role: 'assistant', content: OFFLINE_MESSAGE, error: true };
      // swap out a half-written answer rather than leaving it dangling
      if (opened) next[next.length - 1] = offline;
      else next.push(offline);
      commit(next);
    };

    try {
      if (!isEndpointConfigured) {
        throw new Error('The ask endpoint has not been configured yet.');
      }

      // the worker only needs recent turns, and never the offline notices
      const payload: ChatMessage[] = historyRef.current
        .filter((message) => !message.error)
        .slice(-HISTORY_LIMIT)
        .map(({ role, content }) => ({ role, content }));

      for await (const token of streamAsk(payload, { scope, signal: controller.signal })) {
        // a superseded request must not write over the newer turn
        if (controller.signal.aborted) return;
        reply += token;
        const next = historyRef.current.slice();
        if (opened) {
          next[next.length - 1] = { role: 'assistant', content: reply };
        } else {
          opened = true;
          next.push({ role: 'assistant', content: reply });
        }
        commit(next);
      }

      if (!reply.trim()) appendOffline();
    } catch {
      // an abort means another request took over, so leave the transcript alone
      if (!controller.signal.aborted) appendOffline();
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setStreaming(false);
      }
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (streaming) return;
    void send(input);
  };

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
  };

  // moving to another scope is a different conversation, not a continuation
  useEffect(() => {
    if (scopeRef.current === scopeKey) return;
    abortRef.current?.abort();
    abortRef.current = null;
    scopeRef.current = scopeKey;
    const restored = transcripts.get(scopeKey) ?? [];
    historyRef.current = restored;
    stickToBottomRef.current = true;
    setMessages(restored);
    setStreaming(false);
    setInput('');
  }, [scopeKey]);

  // follow the tokens down, unless the reader scrolled up to re-read something
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !stickToBottomRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, streaming]);

  // wait out the open transition before taking focus
  useEffect(() => {
    if (!canRaiseInput()) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 360);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // tell the host whether there is a conversation worth clearing, without making
  // the host memoise its callback
  const hasMessages = messages.length > 0;
  const notifyRef = useRef(onHasMessagesChange);

  useEffect(() => {
    notifyRef.current = onHasMessagesChange;
  });

  useEffect(() => {
    notifyRef.current?.(hasMessages);
  }, [hasMessages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const last = messages[messages.length - 1];
  const awaitingFirstToken = streaming && (!last || last.role === 'user');

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`.trim()}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hide-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4"
      >
        {messages.length === 0 && !streaming && (
          <div>
            {intro && <p className="mb-6 text-xs text-white/40 leading-relaxed">{intro}</p>}
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void send(question)}
                className="flex w-full items-center justify-between gap-4 border-t border-white/10 py-3 text-left text-sm text-white/60 transition-colors hover:text-white"
              >
                <span>{question}</span>
                <span className="text-white/25">→</span>
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => {
          if (message.role === 'user') {
            return (
              <div
                key={index}
                className="max-w-[85%] self-end rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80"
              >
                {message.content}
              </div>
            );
          }

          const isLast = index === messages.length - 1;
          return (
            <div
              key={index}
              // break-words keeps a long unbroken url (the wikipedia pointer) inside the panel
              className="max-w-[92%] self-start text-sm text-white/75 leading-relaxed whitespace-pre-wrap break-words"
            >
              {message.error ? (
                <>
                  {OFFLINE_PREFIX}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-white/90 underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </>
              ) : (
                <>
                  {linkify(stripMarkdown(message.content))}
                  {streaming && isLast && <span className="animate-pulse">▍</span>}
                </>
              )}
            </div>
          );
        })}

        {awaitingFirstToken && (
          <div className="max-w-[92%] self-start text-sm text-white/75 leading-relaxed">
            <span className="animate-pulse">▍</span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-3 border-t border-white/10 px-5 py-3"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything about Zaibei…"
          aria-label="Ask a question"
          autoComplete="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm text-white/60 transition-colors hover:border-white/60 hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          ↑
        </button>
      </form>
    </div>
  );
});
