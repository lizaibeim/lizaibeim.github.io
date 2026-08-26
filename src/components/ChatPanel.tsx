import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChatSurface, NewChatButton, type ChatSurfaceHandle } from './ChatSurface';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

// the floating chrome only: positioning, the open/close transition, and the
// dialog affordances. the conversation itself lives in ChatSurface
export const ChatPanel: React.FC<ChatPanelProps> = ({ open, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<ChatSurfaceHandle>(null);
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // take focus into the dialog on every viewport so it is announced and reachable;
  // ChatSurface decides on its own whether to raise the input field
  useLayoutEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  // a phone keyboard does not resize the page, it pans the visual viewport to bring the
  // focused field into view. a fixed element is positioned against the LAYOUT viewport,
  // so the panel gets panned out from under the visitor — and because html, body and
  // #root are all overflow:hidden, there is no scrollable ancestor left for the browser
  // to put back afterwards. dismissing the keyboard therefore stranded the page at an
  // offset with every tap landing somewhere it could not see, which reads as a freeze.
  //
  // gluing the panel to the visual viewport fixes both halves: it stays where the
  // visitor is looking, and the browser has no reason to pan in the first place.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = panelRef.current;
    if (!open || !vv || !el) return;

    const wide = window.matchMedia('(min-width: 768px)');
    const clear = () => {
      el.style.top = '';
      el.style.height = '';
    };

    const sync = () => {
      // from md up the panel is a floating card the keyboard never covers, and the
      // inline values would fight the classes that place it
      if (wide.matches) return clear();
      // resting on NO inline styles is the point. the panel is only pinned while a
      // keyboard is genuinely covering it, so a missed or stale event leaves a correct
      // full-bleed panel rather than one stranded at the keyboard's geometry — which is
      // exactly how the page ended up untappable before.
      const covered = window.innerHeight - vv.height;
      if (covered < 80 && vv.offsetTop < 8) return clear();
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
    };

    // a keyboard animates, so the geometry that arrives with the event is not the
    // geometry it settles on. re-reading twice afterwards costs nothing and is what
    // makes the restore reliable rather than a race.
    const timers: number[] = [];
    const resync = () => {
      sync();
      timers.push(window.setTimeout(sync, 140), window.setTimeout(sync, 360));
    };

    resync();
    vv.addEventListener('resize', resync);
    vv.addEventListener('scroll', sync);
    wide.addEventListener('change', sync);
    // dismissing the keyboard blurs the field, and on some browsers that is the only
    // signal that arrives at all
    el.addEventListener('focusout', resync);
    return () => {
      timers.forEach(window.clearTimeout);
      vv.removeEventListener('resize', resync);
      vv.removeEventListener('scroll', sync);
      wide.removeEventListener('change', sync);
      el.removeEventListener('focusout', resync);
      clear();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-panel"
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-label="Ask Zaibei chat"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          // full-bleed below md, the floating card from md up. dvh so the panel is the
          // height ios is showing rather than the taller one it reports with the url bar
          // hidden, and inset-0 rides along as the fallback a browser without dvh lands
          // on. the safe-area padding sits on the panel rather than on its rows, so the
          // header clears the notch and the form clears the home indicator while the
          // panel's own ground still runs to the edge of the screen.
          //
          // no scroll lock: html/body/#root are already overflow:hidden (index.css) and
          // the page's real scroller is this panel's sibling, so a touch here has no
          // scrollable ancestor to chain into.
          className="fixed z-50 inset-0 h-[100dvh] p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)] md:top-auto md:right-8 md:bottom-8 md:left-auto md:w-[380px] md:h-[min(560px,75vh)] md:p-0 flex flex-col overflow-hidden rounded-none border-0 border-white/10 md:rounded-2xl md:border bg-[#0a0a0a]/95 backdrop-blur-md focus:outline-none"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">Ask</div>
              <div className="font-display italic text-xl text-white/90 leading-tight">Zaibei.</div>
            </div>
            <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1">
              {hasMessages && <NewChatButton onClick={() => surfaceRef.current?.reset()} />}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close chat"
                // 44px of thumb below md: full-bleed makes this the only way out, and
                // it sits in the corner a hand reaches for last
                className="flex h-11 w-11 md:h-8 md:w-8 shrink-0 items-center justify-center text-lg leading-none text-white/40 transition-colors hover:text-white"
              >
                ×
              </button>
            </div>
          </div>

          <ChatSurface
            ref={surfaceRef}
            autoFocus
            onHasMessagesChange={setHasMessages}
            className="flex-1"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
