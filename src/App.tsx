import { useEffect, useLayoutEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AppContent } from './components/AppContent';
import { Companion } from './components/Companion';
import { ChatPanel } from './components/ChatPanel';
import { ProjectPage } from './components/ProjectPage';
import { getProject } from './lib/projects';
import { useRoute } from './lib/route';

export default function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const route = useRoute();
  const project = route.kind === 'project' ? getProject(route.id) : undefined;

  // a project page has its own docked agent, so the floating panel closes on the
  // way there and home comes back in its resting state
  useEffect(() => {
    if (route.kind === 'project') setChatOpen(false);
  }, [route.kind]);

  // the one-page site remounts at the top when the visitor comes back from a
  // project, so land them on the section the hash names instead of the very top
  useLayoutEffect(() => {
    if (route.kind !== 'home') return;
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const container = document.getElementById('main-scroll-container');
    const target = document.getElementById(id);
    if (!container || !target) return;
    container.scrollTop = Math.min(target.offsetTop, container.scrollHeight - container.clientHeight);
  }, [route.kind]);

  return (
    // reducedMotion="user" makes every motion animation defer to the os setting
    <MotionConfig reducedMotion="user">
      {project ? (
        // the docked agent on the project page replaces both the roaming
        // companion and the floating panel, so neither is mounted here
        <ProjectPage project={project} />
      ) : (
        <>
          <main id="main-scroll-container" className="scroll-container relative bg-[#030303] text-white selection:bg-white/20 selection:text-white">
            <AppContent />
          </main>

          {/* siblings of the scroll container, so scrolling never moves them */}
          <Companion onOpenChat={() => setChatOpen(true)} hidden={chatOpen} />
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </>
      )}
    </MotionConfig>
  );
}
