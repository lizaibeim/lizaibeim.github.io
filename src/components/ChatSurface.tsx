import React, { useEffect, useRef, useState } from 'react';
import { isEndpointConfigured, streamAsk, type ChatMessage } from '../lib/ask';

export interface ChatSurfaceProps {
  // narrows what the worker answers about; omitted means the whole site
  scope?: string;
  suggestions?: string[];
  intro?: string;
  autoFocus?: boolean;
  className?: string;
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

export const ChatSurface: React.FC<ChatSurfaceProps> = ({
  scope,
  suggestions = DEFAULT_SUGGESTIONS,
  intro = DEFAULT_INTRO,
  autoFocus = false,
  className = '',
}) => {
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

  // only raise the field (and a soft keyboard) on pointer devices
  useEffect(() => {
    if (!autoFocus) return;
    if (!window.matchMedia('(min-width: 768px) and (pointer: fine)').matches) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 360);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

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
              className="max-w-[92%] self-start text-sm text-white/75 leading-relaxed whitespace-pre-wrap"
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
                  {stripMarkdown(message.content)}
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
};
