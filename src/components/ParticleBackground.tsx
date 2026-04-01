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
      // Very soft clear for a long, ethereal trail effect
      ctx.fillStyle = 'rgba(3, 3, 3, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

        // State 3: Stable Flower / Mandala (Scroll structured)
        let flowerCX = canvas.width * 0.75; 
        let flowerCY = canvas.height * 0.5;
        let flowerAngle = (index / numStrands) * Math.PI * 2 + time * 0.001;
        let petalRadius = 120 + Math.sin(time * 0.02 + index) * 15;
        let flowerX = flowerCX + Math.cos(flowerAngle) * petalRadius;
        let flowerY = flowerCY + Math.sin(flowerAngle) * petalRadius;

        // Blend states based on focus and scroll
        let currentTargetX = target.x + (wanderX * (1 - focusLerp)) + (focusX * focusLerp);
        let currentTargetY = target.y + (wanderY * (1 - focusLerp)) + (focusY * focusLerp);

        head.x = currentTargetX * (1 - scrollProgress) + flowerX * scrollProgress;
        head.y = currentTargetY * (1 - scrollProgress) + flowerY * scrollProgress;

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

        // Color Morphing: White -> Bioluminescent Purple (Tailwind purple-400: 167, 139, 250)
        let r = Math.floor(255 - (scrollProgress * (255 - 167)));
        let g = Math.floor(255 - (scrollProgress * (255 - 139)));
        let b = Math.floor(255 - (scrollProgress * (255 - 250)));

        // Draw the continuous strand
        ctx.beginPath();
        ctx.moveTo(strand.segments[0].x, strand.segments[0].y);
        for (let i = 1; i < numSegments; i++) {
          let xc = (strand.segments[i].x + strand.segments[i - 1].x) / 2;
          let yc = (strand.segments[i].y + strand.segments[i - 1].y) / 2;
          ctx.quadraticCurveTo(strand.segments[i - 1].x, strand.segments[i - 1].y, xc, yc);
        }
        
        let alpha = 0.15 - (index * 0.005) + (focusLerp * 0.2);
        alpha = alpha * (1 - scrollProgress * 0.6); 
        
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = (strand.thickness + (focusLerp * 1)) * (1 - scrollProgress * 0.5);
        ctx.stroke();

        // Draw subtle "chain links" or "sensor nodes" along the strand
        for (let i = 0; i < numSegments; i += 6) {
          ctx.beginPath();
          ctx.arc(strand.segments[i].x, strand.segments[i].y, 1 + (focusLerp * 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.4 - (i / numSegments) * 0.4 + (focusLerp * 0.3)) * (1 - scrollProgress * 0.6)})`;
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

    const handleScroll = () => {
      const maxScroll = window.innerHeight;
      scrollProgress = Math.min(window.scrollY / maxScroll, 1);
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
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    window.addEventListener('set-focus', handleSetFocus);
    
    init();
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
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
