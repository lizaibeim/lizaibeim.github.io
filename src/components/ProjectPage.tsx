import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CompanionSprite,
  VIGNETTE_IDS,
  VIGNETTE_MS,
  spriteSlotOffset,
  type VignetteId,
} from './CompanionSprite';
import { ChatSurface, NewChatButton, type ChatSurfaceHandle } from './ChatSurface';
import { HOME_HASH, navigate } from '../lib/route';
import type { Project, ProjectPublication } from '../lib/projects';

interface ProjectPageProps {
  project: Project;
}

// the sprite is decoration here: it stands by the header instead of roaming,
// so the page never mounts the follower or the floating panel
const SPRITE_SIZE = 64;

// the sprite's own timer is `1 both`, so it is already back on the base pose by the time
// the prop is dropped; the margin only covers timer jitter
const VIGNETTE_TAIL = 80;

// one string for the tooltip and the accessible name: a hover label the screen reader
// cannot repeat back is two different buttons depending on how you meet it
const POKE_LABEL = 'Poke me';

// the sprite keeps every vignette animation behind `prefers-reduced-motion: no-preference`,
// so on a reduce setting a click could not show anything: offer no control at all rather
// than a dead one
const useReduceMotion = () => {
  const [reduce, setReduce] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduce(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return reduce;
};

// "LAK 2025" already carries its year; only append one the venue is missing
const venueLine = (publication: ProjectPublication): string =>
  publication.venue.includes(String(publication.year))
    ? publication.venue
    : `${publication.venue}, ${publication.year}`;

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase">{children}</p>
);

export const ProjectPage: React.FC<ProjectPageProps> = ({ project }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<ChatSurfaceHandle>(null);
  const [hasMessages, setHasMessages] = useState(false);

  const reduceMotion = useReduceMotion();
  const [vignette, setVignette] = useState<VignetteId | null>(null);
  // the click handler needs what is playing right now, and state would hand it the value
  // from the render it was created in
  const vignetteRef = useRef<VignetteId | null>(null);
  const vignetteTimerRef = useRef<number | null>(null);
  // a poke mid-play has to let the old animation unmount before the new one mounts, so the
  // second half of the swap is owed to the next frame
  const vignetteRafRef = useRef<number | null>(null);

  const clearVignette = useCallback(() => {
    if (vignetteTimerRef.current !== null) {
      window.clearTimeout(vignetteTimerRef.current);
      vignetteTimerRef.current = null;
    }
    if (vignetteRafRef.current !== null) {
      cancelAnimationFrame(vignetteRafRef.current);
      vignetteRafRef.current = null;
    }
    vignetteRef.current = null;
    setVignette(null);
  }, []);

  // one poke, one animation. the scheduler on the home page only ever moves null -> id, and
  // that unmount is what restarts the css, so a click mid-play takes the same route: drop
  // what is playing in this commit, mount the next one a frame later.
  const playVignette = useCallback(() => {
    const pool = VIGNETTE_IDS.filter((id) => id !== vignetteRef.current);
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (vignetteTimerRef.current !== null) {
      window.clearTimeout(vignetteTimerRef.current);
      vignetteTimerRef.current = null;
    }
    if (vignetteRafRef.current !== null) cancelAnimationFrame(vignetteRafRef.current);
    vignetteRef.current = null;
    setVignette(null);
    vignetteRafRef.current = requestAnimationFrame(() => {
      vignetteRafRef.current = null;
      vignetteRef.current = id;
      setVignette(id);
      vignetteTimerRef.current = window.setTimeout(() => {
        vignetteTimerRef.current = null;
        vignetteRef.current = null;
        setVignette(null);
      }, VIGNETTE_MS[id] + VIGNETTE_TAIL);
    });
  }, []);

  // arriving on a project always starts at the top of the writing, even when the
  // visitor came from another project's page.
  //
  // routing between projects re-renders this component rather than remounting it, so the
  // running animation and its timers have to be dropped by hand — the cleanup covers the
  // unmount as well. it belongs to the layout effect and not a passive one: a passive
  // cleanup lands after the browser has already painted a frame of the old animation on
  // the new project's page.
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    if (pageRef.current) pageRef.current.scrollTop = 0;
    return clearVignette;
  }, [project.id, clearVignette]);

  const backHome = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(HOME_HASH);
  };

  return (
    <div className="h-dvh w-full overflow-hidden bg-[#030303] text-white selection:bg-white/20 selection:text-white">
      <div
        ref={pageRef}
        className="flex h-full flex-col overflow-y-auto md:grid md:grid-cols-[minmax(300px,38%)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
      >
        {/* the docked agent — second on a phone, first and fixed-height on md+ */}
        <aside
          aria-label={`Ask about ${project.name}`}
          className="order-2 flex min-h-[70vh] flex-col border-t border-white/10 md:order-1 md:h-full md:min-h-0 md:border-t-0 md:border-r md:border-white/10"
        >
          <div className="flex shrink-0 items-center gap-4 border-b border-white/10 px-6 py-5 md:px-8 md:py-6">
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">Ask</div>
              <div className="font-display italic text-xl md:text-2xl text-white/90 leading-tight truncate">
                {project.name}.
              </div>
            </div>
            {/* the sprite reads first and tabs last: order-[-1] keeps it to the left of the
                heading, while the dom puts what the panel is for ahead of a toy that only
                plays an animation.
                its view box is wider and taller than SPRITE_SIZE so the staff halo, the hat
                star and the vignette props are never cropped, so the slot below is pinned to
                SPRITE_SIZE — that is what the header row lays out and what the focus ring
                draws around — and the svg hangs outside it at spriteSlotOffset, which lands
                the character on exactly the pixels it occupied before. */}
            {reduceMotion ? (
              <span
                aria-hidden="true"
                className="relative order-[-1] block shrink-0"
                style={{ width: SPRITE_SIZE, height: SPRITE_SIZE }}
              >
                <span className="absolute block" style={spriteSlotOffset(SPRITE_SIZE)}>
                  <CompanionSprite facing="right" state="idle" size={SPRITE_SIZE} />
                </span>
              </span>
            ) : (
              /* pokeable: the art is the whole control, so the button carries no chrome
                 beyond the hover lift and the focus ring */
              <button
                type="button"
                onClick={playVignette}
                title={POKE_LABEL}
                aria-label={POKE_LABEL}
                style={{ width: SPRITE_SIZE, height: SPRITE_SIZE }}
                className="relative order-[-1] block shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0 leading-none transition-transform duration-200 ease-out hover:scale-105 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                <span className="absolute block" style={spriteSlotOffset(SPRITE_SIZE)}>
                  <CompanionSprite
                    facing="right"
                    state="idle"
                    size={SPRITE_SIZE}
                    vignette={vignette}
                  />
                </span>
              </button>
            )}
            {hasMessages && (
              <NewChatButton
                onClick={() => surfaceRef.current?.reset()}
                className="-mr-2 ml-auto"
              />
            )}
          </div>

          <ChatSurface
            ref={surfaceRef}
            scope={project.id}
            onHasMessagesChange={setHasMessages}
            suggestions={project.suggestions}
            intro={`An assistant reading the ${project.name} page with you. Ask about this project, or about anything else in Zaibei's work.`}
            className="flex-1 min-h-0"
          />
        </aside>

        {/* the writing */}
        <div
          ref={contentRef}
          className="order-1 md:order-2 md:h-full md:min-h-0 md:overflow-y-auto"
        >
          <article className="mx-auto w-full max-w-2xl px-6 py-10 md:px-16 md:py-20">
            <a
              href={HOME_HASH}
              onClick={backHome}
              data-companion-hint="Goes back to the projects list"
              className="inline-block text-[10px] text-white/40 hover:text-white tracking-[0.2em] uppercase transition-colors"
            >
              ← All projects
            </a>

            <header className="mt-12">
              <Label>{project.category}</Label>
              <h1 className="font-display italic text-4xl md:text-5xl text-white/85 font-light leading-tight mt-4">
                {project.name}
              </h1>
              {(project.period || project.role) && (
                <p className="mt-5 text-[10px] text-white/40 tracking-[0.2em] uppercase">
                  {[project.period, project.role].filter(Boolean).join(' // ')}
                </p>
              )}
            </header>

            <div className="mt-12 space-y-6 text-sm md:text-base text-white/70 font-light tracking-wide leading-relaxed">
              {project.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {project.tech && project.tech.length > 0 && (
              <section className="mt-16">
                <Label>Made with</Label>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {project.tech.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-white/50 tracking-[0.2em] uppercase"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {project.publications.length > 0 && (
              <section className="mt-16">
                <Label>Publications</Label>
                <ul className="mt-6 border-t border-white/10">
                  {project.publications.map((publication) => (
                    <li key={publication.title} className="border-b border-white/10 py-6">
                      {publication.href ? (
                        <a
                          href={publication.href}
                          target="_blank"
                          rel="noreferrer"
                          data-companion-hint={`Opens the paper "${publication.title}"`}
                          className="text-sm text-white/75 hover:text-white leading-relaxed tracking-wide transition-colors"
                        >
                          {publication.title} <span className="text-white/30">↗</span>
                        </a>
                      ) : (
                        <span className="text-sm text-white/75 leading-relaxed tracking-wide">
                          {publication.title}
                        </span>
                      )}
                      <p className="mt-3 text-[10px] text-white/35 tracking-[0.2em] uppercase leading-relaxed">
                        {publication.authors}
                      </p>
                      <p className="mt-1 text-[10px] text-white/35 tracking-[0.2em] uppercase leading-relaxed">
                        {venueLine(publication)}
                        {publication.note && (
                          <span className="text-white/55"> // {publication.note}</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {project.links.length > 0 && (
              <section className="mt-16">
                <Label>Links</Label>
                <ul className="mt-6 border-t border-white/10">
                  {project.links.map((link) => (
                    <li key={link.href} className="border-b border-white/10">
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        data-companion-hint={`Opens ${link.label} in a new tab`}
                        className="flex items-center justify-between gap-4 py-4 text-xs text-white/60 hover:text-white tracking-[0.2em] uppercase transition-colors"
                      >
                        <span className="min-w-0 truncate">{link.label}</span>
                        <span className="shrink-0 text-white/25">
                          {link.kind} ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-20 border-t border-white/10 pt-8">
              <a
                href={HOME_HASH}
                onClick={backHome}
                data-companion-hint="Goes back to the projects list"
                className="text-[10px] text-white/40 hover:text-white tracking-[0.2em] uppercase transition-colors"
              >
                ← All projects
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};
