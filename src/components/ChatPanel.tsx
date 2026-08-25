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
