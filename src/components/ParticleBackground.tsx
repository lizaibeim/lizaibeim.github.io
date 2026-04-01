import React, { useEffect, useRef } from 'react';

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Configuration for the "Jellyfish / Neural Chains"
    const numStrands = 12;
    const numSegments = 60;
    const strands: any[] = [];

    // Mouse, target, focus, and scroll tracking
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let time = 0;
    
    let isFocused = false;
    let focusLerp = 0;
    let scrollProgress = 0;
    let maxScrollProgressSeen = 0; // To trigger a one-time wipe

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      mouse.x = canvas.width / 2;
      mouse.y = canvas.height / 2;
      target.x = canvas.width / 2;
      target.y = canvas.height / 2;

      strands.length = 0;
      for (let i = 0; i < numStrands; i++) {
        let segments = [];
        for (let j = 0; j < numSegments; j++) {
          segments.push({ x: canvas.width / 2, y: canvas.height / 2 });
        }
        strands.push({
          segments,
          offsetX: Math.random() * Math.PI * 2,
          offsetY: Math.random() * Math.PI * 2,
          speedX: 0.001 + Math.random() * 0.002,
          speedY: 0.001 + Math.random() * 0.002,
          radius: 150 + Math.random() * 300,
          thickness: 0.5 + Math.random() * 1.5
        });
      }
    };

    const animate = () => {
      let notHomeFactor = Math.min(1, scrollProgress * 4);

      // Detect when we transition out of HOME (e.g. scrollProgress crosses 0.05)
      // and do a ONE-TIME aggressive clear to wipe the "gray coating" from the home page.
      if (scrollProgress > 0.05 && maxScrollProgressSeen <= 0.05) {
        ctx.fillStyle = '#030303';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Normal trailing mechanism: fillAlpha = 0.08 creates the beautiful long trails.
        let fillAlpha = 0.08; 
        ctx.fillStyle = `rgba(3, 3, 3, ${fillAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      maxScrollProgressSeen = Math.max(maxScrollProgressSeen, scrollProgress);

      time += 1;

      // Smoothly interpolate target towards mouse
      target.x += (mouse.x - target.x) * 0.03;
      target.y += (mouse.y - target.y) * 0.03;

      // Update focus lerp
      if (isFocused && scrollProgress < 0.1) {
        focusLerp += (1 - focusLerp) * 0.05;
      } else {
        focusLerp += (0 - focusLerp) * 0.02;
      }

      strands.forEach((strand, index) => {
        let head = strand.segments[0];
        
        // State 1: Chaotic wandering (Lissajous curves)
        let wanderX = Math.sin(time * strand.speedX + strand.offsetX) * strand.radius;
        let wanderY = Math.cos(time * strand.speedY + strand.offsetY) * strand.radius;
        
        // State 2: Ordered focus (Perfect concentric circle around target)
        let angle = (index / numStrands) * Math.PI * 2 + time * 0.02;
        let focusRadius = 60 + Math.sin(time * 0.05) * 10;
        let focusX = Math.cos(angle) * focusRadius;
        let focusY = Math.sin(angle) * focusRadius;

        // HOME (0)
        let homeX = target.x + (wanderX * (1 - focusLerp)) + (focusX * focusLerp);
        let homeY = target.y + (wanderY * (1 - focusLerp)) + (focusY * focusLerp);

        // ABOUT (1) - DNA / Figure 8
        let aboutCX = canvas.width * 0.75;
        let aboutCY = canvas.height * 0.5;
        let aboutT = time * 0.02 + (index * 0.5);
        let aboutX = aboutCX + Math.sin(aboutT) * 150;
        let aboutY = aboutCY + Math.sin(aboutT * 2) * 150;

        // PROJECTS (2) - Orbiting Rings
        let projCX = canvas.width * 0.5;
        let projCY = canvas.height * 0.5;
        let projAngle = time * 0.01 * (index % 2 === 0 ? 1 : -1) + (index * Math.PI / numStrands);
        let projRadius = 250 + Math.sin(time * 0.05 + index) * 50;
        let projX = projCX + Math.cos(projAngle) * projRadius;
        let projY = projCY + Math.sin(projAngle) * projRadius;

        // RESUME (3) - Stable Flower / Mandala
        let flowerCX = canvas.width * 0.75; 
        let flowerCY = canvas.height * 0.5;
        let flowerAngle = (index / numStrands) * Math.PI * 2 + time * 0.001;
        let petalRadius = 150 + Math.sin(time * 0.02 + index) * 20;
        let flowerX = flowerCX + Math.cos(flowerAngle) * petalRadius;
        let flowerY = flowerCY + Math.sin(flowerAngle) * petalRadius;

        // Interpolate between the 4 states based on scroll section (0 to 3)
        let section = scrollProgress * 3;
        let targetX = 0;
        let targetY = 0;

        if (section < 1) {
            let t = section;
            targetX = homeX * (1 - t) + aboutX * t;
            targetY = homeY * (1 - t) + aboutY * t;
        } else if (section < 2) {
            let t = section - 1;
            targetX = aboutX * (1 - t) + projX * t;
            targetY = aboutY * (1 - t) + projY * t;
        } else {
            let t = section - 2;
            targetX = projX * (1 - t) + flowerX * t;
            targetY = projY * (1 - t) + flowerY * t;
        }

        head.x = targetX;
        head.y = targetY;

        // Spring stiffness
        let stiffness = 0.25 * (1 - focusLerp) + 0.6 * focusLerp;
        stiffness = stiffness * (1 - scrollProgress) + 0.8 * scrollProgress;

        // The rest of the segments follow the head
        for (let i = 1; i < numSegments; i++) {
          let curr = strand.segments[i];
          let prev = strand.segments[i - 1];
          
          let dx = prev.x - curr.x;
          let dy = prev.y - curr.y;
          
          curr.x += dx * stiffness;
          curr.y += dy * stiffness;
        }

        // Draw the continuous strand (White/Gray)
        ctx.beginPath();
        ctx.moveTo(strand.segments[0].x, strand.segments[0].y);
        for (let i = 1; i < numSegments; i++) {
          let xc = (strand.segments[i].x + strand.segments[i - 1].x) / 2;
          let yc = (strand.segments[i].y + strand.segments[i - 1].y) / 2;
          ctx.quadraticCurveTo(strand.segments[i - 1].x, strand.segments[i - 1].y, xc, yc);
        }
        
        let alpha = 0.15 - (index * 0.005) + (focusLerp * 0.2);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = strand.thickness + (focusLerp * 1);
        ctx.stroke();

        // Draw subtle "chain links" or "sensor nodes" along the strand
        for (let i = 0; i < numSegments; i += 6) {
          ctx.beginPath();
          ctx.arc(strand.segments[i].x, strand.segments[i].y, 1.5 + (focusLerp * 0.5), 0, Math.PI * 2);
          let nodeAlpha = 0.5 - (i / numSegments) * 0.4 + (focusLerp * 0.3);
          
          // White on HOME, Purple (167, 139, 250) on other pages
          let r = 255 - notHomeFactor * (255 - 167);
          let g = 255 - notHomeFactor * (255 - 139);
          let b = 255 - notHomeFactor * (255 - 250);

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${nodeAlpha})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = canvas.width / 2;
      mouse.y = canvas.height / 2;
    };

    const scrollContainer = document.getElementById('main-scroll-container');

    const handleScroll = () => {
      if (!scrollContainer) return;
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      scrollProgress = maxScroll > 0 ? Math.min(scrollContainer.scrollTop / maxScroll, 1) : 0;
    };

    const handleResize = () => {
      init();
    };

    const handleSetFocus = (e: Event) => {
      const customEvent = e as CustomEvent;
      isFocused = customEvent.detail.focused;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    if (scrollContainer) scrollContainer.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    window.addEventListener('set-focus', handleSetFocus);
    
    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('set-focus', handleSetFocus);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: '#030303' }}
      id="fluid-canvas"
    />
  );
};
