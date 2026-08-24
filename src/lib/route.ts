// a hash router, because github pages serves static files with no spa rewrite:
// a real path like /project/cola would 404 before react ever loads.
//
// the hash is shared with the one-page section anchors (#home, #about,
// #projects, #resume) that scrollToSection writes via history.replaceState, so
// only the "#/project/<id>" shape is claimed here and everything else — an
// anchor, an empty hash, an unknown id — resolves to the home route.

import { useEffect, useState } from 'react';
import { getProject, type Project } from './projects';

export type Route = { kind: 'home' } | { kind: 'project'; id: Project['id'] };

const PROJECT_PREFIX = '#/project/';

export const HOME_HASH = '#projects';

// the href a project card points at; a real url so middle-click and copy-link work
export const projectHref = (id: Project['id']): string => `${PROJECT_PREFIX}${id}`;

const readHash = (): string => (typeof window === 'undefined' ? '' : window.location.hash);

export const parseRoute = (hash: string): Route => {
  if (!hash.startsWith(PROJECT_PREFIX)) return { kind: 'home' };
  // tolerate a trailing slash or query the way a hand-typed url might carry one
  const raw = hash.slice(PROJECT_PREFIX.length).split(/[/?]/)[0] ?? '';
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // a malformed escape is not an id we know, so fall through to home
  }
  const project = getProject(id);
  return project ? { kind: 'project', id: project.id } : { kind: 'home' };
};

const sameRoute = (a: Route, b: Route): boolean =>
  a.kind === b.kind && (a.kind !== 'project' || b.kind !== 'project' || a.id === b.id);

export const useRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parseRoute(readHash()));

  useEffect(() => {
    const sync = () => {
      const next = parseRoute(readHash());
      // keep the identity stable so an unrelated hash edit is not a re-render
      setRoute((current) => (sameRoute(current, next) ? current : next));
    };
    window.addEventListener('hashchange', sync);
    // the hash may have moved between the first render and this subscription
    sync();
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return route;
};

// pushes a history entry and lets the hashchange listener do the routing, so the
// back button walks the same path the visitor clicked
export const navigate = (to: string): void => {
  const next = to.startsWith('#') ? to : `#${to}`;
  if (window.location.hash === next) return;
  window.location.hash = next;
};
