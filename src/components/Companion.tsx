import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CompanionSprite, type SpriteFacing, type SpriteState } from './CompanionSprite';

interface CompanionProps {
  onOpenChat: () => void;
  hidden: boolean;
}

const SPRITE_SIZE = 64;
const HALF = SPRITE_SIZE / 2;

// the tracked position is the sprite's centre, so this keeps the whole 64px box
// comfortably on screen no matter where the cursor goes
const EDGE_MARGIN = 40;
// resting spot when there is nothing to follow: a plain bottom-right action button
const PARK_MARGIN = 20;

// the character stands beside the cursor rather than under it
const SIDE_OFFSET = 46;
// deeper than HALF so the hit box never straddles the row the cursor is clicking
const BELOW_OFFSET = 54;
// the 64px box must clear the cursor, so the target has to stay this far from it
const MIN_CLEAR = HALF + 8;
// px per 60hz frame — a capped step, not a lerp, so the pace reads as walking
const WALK_SPEED = 4.5;
const DEAD_ZONE = 14;
// how far the cursor must cross the character before it swaps shoulders
const SIDE_HYSTERESIS = 6;
// hold the walk state across settling frames so the 0.6s cycle can actually play
const WALK_LATCH = 260;

const HINT_DWELL = 350;
const IDLE_PROMPT_AFTER = 12000;
const IDLE_PROMPT_FOR = 5000;
const MAX_IDLE_PROMPTS = 2;

// room a side needs before the bubble prefers it
const BUBBLE_ROOM = 250;
// the bubble hangs this far inside the wrapper edge it is anchored to
const BUBBLE_INSET = HALF - 16;
// 220px of text plus the horizontal padding and borders
const BUBBLE_MAX_W = 246;
// breathing room between the bubble and the viewport edge
const BUBBLE_GAP = 8;
// three wrapped lines at leading-snug plus py-2 and borders
const MAX_BUBBLE_H = 68;
// centre -> wrapper edge -> the 8px gap -> the bubble itself
const BUBBLE_ROOM_Y = HALF + BUBBLE_GAP + MAX_BUBBLE_H;

const IDLE_PROMPT_TEXT = "Ask me about Zaibei's work →";
const HOVER_TEXT = 'Click to ask me anything';
const ARIA_LABEL = "Ask me about Zaibei's work";

// anything the visitor could be aiming at when the character is standing over it
const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, summary, label, [role="button"], [tabindex]:not([tabindex="-1"])';

type BubbleSide = 'right' | 'left';
type BubblePlace = 'above' | 'below';

const readEnv = () => ({
  // coarse pointers get a parked button instead of a follower
  hoverNone: typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches,
  reduceMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
});

export const Companion: React.FC<CompanionProps> = ({ onOpenChat, hidden }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [env, setEnv] = useState(readEnv);
  const parked = env.hoverNone || env.reduceMotion;

  const [facing, setFacing] = useState<SpriteFacing>('left');
  const [spriteState, setSpriteState] = useState<SpriteState>('idle');
  const [hint, setHint] = useState<string | null>(null);
  const [idlePrompt, setIdlePrompt] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [bubbleSide, setBubbleSide] = useState<BubbleSide>('right');
  const [bubblePlace, setBubblePlace] = useState<BubblePlace>('above');
  // once the fade has finished the sprite leaves the tree, which stops its css animations
  const [faded, setFaded] = useState(hidden);

  // hovering the character itself always wins: it is the click affordance
  const bubbleText = hidden ? null : hovered ? HOVER_TEXT : hint ?? (idlePrompt ? IDLE_PROMPT_TEXT : null);

  // everything the rAF loop reads lives in refs — the loop never touches react state
  const posRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0, seen: false });
  const sideRef = useRef(1);
  const followRef = useRef(true);
  const hiddenRef = useRef(hidden);
  const hoveredRef = useRef(false);
  const talkingRef = useRef(false);
  const facingRef = useRef<SpriteFacing>('left');
  const stateRef = useRef<SpriteState>('idle');
  const bubbleSideRef = useRef<BubbleSide>('right');
  const bubblePlaceRef = useRef<BubblePlace>('above');
  const lastStepRef = useRef(-Infinity);
  // set while the character is standing over a real control and letting clicks through
  const passThroughRef = useRef(false);

  const lastMoveRef = useRef(Date.now());
  const idleShownRef = useRef(0);
  const idleHideRef = useRef<number | null>(null);
  const dwellRef = useRef<number | null>(null);
  const hintElRef = useRef<Element | null>(null);
  // only a keyboard-opened panel earns its focus back
  const restoreFocusRef = useRef(false);
  const wasHiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
  }, [hidden]);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  // watch the two environment queries so a mid-session change is picked up
  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: none)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setEnv({ hoverNone: hoverQuery.matches, reduceMotion: motionQuery.matches });
    hoverQuery.addEventListener('change', sync);
    motionQuery.addEventListener('change', sync);
    return () => {
      hoverQuery.removeEventListener('change', sync);
      motionQuery.removeEventListener('change', sync);
    };
  }, []);

  const paint = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    // whole pixels keep the sprite's hairlines crisp while it moves
    el.style.transform = `translate3d(${Math.round(x - HALF)}px, ${Math.round(y - HALF)}px, 0)`;
    // the bubble hangs off the sprite, so its room moves with the sprite; custom
    // properties keep that measurement off the react render path
    const roomRight = window.innerWidth - (x - HALF + BUBBLE_INSET) - BUBBLE_GAP;
    const roomLeft = x + HALF - BUBBLE_INSET - BUBBLE_GAP;
    el.style.setProperty('--bubble-room-right', `${Math.max(0, Math.round(roomRight))}px`);
    el.style.setProperty('--bubble-room-left', `${Math.max(0, Math.round(roomLeft))}px`);
  }, []);

  const clampX = useCallback(
    (x: number) => Math.min(Math.max(x, EDGE_MARGIN), Math.max(EDGE_MARGIN, window.innerWidth - EDGE_MARGIN)),
    [],
  );

  const clampY = useCallback(
    (y: number) => Math.min(Math.max(y, EDGE_MARGIN), Math.max(EDGE_MARGIN, window.innerHeight - EDGE_MARGIN)),
    [],
  );

  const applyBubbleSide = useCallback((x: number) => {
    const roomRight = window.innerWidth - x;
    const roomLeft = x;
    // prefer the side that has room: flip left only once the right has run out and
    // the left can take it, and on a window too narrow for either take the roomier
    // one — the max-width clamp then keeps the bubble inside the viewport
    const next: BubbleSide =
      roomRight >= BUBBLE_ROOM
        ? 'right'
        : roomLeft >= BUBBLE_ROOM
          ? 'left'
          : roomLeft > roomRight
            ? 'left'
            : 'right';
    if (bubbleSideRef.current === next) return;
    bubbleSideRef.current = next;
    setBubbleSide(next);
  }, []);

  const applyBubblePlace = useCallback((y: number) => {
    const roomAbove = y >= BUBBLE_ROOM_Y;
    const roomBelow = window.innerHeight - y >= BUBBLE_ROOM_Y;
    // only duck under the sprite when the top is short and the bottom really has room
    const next: BubblePlace = !roomAbove && roomBelow ? 'below' : 'above';
    if (bubblePlaceRef.current === next) return;
    bubblePlaceRef.current = next;
    setBubblePlace(next);
  }, []);

  const applyFacing = useCallback((next: SpriteFacing) => {
    if (facingRef.current === next) return;
    facingRef.current = next;
    setFacing(next);
  }, []);

  const applyState = useCallback((next: SpriteState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    setSpriteState(next);
  }, []);

  // hand the pointer back once the cursor has left the button it was let through
  const releasePassThrough = useCallback((x: number, y: number) => {
    if (!passThroughRef.current) return;
    const el = buttonRef.current;
    const rect = el?.getBoundingClientRect();
    if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return;
    passThroughRef.current = false;
    if (el) el.style.pointerEvents = '';
  }, []);

  const park = useCallback(() => {
    posRef.current.x = Math.max(EDGE_MARGIN, window.innerWidth - PARK_MARGIN - HALF);
    posRef.current.y = Math.max(EDGE_MARGIN, window.innerHeight - PARK_MARGIN - HALF);
    paint();
    applyBubbleSide(posRef.current.x);
    applyBubblePlace(posRef.current.y);
    applyFacing('left');
  }, [paint, applyBubbleSide, applyBubblePlace, applyFacing]);

  // place the character before the first paint so it never flashes at the origin
  useLayoutEffect(() => {
    park();
  }, [park]);

  // re-park or re-clamp whenever the viewport changes shape
  useEffect(() => {
    const onResize = () => {
      if (parked || !pointerRef.current.seen) {
        park();
        return;
      }
      posRef.current.x = clampX(posRef.current.x);
      posRef.current.y = clampY(posRef.current.y);
      paint();
      applyBubbleSide(posRef.current.x);
      applyBubblePlace(posRef.current.y);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [parked, park, clampX, clampY, paint, applyBubbleSide, applyBubblePlace]);

  // entering a parked mode has no walk loop to carry the sprite home, so place it directly
  useEffect(() => {
    if (!parked) return;
    park();
  }, [parked, park]);

  // (hover: none) removes the listeners that would otherwise retract a bubble
  useEffect(() => {
    if (!env.hoverNone) return;
    hintElRef.current = null;
    followRef.current = false;
    setHint(null);
    setIdlePrompt(false);
    setHovered(false);
  }, [env.hoverNone]);

  // parked modes have no walk loop, so drive the sprite straight off the bubble
  useEffect(() => {
    talkingRef.current = bubbleText !== null;
    if (parked) {
      applyState(bubbleText !== null ? 'talking' : 'idle');
    }
  }, [bubbleText, parked, applyState]);

  // pointer tracking: needed for the idle prompt even when the walk loop is off,
  // but pointless on a device that has no hover at all
  useEffect(() => {
    if (env.hoverNone) return;

    const onMove = (event: MouseEvent) => {
      const pointer = pointerRef.current;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.seen = true;
      followRef.current = true;
      lastMoveRef.current = Date.now();
      releasePassThrough(event.clientX, event.clientY);
    };

    // cursor left the window entirely — stand still rather than drift to an edge
    const onLeave = () => {
      followRef.current = false;
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [env.hoverNone, releasePassThrough]);

  // the walk loop
  useEffect(() => {
    if (parked || hidden) return;

    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      raf = requestAnimationFrame(step);

      // normalise against 60hz so a 120hz display does not double the pace
      const dt = Math.min(3, Math.max(0.2, (now - last) / 16.6667));
      last = now;

      const pointer = pointerRef.current;
      const pos = posRef.current;

      // freeze while the cursor is on the character, otherwise it flees the click
      if (!pointer.seen || !followRef.current || hoveredRef.current) {
        applyState(talkingRef.current ? 'talking' : 'idle');
        return;
      }

      // keep to whichever shoulder it is already on until the cursor crosses over
      if (Math.abs(pos.x - pointer.x) > SIDE_HYSTERESIS) {
        sideRef.current = pos.x > pointer.x ? 1 : -1;
      }

      // near a viewport edge the clamp would drag the body onto the cursor, so take
      // the other shoulder when this one has run out of room
      const roomRight = window.innerWidth - EDGE_MARGIN - pointer.x >= MIN_CLEAR;
      const roomLeft = pointer.x - EDGE_MARGIN >= MIN_CLEAR;
      if (sideRef.current === 1 && !roomRight && roomLeft) sideRef.current = -1;
      else if (sideRef.current === -1 && !roomLeft && roomRight) sideRef.current = 1;

      const targetX = clampX(pointer.x + sideRef.current * SIDE_OFFSET);
      // neither side fits (window narrower than ~2*MIN_CLEAR): stand clear below instead
      const targetY = clampY(pointer.y + BELOW_OFFSET + (roomLeft || roomRight ? 0 : HALF));
      const dx = targetX - pos.x;
      const dy = targetY - pos.y;
      const distance = Math.hypot(dx, dy);

      if (distance >= DEAD_ZONE) {
        const stride = Math.min(WALK_SPEED * dt, distance);
        const stepX = (dx / distance) * stride;
        pos.x += stepX;
        pos.y += (dy / distance) * stride;

        if (Math.abs(stepX) > 0.35) applyFacing(stepX > 0 ? 'right' : 'left');
        lastStepRef.current = now;
        paint();
        applyBubbleSide(pos.x);
        applyBubblePlace(pos.y);
      }

      // a lone settling frame inside the dead zone must not drop the walk cycle
      applyState(
        now - lastStepRef.current < WALK_LATCH
          ? 'walking'
          : talkingRef.current
            ? 'talking'
            : 'idle',
      );
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [
    parked,
    hidden,
    clampX,
    clampY,
    paint,
    applyFacing,
    applyState,
    applyBubbleSide,
    applyBubblePlace,
  ]);

  // hover hints from anywhere on the page
  useEffect(() => {
    if (env.hoverNone) return;

    const clearDwell = () => {
      if (dwellRef.current !== null) {
        window.clearTimeout(dwellRef.current);
        dwellRef.current = null;
      }
    };

    const onOver = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const el = target?.closest?.('[data-companion-hint]') ?? null;
      if (!el || el === hintElRef.current) return;

      const text = el.getAttribute('data-companion-hint');
      if (!text) return;

      hintElRef.current = el;
      clearDwell();
      // a dwell delay so sweeping the cursor across the page does not spam bubbles
      dwellRef.current = window.setTimeout(() => {
        dwellRef.current = null;
        if (hiddenRef.current) return;
        setHint(text);
      }, HINT_DWELL);
    };

    const onOut = (event: MouseEvent) => {
      const el = hintElRef.current;
      if (!el) return;
      const left = (event.target as Element | null)?.closest?.('[data-companion-hint]') ?? null;
      if (left !== el) return;
      // moving between children of the same element is not a real exit
      const related = event.relatedTarget as Node | null;
      if (related && el.contains(related)) return;

      hintElRef.current = null;
      clearDwell();
      setHint(null);
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      clearDwell();
    };
  }, [env.hoverNone]);

  // a couple of gentle nudges per session when the cursor has gone still
  useEffect(() => {
    if (env.hoverNone) return;

    const tick = window.setInterval(() => {
      // a backgrounded tab must not burn the per-session allowance on nobody
      if (document.hidden) return;
      if (hiddenRef.current || idleShownRef.current >= MAX_IDLE_PROMPTS) return;
      // the hover bubble outranks the prompt, so firing now would spend it unseen
      if (hoveredRef.current || hintElRef.current || idleHideRef.current !== null) return;
      if (Date.now() - lastMoveRef.current < IDLE_PROMPT_AFTER) return;

      idleShownRef.current += 1;
      // treat the prompt as activity so the next one needs a fresh quiet spell
      lastMoveRef.current = Date.now();
      setIdlePrompt(true);
      idleHideRef.current = window.setTimeout(() => {
        idleHideRef.current = null;
        setIdlePrompt(false);
      }, IDLE_PROMPT_FOR);
    }, 1000);

    // time spent away is not time the visitor sat still looking at the page
    const onVisibility = () => {
      if (!document.hidden) lastMoveRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisibility);
      if (idleHideRef.current !== null) {
        window.clearTimeout(idleHideRef.current);
        idleHideRef.current = null;
      }
    };
  }, [env.hoverNone]);

  // the panel takes over the screen: drop every bubble on the way out
  useEffect(() => {
    if (!hidden) return;
    hintElRef.current = null;
    if (dwellRef.current !== null) {
      window.clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
    if (idleHideRef.current !== null) {
      window.clearTimeout(idleHideRef.current);
      idleHideRef.current = null;
    }
    passThroughRef.current = false;
    if (buttonRef.current) buttonRef.current.style.pointerEvents = '';
    setHint(null);
    setIdlePrompt(false);
    setHovered(false);
  }, [hidden]);

  // an opacity-0 element still runs its css animations, so take it out of the tree
  useEffect(() => {
    if (!hidden) {
      setFaded(false);
      return;
    }
    const timer = window.setTimeout(() => setFaded(true), 300);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  // a keyboard visitor who closed the panel would otherwise land back on <body>
  useEffect(() => {
    const justClosed = wasHiddenRef.current && !hidden;
    wasHiddenRef.current = hidden;
    if (!justClosed || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    // do not steal focus if the visitor moved it somewhere themselves
    const active = document.activeElement;
    const stranded =
      !active || active === document.body || active.closest('[role="dialog"]') !== null;
    if (stranded) buttonRef.current?.focus();
  }, [hidden]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // keyboard activation dispatches a click with detail 0
      restoreFocusRef.current =
        event.detail === 0 || buttonRef.current?.matches(':focus-visible') === true;
      onOpenChat();
    },
    [onOpenChat],
  );

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // only a following character can end up on top of something, and only a mouse
      // gets the move events that hand the pointer back afterwards
      if (parked || event.pointerType !== 'mouse') {
        setHovered(true);
        return;
      }
      const below = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((el) => !wrapperRef.current?.contains(el));
      if (below?.closest(INTERACTIVE_SELECTOR)) {
        // a real control is underneath: step aside instead of stealing its click
        passThroughRef.current = true;
        event.currentTarget.style.pointerEvents = 'none';
        return;
      }
      setHovered(true);
    },
    [parked],
  );

  return (
    <div
      ref={wrapperRef}
      inert={hidden}
      className={`pointer-events-none fixed top-0 left-0 z-40 transition-opacity duration-300 ${
        hidden ? 'opacity-0' : 'opacity-100 will-change-transform'
      }`}
      style={{
        width: SPRITE_SIZE,
        height: SPRITE_SIZE,
        display: hidden && faded ? 'none' : undefined,
      }}
    >
      <AnimatePresence mode="wait">
        {bubbleText && (
          <motion.div
            key={bubbleText}
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.92, y: bubblePlace === 'above' ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: bubblePlace === 'above' ? 2 : -2 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              transformOrigin: `${bubblePlace === 'above' ? 'bottom' : 'top'} ${
                bubbleSide === 'right' ? 'left' : 'right'
              }`,
              // never wider than the viewport room the anchored edge actually has
              maxWidth: `min(${BUBBLE_MAX_W}px, var(--bubble-room-${bubbleSide}, ${BUBBLE_MAX_W}px))`,
              ...(bubbleSide === 'right' ? { left: BUBBLE_INSET } : { right: BUBBLE_INSET }),
            }}
            className={`pointer-events-none absolute w-max rounded-xl border border-white/15 bg-[#0f0b1a]/95 px-3 py-2 text-xs text-white/80 shadow-[0_10px_34px_-10px_rgba(139,92,246,0.6)] ${
              bubblePlace === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <span className="block max-w-[220px] leading-snug">{bubbleText}</span>
            {/* rotated square: the two bordered edges become the pointer */}
            <span
              className={`absolute h-2.5 w-2.5 rotate-45 border-white/15 bg-[#0f0b1a] ${
                bubblePlace === 'above'
                  ? '-bottom-[5px] border-r border-b'
                  : '-top-[5px] border-l border-t'
              }`}
              style={bubbleSide === 'right' ? { left: 12 } : { right: 12 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* the art is decoration; only the small button below it takes the pointer */}
      <span
        className="pointer-events-none absolute inset-0 block transition-transform duration-200 ease-out"
        style={{ transform: hovered ? 'scale(1.08)' : 'scale(1)' }}
      >
        <CompanionSprite facing={facing} state={spriteState} size={SPRITE_SIZE} />
      </span>

      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={() => setHovered(false)}
        onFocus={(event) => {
          // restored focus after a mouse click should not pop the bubble
          if (event.target.matches(':focus-visible')) setHovered(true);
        }}
        onBlur={() => setHovered(false)}
        aria-label={ARIA_LABEL}
        aria-haspopup="dialog"
        className="pointer-events-auto absolute top-1/2 left-1/2 h-11 w-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      />
    </div>
  );
};
