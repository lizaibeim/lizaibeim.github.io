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
          className="fixed z-50 inset-x-3 bottom-3 h-[72vh] md:left-auto md:right-8 md:bottom-8 md:w-[380px] md:h-[min(560px,75vh)] flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md focus:outline-none"
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
                className="flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none text-white/40 transition-colors hover:text-white"
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
