import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

// Elegant wave animation for "unseen rhythms"
const AnimatedRhythms = () => {
  const text = "unseen rhythms";
  return (
    <span className="inline-flex">
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          animate={{
            y: [0, -4, 0],
            opacity: [0.4, 1, 0.4],
            filter: ['blur(2px)', 'blur(0px)', 'blur(2px)']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
          style={{ whiteSpace: 'pre' }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
};

export const AppContent: React.FC = () => {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Track active section for navigation highlight
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { threshold: 0.4 }); // Trigger when 40% of section is visible

    const sections = document.querySelectorAll('section');
    sections.forEach(sec => observer.observe(sec));

    return () => {
      sections.forEach(sec => observer.unobserve(sec));
    };
  }, []);

  // Manage Ambient Drone Volume based on active section
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      // Only play drone loudly on home page
      const targetGain = (activeSection === 'home' && audioEnabled) ? 0.4 : 0.0;
      gainNodeRef.current.gain.setTargetAtTime(targetGain, audioCtxRef.current.currentTime, 2);
    }
  }, [activeSection, audioEnabled]);

  // Generative Ambient Drone using Web Audio API
  const toggleAudio = () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Frequencies for a deep, ethereal chord (A major 7ish)
      const freqs = [110, 164.81, 220, 277.18]; 
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05 + Math.random() * 0.05; // Very slow modulation
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.15;
        
        lfo.connect(lfoGain.gain);
        osc.connect(lfoGain);
        lfoGain.connect(masterGain);
        
        osc.start();
        lfo.start();
      });
    }

    if (audioEnabled) {
      setAudioEnabled(false);
    } else {
      audioCtxRef.current.resume();
      setAudioEnabled(true);
    }
  };

  // Play a soft, piano-like generative chord when focusing
  const playPianoChime = () => {
    if (!audioCtxRef.current || !audioEnabled || activeSection !== 'home') return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;
    
    // Emaj9 chord frequencies for a dreamy, resolving sound
    const freqs = [329.63, 415.30, 493.88, 622.25, 739.99];
    
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, t);
      // Stagger the attack slightly for a rolled chord (arpeggio) effect
      const attackTime = t + 0.05 + (i * 0.06);
      gain.gain.linearRampToValueAtTime(0.06, attackTime);
      gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(t);
      osc.stop(attackTime + 3);
    });
  };

  const setFocus = (focused: boolean) => {
    window.dispatchEvent(new CustomEvent('set-focus', { detail: { focused } }));
    if (focused) {
      playPianoChime();
    }
  };

  return (
    <div className="relative z-10 w-full pointer-events-none mix-blend-screen">
      
      {/* Fixed UI Layer */}
      <div className="fixed top-8 left-8 md:left-16 z-50 pointer-events-auto">
        <button 
          onClick={toggleAudio}
          className="text-[10px] md:text-xs text-white/50 hover:text-white transition-colors tracking-[0.2em] uppercase"
        >
          [ SOUND: {audioEnabled ? 'ON' : 'OFF'} ]
        </button>
      </div>

      <nav className="fixed top-8 right-8 md:right-16 z-50 pointer-events-auto flex gap-6 md:gap-12 text-[10px] md:text-xs tracking-[0.2em] uppercase">
        {['home', 'about', 'projects', 'resume'].map((sec) => (
          <a 
            key={sec}
            href={`#${sec}`} 
            className={`transition-all duration-500 ${activeSection === sec ? 'text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/30 hover:text-white/80'}`}
          >
            {sec}
          </a>
        ))}
      </nav>

      {/* Section 1: Home (Stream of Consciousness) */}
      <section id="home" className="relative h-screen flex flex-col justify-between p-8 md:p-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
          className="pointer-events-auto w-max mt-16 md:mt-0"
          onMouseEnter={() => setFocus(true)}
          onMouseLeave={() => setFocus(false)}
        >
          <h1 className="text-sm md:text-base font-light tracking-[0.3em] mb-2 text-white/90 uppercase flex items-center gap-3">
            Zaibei Li <span className="text-white/40 text-xs tracking-widest font-sans">李再倍</span>
          </h1>
          <p className="text-[10px] md:text-xs text-white/40 tracking-[0.2em] uppercase">
            Multimodal Learning Analytics
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 3, delay: 1, ease: "easeOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-3xl pointer-events-auto px-6"
          onMouseEnter={() => setFocus(true)}
          onMouseLeave={() => setFocus(false)}
        >
          <h2 className="font-display italic text-3xl md:text-5xl lg:text-6xl text-white/80 font-light leading-tight mb-8 cursor-default">
            Capturing the <AnimatedRhythms /> <br className="hidden md:block"/> 
            of human cognition.
          </h2>
          <p className="text-xs md:text-sm text-white/40 font-light tracking-widest leading-loose uppercase">
            Through sensors, signals, and silence. <br/>
            Bridging the physical and the analytical.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, delay: 1.5, ease: "easeOut" }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pointer-events-auto w-full"
        >
          <div 
            className="text-[10px] md:text-xs text-white/30 tracking-[0.2em] uppercase leading-loose cursor-default"
            onMouseEnter={() => setFocus(true)}
            onMouseLeave={() => setFocus(false)}
          >
            <span className="text-white/50 block mb-2">[ Modalities ]</span>
            Video / Audio / Motion <br/>
            iOS CoreMotion / Arduino
          </div>
          
          <a 
            href="mailto:zali@di.ku.dk" 
            onMouseEnter={() => setFocus(true)}
            onMouseLeave={() => setFocus(false)}
            className="text-[10px] md:text-xs text-white/50 hover:text-white transition-all duration-500 tracking-[0.2em] uppercase border-b border-white/20 hover:border-white pb-1"
          >
            Initiate Sync
          </a>
        </motion.div>
      </section>

      {/* Section 2: About */}
      <section id="about" className="relative min-h-screen flex items-center p-8 md:p-16 pointer-events-auto">
        <div className="max-w-2xl">
          <h2 className="font-display italic text-4xl md:text-5xl text-white/80 font-light mb-12 leading-tight">
            Decoding cognition.
          </h2>
          <div className="space-y-8 text-xs md:text-sm text-white/50 font-light tracking-widest leading-loose uppercase">
            <p>
              I am a Doctoral Researcher at the University of Copenhagen, specializing in Multimodal Learning Analytics (MMLA).
            </p>
            <p>
              My research bridges educational data mining, human-AI collaboration, and ubiquitous computing. I build IoT-based systems and interactive dashboards to visualize and decode the complex, unseen rhythms of how we learn.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Projects */}
      <section id="projects" className="min-h-screen flex flex-col justify-center p-8 md:p-16 pointer-events-auto">
        <div className="w-full">
          <h2 className="font-display italic text-4xl md:text-5xl text-white/80 font-light mb-16">
            Selected Projects.
          </h2>
          {/* Horizontal Scroll Container */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 md:gap-16 pb-8 hide-scrollbar w-full">
            
            {/* Project 1 */}
            <div className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer">
              <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Toolkit // IoT & Analytics</div>
              <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">OpenMMLA</h3>
              <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">An open-source multimodal data collection toolkit for learning analytics. Awarded Best Short Paper at LAK '25.</p>
            </div>
            
            {/* Project 2 */}
            <div className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer">
              <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">System // C# & Unity</div>
              <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">MotionMatching</h3>
              <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">A real-time motion matching system developed on Unity, designed to capture and analyze complex human movements.</p>
            </div>

            {/* Project 3 */}
            <div className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer">
              <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Algorithm // Python</div>
              <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">CasperFFG</h3>
              <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">A Python implementation of the CasperFFG consensus combined with PoW consensus on a simulated blockchain.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Section 4: Resume */}
      <section id="resume" className="min-h-screen flex flex-col justify-center p-8 md:p-16 pointer-events-auto">
        <h2 className="font-display italic text-4xl md:text-5xl text-white/80 font-light mb-16">
          Trajectory.
        </h2>
        
        {/* Horizontal Scroll Container for Resume */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-12 md:gap-24 pb-8 hide-scrollbar w-full">
          
          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">2024 - Present</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Doctoral Researcher</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">University of Copenhagen</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Ph.D. in Computer Science. Awarded PhD Fellowship (2024-2027).</p>
          </div>

          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">2023 - 2024</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Research Assistant</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">University of Copenhagen</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Department of Computer Science and Science Education.</p>
          </div>

          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">2022</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Master of Science</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">University of Copenhagen</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Computer Science.</p>
          </div>

          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">2019</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Bachelor of Science</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">Hong Kong Polytechnic University</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Information Technology. IT Consultant at Yonyou.</p>
          </div>

        </div>
        
        <div className="mt-24 border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase">© 2026 Zaibei (Eric) Li</p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:zali@di.ku.dk" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">zali@di.ku.dk</a>
              <span className="text-white/20 hidden md:inline">|</span>
              <a href="tel:+4591858214" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">+45 91858214</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="https://lizaibeim.github.io" target="_blank" rel="noreferrer" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">lizaibeim.github.io</a>
            <span className="text-white/20 hidden md:inline">|</span>
            <a href="/Zaibei_s_CV.pdf" download="Zaibei_s_CV.pdf" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">Download Full CV</a>
          </div>
        </div>
      </section>

    </div>
  );
};
