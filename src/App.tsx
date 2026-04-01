import { ParticleBackground } from './components/ParticleBackground';
import { AppContent } from './components/AppContent';

export default function App() {
  return (
    <main id="main-scroll-container" className="scroll-container relative bg-[#030303] text-white selection:bg-white/20 selection:text-white">
      <ParticleBackground />
      <AppContent />
    </main>
  );
}
