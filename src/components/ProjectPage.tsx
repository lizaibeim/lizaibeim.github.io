import React, { useLayoutEffect, useRef } from 'react';
import { CompanionSprite } from './CompanionSprite';
import { ChatSurface } from './ChatSurface';
import { HOME_HASH, navigate } from '../lib/route';
import type { Project, ProjectPublication } from '../lib/projects';

interface ProjectPageProps {
  project: Project;
}

// the sprite is decoration here: it stands by the header instead of roaming,
// so the page never mounts the follower or the floating panel
const SPRITE_SIZE = 64;

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

  // arriving on a project always starts at the top of the writing, even when the
  // visitor came from another project's page
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    if (pageRef.current) pageRef.current.scrollTop = 0;
  }, [project.id]);

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
            <span aria-hidden="true" className="shrink-0">
              <CompanionSprite facing="right" state="idle" size={SPRITE_SIZE} />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/40">Ask</div>
              <div className="font-display italic text-xl md:text-2xl text-white/90 leading-tight truncate">
                {project.name}.
              </div>
            </div>
          </div>

          <ChatSurface
            scope={project.id}
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
