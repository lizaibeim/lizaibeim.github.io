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

  // Refs for horizontal scrolling sections
  const projectsScrollRef = useRef<HTMLDivElement>(null);
  const earlierProjectsScrollRef = useRef<HTMLDivElement>(null);
  const trajectoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollSection = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      // Scroll by roughly the width of one card + gap
      const scrollAmount = window.innerWidth < 768 ? window.innerWidth * 0.85 : window.innerWidth * 0.4;
      ref.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

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
      // Much quieter, peaceful drone
      const targetGain = (activeSection === 'home' && audioEnabled) ? 0.05 : 0.0;
      gainNodeRef.current.gain.setTargetAtTime(targetGain, audioCtxRef.current.currentTime, 3);
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

      // Ethereal, floating frequencies pitched down for comfort (Fmaj9 add6: F2, C3, E3, G3, A3)
      // Lower pitches and softer tones to avoid high-frequency fatigue
      const freqs = [87.31, 130.81, 164.81, 196.00, 220.00]; 
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle'; // Triangle wave for a warmer, softer synth-pad texture
        osc.frequency.value = freq;
        
        // Lowpass filter to remove harsh high frequencies and make it sound distant/dreamy
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 1.5;
        
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.015; // Very quiet base volume
        
        // LFO to create a "breathing" or "tide" effect (amplitude modulation)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.02 + (i * 0.01); // Each note breathes at a slightly different, very slow rate
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.01; // Depth of the breath
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain);
        
        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(masterGain);
        
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

  // Play a delicate glass wind chime sound when focusing
  const playWindChime = () => {
    if (!audioCtxRef.current || !audioEnabled || activeSection !== 'home') return;
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;
    
    // High-pitched pentatonic scale (C6, D6, E6, G6, A6) for glass/metal wind chimes
    const baseFreqs = [1046.50, 1174.66, 1318.51, 1567.98, 1760.00];
    
    // Randomly pick 2 to 3 notes to simulate a gentle breeze hitting the chimes
    const numChimes = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < numChimes; i++) {
      const freq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];
      const delay = Math.random() * 0.15; // Random stagger for realism
      const startTime = t + delay;
      
      // Fundamental tone (the main ring)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq;
      
      // Overtone (gives the metallic/glass "clink" at the start)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.76; 
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, startTime);
      // Extremely sharp attack for the strike
      gainNode.gain.linearRampToValueAtTime(0.015, startTime + 0.005);
      // Long, shimmering exponential decay
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 3);
      
      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0, startTime);
      overtoneGain.gain.linearRampToValueAtTime(0.008, startTime + 0.002);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3); // Overtone dies out fast
      
      osc1.connect(gainNode);
      osc2.connect(overtoneGain);
      
      gainNode.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 3);
      osc2.stop(startTime + 0.3);
    }
  };

  const setFocus = (focused: boolean) => {
    window.dispatchEvent(new CustomEvent('set-focus', { detail: { focused } }));
    if (focused) {
      playWindChime();
    }
  };

  return (
    <>
      {/* Fixed UI Layer */}
      <header className="fixed top-6 left-6 right-6 md:top-8 md:left-16 md:right-16 z-50 pointer-events-auto flex flex-wrap justify-between items-center gap-y-4 mix-blend-screen">
        <button 
          onClick={toggleAudio}
          className="text-[10px] md:text-xs text-white/50 hover:text-white transition-colors tracking-[0.2em] uppercase whitespace-nowrap"
        >
          [ SOUND: {audioEnabled ? 'ON' : 'OFF'} ]
        </button>

        <nav className="flex gap-4 md:gap-12 text-[10px] md:text-xs tracking-[0.2em] uppercase flex-wrap justify-end">
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
      </header>

      <div className="relative z-10 w-full pointer-events-none mix-blend-screen">
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
            Zaibei Li <span className="text-white/90 text-xs tracking-widest font-sans">李再倍</span>
          </h1>
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
            of human collaboration.
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
            Mobile / Embedded / Smart Glasses
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
          <h2 className="font-display italic text-4xl md:text-5xl text-white/80 font-light mb-12 leading-tight flex items-baseline gap-4">
            <span className="font-sans not-italic text-2xl md:text-3xl text-white/80 tracking-widest">你好,</span>
            Hello.
          </h2>
          <div className="space-y-8 text-xs md:text-sm text-white/50 font-light tracking-widest leading-loose uppercase">
            <p>
              I am a doctoral researcher in computer science at the University of Copenhagen. I spend most of my time building multimodal sensing systems, wearable prototypes, and interactive AI tools that help make human collaboration easier to understand.
            </p>
            <p>
              What I enjoy most is turning messy real-world behavior into something visible and usable, whether that means wiring sensors, prototyping new devices, or designing interpretable pipelines for people working and learning together.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Projects */}
      <section id="projects" className="min-h-screen flex flex-col justify-center p-8 md:p-16 pointer-events-auto">
        <div className="w-full">
          <div className="flex justify-between items-end mb-16">
            <h2 className="font-display italic text-4xl md:text-5xl text-white/80 font-light">
              Projects.
            </h2>
            <div className="flex gap-6 hidden md:flex pb-2">
              <button 
                onClick={() => scrollSection(projectsScrollRef, 'left')} 
                className="text-white/30 hover:text-white transition-colors text-xl"
                aria-label="Scroll left"
              >
                ←
              </button>
              <button 
                onClick={() => scrollSection(projectsScrollRef, 'right')} 
                className="text-white/30 hover:text-white transition-colors text-xl"
                aria-label="Scroll right"
              >
                →
              </button>
            </div>
          </div>
          
          <div className="mb-14">
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-6">Selected Projects</p>
            <div ref={projectsScrollRef} className="flex overflow-x-auto snap-x snap-mandatory gap-8 md:gap-16 pb-8 hide-scrollbar w-full">
              
              {/* Project CoLA */}
              <a href="https://ucph-cola.org" target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer block">
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Platform // Wearable & AI</div>
                <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">CoLA</h3>
                <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">A wearable multimodal AI platform for egocentric sensing, real-time behavioral analysis, and interactive facilitation in collaborative learning settings.</p>
              </a>
              
              {/* Project 1 */}
              <a href="https://github.com/ucph-ccs/OpenMMLA" target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer block">
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Toolkit // IoT & Analytics</div>
                <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">OpenMMLA</h3>
                <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">An open-source IoT toolkit for multimodal data collection, synchronization, and analytics across real-world collaborative environments.</p>
              </a>

              {/* Project 2 */}
              <a href="https://github.com/ucph-ccs/mbox-uber" target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer block">
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Prototype // Multimodal Sensing</div>
                <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">mBox</h3>
                <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">An early multimodal sensing prototype featuring sociometric badges, audio pipelines, and AprilTag-based spatial tracking that later evolved into OpenMMLA.</p>
              </a>

              {/* Project 3 */}
              <a href="https://github.com/lizaibeim/mmla-audio" target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer block">
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Pipeline // Speech Analytics</div>
                <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">MMLA-Audio</h3>
                <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">A real-time speech analytics pipeline with speaker recognition and speech overlap detection, optimized for edge deployment.</p>
              </a>

            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6 gap-4">
              <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase">Earlier / Exploratory Work</p>
              <div className="flex gap-3">
                <button
                  onClick={() => scrollSection(earlierProjectsScrollRef, 'left')}
                  className="flex h-11 w-11 items-center justify-center text-white/30 hover:text-white transition-colors text-xl"
                  aria-label="Scroll earlier projects left"
                >
                  ←
                </button>
                <button
                  onClick={() => scrollSection(earlierProjectsScrollRef, 'right')}
                  className="flex h-11 w-11 items-center justify-center text-white/30 hover:text-white transition-colors text-xl"
                  aria-label="Scroll earlier projects right"
                >
                  →
                </button>
              </div>
            </div>
            <div ref={earlierProjectsScrollRef} className="flex overflow-x-auto snap-x snap-mandatory gap-8 md:gap-16 pb-8 hide-scrollbar w-full">
              
              <a href="https://github.com/lizaibeim/motion-matching" target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer block min-w-0">
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">System // C# & Unity</div>
                <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">MotionMatching</h3>
                <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">A real-time motion matching system on Unity implemented in C#.</p>
              </a>

              <a href="https://github.com/lizaibeim/casper-ffg" target="_blank" rel="noreferrer" className="snap-start shrink-0 w-[85vw] md:w-[40vw] border-t border-white/10 pt-8 group cursor-pointer block min-w-0">
                <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase mb-4">Earlier Work // Blockchain</div>
                <h3 className="text-xl text-white/80 font-light tracking-widest uppercase mb-4 group-hover:text-white transition-colors">CasperFFG</h3>
                <p className="text-xs text-white/40 leading-loose tracking-widest uppercase">An undergraduate capstone project exploring Casper FFG consensus with a Python-based simulated blockchain implementation.</p>
              </a>

            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Resume */}
      <section id="resume" className="min-h-screen flex flex-col justify-center p-8 md:p-16 pointer-events-auto">
        <div className="flex justify-between items-end mb-16">
          <h2 className="font-display italic text-4xl md:text-5xl text-white/80 font-light">
            Trajectory.
          </h2>
          <div className="flex gap-6 hidden md:flex pb-2">
            <button 
              onClick={() => scrollSection(trajectoryScrollRef, 'left')} 
              className="text-white/30 hover:text-white transition-colors text-xl"
              aria-label="Scroll left"
            >
              ←
            </button>
            <button 
              onClick={() => scrollSection(trajectoryScrollRef, 'right')} 
              className="text-white/30 hover:text-white transition-colors text-xl"
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </div>
        
        {/* Horizontal Scroll Container for Resume */}
        <div ref={trajectoryScrollRef} className="flex overflow-x-auto snap-x snap-mandatory gap-12 md:gap-24 pb-8 hide-scrollbar w-full">
          
          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">Nov 2025 - Jan 2026</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Visiting Researcher</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">Hiroshima City University</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Prototyped an egocentric multimodal sensing setup using mobile devices, embedded sensors, and smart glasses, then developed CoLA with an interactive AI facilitator for real-time collaborative learning analytics.</p>
          </div>

          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">Feb 2024 - Present</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Doctoral Researcher</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">University of Copenhagen</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Designed and developed OpenMMLA, a reusable IoT-based toolkit for multimodal data collection, synchronization, and analytics, plus interactive pipelines for sensor fusion, behavioral modeling, and visualization.</p>
          </div>

          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">Jun 2023 - Feb 2024</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Research Assistant</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">University of Copenhagen</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Prototyped sociometric badges and AprilTag-based spatial tracking, then built early data collection and processing workflows for mBox, the prototype that evolved into OpenMMLA.</p>
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
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Information Technology.</p>
          </div>

          <div className="snap-start shrink-0 w-[70vw] md:w-[25vw] flex flex-col">
            <div className="text-[10px] text-white/30 tracking-[0.2em] uppercase border-b border-white/10 pb-4 mb-6">2017</div>
            <h3 className="text-sm text-white/80 tracking-widest uppercase mb-2">Exchange</h3>
            <p className="text-xs text-white/40 leading-loose tracking-widest uppercase mb-4">The Korea Advanced Institute of Science and Technology</p>
            <p className="text-[10px] text-white/30 leading-relaxed tracking-wider">Computer Science.</p>
          </div>

        </div>
        
        <div className="mt-24 border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-white/30 tracking-[0.2em] uppercase">© 2026 Zaibei Li</p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:zali@di.ku.dk" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">zali@di.ku.dk</a>
              <span className="text-white/20 hidden md:inline">|</span>
              <a href="tel:+4591858214" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">+45 91858214</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="https://www.linkedin.com/in/zaibei-eric-li/" target="_blank" rel="noreferrer" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">LinkedIn</a>
            <span className="text-white/20 hidden md:inline">|</span>
            <a href="/cv-zaibei.pdf" download="Zaibei_Li_CV.pdf" className="text-[10px] text-white/50 hover:text-white tracking-[0.2em] uppercase transition-colors">Download Full CV</a>
          </div>
        </div>
      </section>

    </div>
    </>
  );
};
