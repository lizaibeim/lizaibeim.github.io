import React, { useId, useMemo } from 'react';

export type SpriteFacing = 'left' | 'right';
export type SpriteState = 'idle' | 'walking' | 'talking';

export interface CompanionSpriteProps {
  facing: SpriteFacing;
  state: SpriteState;
  size?: number;
  className?: string;
}

const VIEW_W = 100;
const VIEW_H = 120;

const STATE_CLASS: Record<SpriteState, string> = {
  idle: 'idle',
  walking: 'walk',
  talking: 'talk',
};

// a hand-painted chibi wizard-scholar: bold contour, gradient shading, one glowing orb
export const CompanionSprite: React.FC<CompanionSpriteProps> = ({
  facing,
  state,
  size = 72,
  className,
}) => {
  const rawId = useId();
  // useId() returns characters that are illegal in css selectors, so strip them
  const uid = useMemo(() => `cs${rawId.replace(/[^a-zA-Z0-9]/g, '')}`, [rawId]);

  const g = useMemo(() => (name: string) => `${uid}-${name}`, [uid]);
  const u = useMemo(() => (name: string) => `url(#${uid}-${name})`, [uid]);

  const css = useMemo(
    () => `
.${uid}-shadow{transform-box:view-box;transform-origin:48px 113.5px;opacity:.55}
.${uid}-body{transform-box:view-box;transform-origin:50px 112px}
.${uid}-sway{transform-box:view-box;transform-origin:50px 62px}
.${uid}-breathe{transform-box:view-box;transform-origin:50px 88px}
.${uid}-head{transform-box:view-box;transform-origin:50px 66px}
.${uid}-cone{transform-box:view-box;transform-origin:45px 33px}
.${uid}-star{transform-box:view-box;transform-origin:37px 24.5px}
.${uid}-legF{transform-box:view-box;transform-origin:51px 79px}
.${uid}-legB{transform-box:view-box;transform-origin:36px 79.6px}
.${uid}-armB{transform-box:view-box;transform-origin:39px 63px}
.${uid}-armF{transform-box:view-box;transform-origin:63px 62px}
.${uid}-eyes{transform-box:view-box;transform-origin:53.7px 52.5px}
.${uid}-glow{transform-box:view-box;transform-origin:75px 22px;opacity:.85}
.${uid}-lids{opacity:0}
.${uid}-mouthopen{opacity:0}
@media (prefers-reduced-motion: no-preference){
.${uid}-legF,.${uid}-legB,.${uid}-armB,.${uid}-armF,.${uid}-sway,.${uid}-cone,.${uid}-head{transition:transform .18s ease-out}
.${uid}-idle .${uid}-body{animation:${uid}Float 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-breathe{animation:${uid}Breath 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-head{animation:${uid}HeadIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-cone{animation:${uid}ConeIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-armB{animation:${uid}ArmIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-armF{animation:${uid}ArmFIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-glow{animation:${uid}Pulse 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-star{animation:${uid}Star 2.6s ease-in-out infinite}
.${uid}-walk .${uid}-body{animation:${uid}WalkBob .6s ease-in-out infinite}
.${uid}-walk .${uid}-legF{animation:${uid}LegA .6s ease-in-out infinite}
.${uid}-walk .${uid}-legB{animation:${uid}LegB .6s ease-in-out infinite}
.${uid}-walk .${uid}-armB{animation:${uid}ArmWalk .6s ease-in-out infinite}
.${uid}-walk .${uid}-armF{animation:${uid}ArmFWalk .6s ease-in-out infinite}
.${uid}-walk .${uid}-sway{animation:${uid}Sway .6s ease-in-out infinite}
.${uid}-walk .${uid}-cone{animation:${uid}ConeWalk .6s ease-in-out infinite}
.${uid}-walk .${uid}-head{animation:${uid}HeadWalk .6s ease-in-out infinite}
.${uid}-walk .${uid}-shadow{animation:${uid}ShadowWalk .6s ease-in-out infinite}
.${uid}-walk .${uid}-glow{animation:${uid}Pulse 1.8s ease-in-out infinite}
.${uid}-walk .${uid}-star{animation:${uid}Star 1.8s ease-in-out infinite}
.${uid}-talk .${uid}-body{animation:${uid}TalkBob .78s ease-in-out infinite}
.${uid}-talk .${uid}-breathe{animation:${uid}Breath 1.3s ease-in-out infinite}
.${uid}-talk .${uid}-head{animation:${uid}HeadTalk .78s ease-in-out infinite}
.${uid}-talk .${uid}-cone{animation:${uid}ConeTalk .78s ease-in-out infinite}
.${uid}-talk .${uid}-armB{animation:${uid}ArmTalk .78s ease-in-out infinite}
.${uid}-talk .${uid}-armF{animation:${uid}ArmFTalk .78s ease-in-out infinite}
.${uid}-talk .${uid}-glow{animation:${uid}PulseFast .84s ease-in-out infinite}
.${uid}-talk .${uid}-star{animation:${uid}Star 1.1s ease-in-out infinite}
.${uid}-talk .${uid}-mouthopen{animation:${uid}Mouth .78s ease-in-out infinite}
.${uid}-idle .${uid}-eyes,.${uid}-walk .${uid}-eyes,.${uid}-talk .${uid}-eyes{animation:${uid}Blink 5s ease-in-out infinite}
.${uid}-idle .${uid}-lids,.${uid}-walk .${uid}-lids,.${uid}-talk .${uid}-lids{animation:${uid}Lid 5s linear infinite}
@keyframes ${uid}Float{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.4px)}}
@keyframes ${uid}Breath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.026,1.038)}}
@keyframes ${uid}HeadIdle{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-.8px) rotate(1deg)}}
@keyframes ${uid}ConeIdle{0%,100%{transform:rotate(2deg)}50%{transform:rotate(-2deg)}}
@keyframes ${uid}ArmIdle{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(2.6deg)}}
@keyframes ${uid}ArmFIdle{0%,100%{transform:rotate(1.2deg)}50%{transform:rotate(-1.8deg)}}
@keyframes ${uid}Star{0%,100%{opacity:.7;transform:scale(.88) rotate(0deg)}50%{opacity:1;transform:scale(1.16) rotate(22deg)}}
@keyframes ${uid}Pulse{0%,100%{opacity:.66;transform:scale(.92)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ${uid}PulseFast{0%,100%{opacity:.86;transform:scale(1)}50%{opacity:1;transform:scale(1.24)}}
@keyframes ${uid}Blink{0%,90%,100%{transform:scaleY(1)}92.4%,95%{transform:scaleY(.08)}}
@keyframes ${uid}Lid{0%,91.6%,95.8%,100%{opacity:0}92.6%,94.8%{opacity:1}}
@keyframes ${uid}WalkBob{0%,50%,100%{transform:translateY(-2px)}25%,75%{transform:translateY(0)}}
@keyframes ${uid}LegA{0%,100%{transform:rotate(0deg)}25%{transform:rotate(17deg)}75%{transform:rotate(-17deg)}}
@keyframes ${uid}LegB{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-17deg)}75%{transform:rotate(17deg)}}
@keyframes ${uid}ArmWalk{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-15deg)}75%{transform:rotate(15deg)}}
@keyframes ${uid}ArmFWalk{0%,100%{transform:rotate(0deg)}25%{transform:rotate(5deg)}75%{transform:rotate(-5deg)}}
@keyframes ${uid}Sway{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
@keyframes ${uid}ConeWalk{0%,100%{transform:rotate(0deg)}25%{transform:rotate(5deg)}75%{transform:rotate(-5deg)}}
@keyframes ${uid}HeadWalk{0%,100%{transform:rotate(0deg)}25%{transform:rotate(1.8deg)}75%{transform:rotate(-1.8deg)}}
@keyframes ${uid}ShadowWalk{0%,50%,100%{transform:scale(.88,.8);opacity:.4}25%,75%{transform:scale(1,1);opacity:.55}}
@keyframes ${uid}TalkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.2px)}}
@keyframes ${uid}HeadTalk{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-1.2px) rotate(2deg)}}
@keyframes ${uid}ConeTalk{0%,100%{transform:rotate(3.4deg)}50%{transform:rotate(-3.4deg)}}
@keyframes ${uid}ArmTalk{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(5deg)}}
@keyframes ${uid}ArmFTalk{0%,100%{transform:rotate(2.5deg)}50%{transform:rotate(-3.5deg)}}
@keyframes ${uid}Mouth{0%,100%{opacity:0}10%{opacity:1}26%{opacity:.18}44%{opacity:1}62%{opacity:.12}80%{opacity:1}92%{opacity:.3}}
}
`,
    [uid],
  );

  const flip = facing === 'left' ? `translate(${VIEW_W},0) scale(-1,1)` : undefined;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* robe: saturated violet midtone falling into deep indigo */}
        <linearGradient id={g('robe')} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#7d5ce8" />
          <stop offset="0.4" stopColor="#5a38c2" />
          <stop offset="1" stopColor="#2c1a62" />
        </linearGradient>
        <linearGradient id={g('mantle')} x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#b096ff" />
          <stop offset="0.45" stopColor="#8560ee" />
          <stop offset="1" stopColor="#4d31a0" />
        </linearGradient>
        <linearGradient id={g('sleeve')} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#8a6aec" />
          <stop offset="0.45" stopColor="#6845cf" />
          <stop offset="1" stopColor="#33206f" />
        </linearGradient>
        <linearGradient id={g('sleeveBack')} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#6a4ac0" />
          <stop offset="0.5" stopColor="#4d31a0" />
          <stop offset="1" stopColor="#241653" />
        </linearGradient>
        <linearGradient id={g('cone')} x1="0.05" y1="0" x2="0.95" y2="1">
          <stop offset="0" stopColor="#9678f2" />
          <stop offset="0.42" stopColor="#6d4bd6" />
          <stop offset="1" stopColor="#34206f" />
        </linearGradient>
        <linearGradient id={g('brim')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#7f5ee4" />
          <stop offset="0.45" stopColor="#5b3cc6" />
          <stop offset="1" stopColor="#26154f" />
        </linearGradient>
        <linearGradient id={g('gold')} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#ffeaa8" />
          <stop offset="0.4" stopColor="#f5c451" />
          <stop offset="1" stopColor="#c98a1e" />
        </linearGradient>
        <linearGradient id={g('goldDeep')} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f8d576" />
          <stop offset="0.5" stopColor="#dda93c" />
          <stop offset="1" stopColor="#a86f14" />
        </linearGradient>
        <linearGradient id={g('skin')} x1="0.2" y1="0.05" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fce4c8" />
          <stop offset="0.45" stopColor="#f2c9a0" />
          <stop offset="1" stopColor="#c98f63" />
        </linearGradient>
        <linearGradient id={g('glove')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#7d5ce6" />
          <stop offset="0.45" stopColor="#5a3cb8" />
          <stop offset="1" stopColor="#291a5c" />
        </linearGradient>
        <linearGradient id={g('gloveBack')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#5f45b6" />
          <stop offset="0.5" stopColor="#412a8c" />
          <stop offset="1" stopColor="#1e1246" />
        </linearGradient>
        <linearGradient id={g('leg')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#5b3fae" />
          <stop offset="0.5" stopColor="#3d2782" />
          <stop offset="1" stopColor="#1e1246" />
        </linearGradient>
        <linearGradient id={g('legBack')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#452f88" />
          <stop offset="0.5" stopColor="#2d1d62" />
          <stop offset="1" stopColor="#170e36" />
        </linearGradient>
        <linearGradient id={g('boot')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#a8703f" />
          <stop offset="0.45" stopColor="#7a4c28" />
          <stop offset="1" stopColor="#3e2210" />
        </linearGradient>
        <linearGradient id={g('bootBack')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#7d5330" />
          <stop offset="0.5" stopColor="#563219" />
          <stop offset="1" stopColor="#2b1709" />
        </linearGradient>
        <linearGradient
          id={g('wood')}
          gradientUnits="userSpaceOnUse"
          x1="77.5"
          y1="69.9"
          x2="84.5"
          y2="69.1"
        >
          <stop offset="0" stopColor="#e0b078" />
          <stop offset="0.35" stopColor="#b07d42" />
          <stop offset="1" stopColor="#5f3c1f" />
        </linearGradient>
        {/* the orb is the only light source on the page */}
        <radialGradient id={g('orb')} cx="0.34" cy="0.28" r="0.82">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.26" stopColor="#eee6ff" />
          <stop offset="0.58" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#5b34c4" />
        </radialGradient>
        <radialGradient id={g('glowIn')}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.34" stopColor="#c4b5fd" stopOpacity="0.42" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('glowOut')}>
          <stop offset="0" stopColor="#a78bfa" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#8b5cf6" stopOpacity="0.14" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('gem')} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#4c2fa8" />
        </radialGradient>
        <radialGradient id={g('shadow')}>
          <stop offset="0" stopColor="#05030a" stopOpacity="0.8" />
          <stop offset="0.55" stopColor="#05030a" stopOpacity="0.4" />
          <stop offset="1" stopColor="#05030a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <style dangerouslySetInnerHTML={{ __html: css }} />

      <g className={`${uid} ${uid}-${STATE_CLASS[state]}`}>
        <g transform={flip}>
          {/* contact shadow */}
          <ellipse
            className={`${uid}-shadow`}
            cx="48"
            cy="113.5"
            rx="25"
            ry="4.4"
            fill={u('shadow')}
          />

          <g
            className={`${uid}-body`}
            stroke="#241a2e"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {/* far arm, behind the robe */}
            <g className={`${uid}-armB`}>
              <path
                d="M38 62.5C30.4 65 25.4 71.6 23.4 80L31.4 82.4C32.6 76 35.8 70 41.2 66Z"
                fill={u('sleeveBack')}
                strokeWidth="2.8"
              />
              <circle
                cx="26.6"
                cy="85"
                r="5.4"
                fill={u('gloveBack')}
                strokeWidth="2.8"
              />
              <path
                d="M23 79.7L31.8 82.7"
                fill="none"
                stroke={u('goldDeep')}
                strokeWidth="2.6"
              />
              <path
                d="M37.6 64.4C31.8 67 27.4 72.6 25.4 79.6"
                fill="none"
                stroke="#a78bfa"
                strokeWidth="1.9"
                opacity="0.24"
              />
            </g>

            {/* legs, tucked under the robe hem */}
            <g className={`${uid}-legB`}>
              <g transform="translate(-15 0.6)">
                <path
                  d="M47.4 79L56.8 79L56.6 99L45.8 99L46.4 86C46.6 82 46.8 80 47.4 79Z"
                  fill={u('legBack')}
                  strokeWidth="2.7"
                />
                <path
                  d="M45 96.4C44.6 99 44.2 102.4 43.4 106.4C43 109 44.2 111.6 47 111.6L59.8 111.6C62.8 111.6 62.8 106.6 60.4 105.6L57.8 103L57.6 96.4Z"
                  fill={u('bootBack')}
                  strokeWidth="2.8"
                />
                <path
                  d="M45 96.6L57.6 96.6L57.5 99.8L44.7 99.8Z"
                  fill={u('goldDeep')}
                  strokeWidth="2.2"
                />
              </g>
            </g>
            <g className={`${uid}-legF`}>
              <path
                d="M47.4 79L56.8 79L56.6 99L45.8 99L46.4 86C46.6 82 46.8 80 47.4 79Z"
                fill={u('leg')}
                strokeWidth="2.8"
              />
              <path
                d="M45 96.4C44.6 99 44.2 102.4 43.4 106.4C43 109 44.2 111.6 47 111.6L59.8 111.6C62.8 111.6 62.8 106.6 60.4 105.6L57.8 103L57.6 96.4Z"
                fill={u('boot')}
                strokeWidth="2.9"
              />
              <path
                d="M45 96.6L57.6 96.6L57.5 99.8L44.7 99.8Z"
                fill={u('gold')}
                strokeWidth="2.3"
              />
              <path
                d="M46.2 101.4C45.6 104 45.2 106.6 45 108.8"
                fill="none"
                stroke="#e8b98a"
                strokeWidth="1.8"
                opacity="0.38"
              />
            </g>

            {/* torso: sway pivots at the shoulders, breathing scales from the hem */}
            <g className={`${uid}-sway`}>
              <g className={`${uid}-breathe`}>
                <path
                  d="M35 70C35 64.4 41.2 61.5 50 61.5C58.8 61.5 65 64.4 65 70L69.4 82.4C70.6 86 68.4 88 65 88L35 88C31.6 88 29.4 86 30.6 82.4Z"
                  fill={u('robe')}
                  strokeWidth="3"
                />
                <ellipse
                  cx="41.6"
                  cy="76"
                  rx="5.4"
                  ry="8"
                  fill="#ffffff"
                  opacity="0.07"
                  stroke="none"
                  transform="rotate(9 41.6 76)"
                />
                <path
                  d="M35.4 68.8C33.8 74.6 32 80 31 84"
                  fill="none"
                  stroke="#c4b0f8"
                  strokeWidth="2.2"
                  opacity="0.46"
                />
                {/* gold hem trim */}
                <path
                  d="M30.2 84.8C43 86.6 57 86.6 69.8 84.8C70.6 86.6 68.6 88.1 65 88.1L35 88.1C31.4 88.1 29.4 86.6 30.2 84.8Z"
                  fill={u('gold')}
                  strokeWidth="2.3"
                />
                {/* belt and buckle */}
                <path
                  d="M31.6 76C43.5 77.5 56.5 77.5 68.4 76L69 81C56.5 82.5 43.5 82.5 31 81Z"
                  fill={u('goldDeep')}
                  strokeWidth="2.3"
                />
                <rect
                  x="46.8"
                  y="74.8"
                  width="10.6"
                  height="8"
                  rx="2.6"
                  fill={u('gold')}
                  strokeWidth="2.3"
                />
                <path
                  d="M52.1 76.6L54.3 78.8L52.1 81L49.9 78.8Z"
                  fill={u('gem')}
                  stroke="none"
                />
                {/* shoulder mantle, sitting proud of the robe */}
                <path
                  d="M33.4 71C38.8 75 44 76.8 50 76.8C56 76.8 61.2 75 66.6 71"
                  fill="none"
                  stroke="#170d2c"
                  strokeWidth="3.4"
                  opacity="0.35"
                />
                <path
                  d="M32 69.5C31.4 62.6 39.4 58.2 50 58.2C60.6 58.2 68.6 62.6 68 69.5C62.4 73.6 56.4 75.4 50 75.4C43.6 75.4 37.6 73.6 32 69.5Z"
                  fill={u('mantle')}
                  strokeWidth="2.9"
                />
                <path
                  d="M32 69.5C37.6 73.6 43.6 75.4 50 75.4C56.4 75.4 62.4 73.6 68 69.5"
                  fill="none"
                  stroke={u('gold')}
                  strokeWidth="2.6"
                />
                <path
                  d="M33.2 68.6C33 63 37.2 59.3 42.4 58.2"
                  fill="none"
                  stroke="#d3c4ff"
                  strokeWidth="2"
                  opacity="0.55"
                />
                {/* anniversary shoulder clasp */}
                <circle
                  cx="63.6"
                  cy="68"
                  r="4.2"
                  fill={u('gold')}
                  strokeWidth="2.3"
                />
                <circle cx="63.6" cy="68" r="1.9" fill={u('gem')} stroke="none" />
                <path
                  d="M63.6 62.6L63.6 64.3M68.6 68L67 68M67 71.8L65.9 70.7"
                  fill="none"
                  stroke={u('gold')}
                  strokeWidth="1.9"
                />
              </g>
            </g>

            {/* head, hat, face */}
            <g className={`${uid}-head`}>
              <path
                d="M34.4 45.6C30 43.8 26.8 47.6 28.6 51.6C29.8 54.4 32.6 55.8 34.6 54.4Z"
                fill={u('skin')}
                strokeWidth="2.7"
              />
              <path
                d="M50 31C60 31 67.5 37.4 67.5 46.8C67.5 54.6 63.8 61 58.4 64.2C55.8 65.7 53 66.4 50 66.4C47 66.4 44.2 65.7 41.6 64.2C36.2 61 32.5 54.6 32.5 46.8C32.5 37.4 40 31 50 31Z"
                fill={u('skin')}
                strokeWidth="3"
              />
              <path
                d="M34.6 49.4C34.2 55 35.6 59.8 38 62.8"
                fill="none"
                stroke="#ffe8cd"
                strokeWidth="2"
                opacity="0.28"
              />
              <ellipse
                cx="41.6"
                cy="52.4"
                rx="3.8"
                ry="2.8"
                fill="#ffffff"
                opacity="0.13"
                stroke="none"
                transform="rotate(-22 41.6 52.4)"
              />
              <ellipse
                cx="41.8"
                cy="58.4"
                rx="3.6"
                ry="2.1"
                fill="#e8845f"
                opacity="0.32"
                stroke="none"
              />
              <ellipse
                cx="64"
                cy="57.6"
                rx="3.2"
                ry="2"
                fill="#e8845f"
                opacity="0.28"
                stroke="none"
              />

              {/* brows */}
              <path
                d="M43.4 45C45.2 43 48.8 42.8 51.4 44.6"
                fill="none"
                stroke="#8a5836"
                strokeWidth="2.3"
              />
              <path
                d="M56 44.4C58 42.2 62.2 42.2 64.6 44.2"
                fill="none"
                stroke="#8a5836"
                strokeWidth="2.3"
              />

              {/* eyes: the whole group squashes for the blink */}
              <g className={`${uid}-eyes`}>
                <ellipse
                  cx="47.6"
                  cy="52.6"
                  rx="4.6"
                  ry="5.4"
                  fill="#fffaf2"
                  strokeWidth="2.1"
                />
                <ellipse
                  cx="60"
                  cy="52.4"
                  rx="5.1"
                  ry="5.7"
                  fill="#fffaf2"
                  strokeWidth="2.1"
                />
                <circle cx="48.6" cy="53.4" r="2.7" fill="#33205a" stroke="none" />
                <circle cx="61" cy="53.3" r="2.9" fill="#33205a" stroke="none" />
                <circle
                  cx="48.6"
                  cy="54.7"
                  r="1.25"
                  fill="#7c5ce0"
                  opacity="0.85"
                  stroke="none"
                />
                <circle
                  cx="61"
                  cy="54.6"
                  r="1.35"
                  fill="#7c5ce0"
                  opacity="0.85"
                  stroke="none"
                />
                <circle cx="47" cy="51.3" r="1.2" fill="#ffffff" stroke="none" />
                <circle cx="59.4" cy="51.1" r="1.3" fill="#ffffff" stroke="none" />
              </g>
              <g className={`${uid}-lids`}>
                <path
                  d="M43.3 52.5C45 54.6 50.2 54.6 51.9 52.5"
                  fill="none"
                  strokeWidth="2.3"
                />
                <path
                  d="M55 52.3C57 54.6 63 54.6 65 52.3"
                  fill="none"
                  strokeWidth="2.3"
                />
              </g>

              <path
                d="M49.6 59.6C51.8 63.2 56 63.2 58 59.4"
                fill="none"
                strokeWidth="2.3"
              />
              <g className={`${uid}-mouthopen`}>
                <ellipse
                  cx="53.8"
                  cy="60.8"
                  rx="5"
                  ry="3.5"
                  fill="#4a2036"
                  strokeWidth="2.1"
                />
                <ellipse
                  cx="53.8"
                  cy="62.8"
                  rx="2.9"
                  ry="1.3"
                  fill="#e07a72"
                  stroke="none"
                />
              </g>

              {/* pointed hat: the cone lags behind the head, the brim sits over its base */}
              <g className={`${uid}-cone`}>
                <path
                  d="M34.6 33.8C33.2 26 30.6 16 28.8 10.6C28 7.8 24.4 8.2 25 11.4C33 14.6 46.6 22.4 53 28C56 30.6 61.6 33.2 66 33.6Z"
                  fill={u('cone')}
                  strokeWidth="3"
                />
                <path
                  d="M33.4 30.8C32.4 26.6 31 22 29.6 17.6"
                  fill="none"
                  stroke="#c0a8f8"
                  strokeWidth="1.9"
                  opacity="0.45"
                />
                <path
                  d="M31.6 22.6C35 22.8 39.2 24.2 43.4 26.4"
                  fill="none"
                  stroke="#2a1a52"
                  strokeWidth="1.8"
                  opacity="0.32"
                />
                <g className={`${uid}-star`}>
                  <path
                    d="M37 19.5C37.9 23 39.1 24.1 41.2 24.5C39.1 24.9 37.9 26 37 29.5C36.1 26 34.9 24.9 32.8 24.5C34.9 24.1 36.1 23 37 19.5Z"
                    fill={u('gold')}
                    strokeWidth="2.1"
                  />
                </g>
              </g>
              <path
                d="M27.5 35C27.5 31.2 37.6 28.6 50 28.6C62.4 28.6 72.5 31.2 72.5 35C72.5 38.3 65.6 40.6 57 41.2C54.7 41.4 52.4 41.5 50 41.5C47.6 41.5 45.3 41.4 43 41.2C34.4 40.6 27.5 38.3 27.5 35Z"
                fill={u('brim')}
                strokeWidth="3"
              />
              <path
                d="M30.6 32.8C33 30.6 40 29.6 47 29.2"
                fill="none"
                stroke="#b49bf5"
                strokeWidth="2"
                opacity="0.45"
              />
              <ellipse
                cx="38"
                cy="36.4"
                rx="6.5"
                ry="2.2"
                fill="#ffffff"
                opacity="0.08"
                stroke="none"
                transform="rotate(-7 38 36.4)"
              />
              {/* hat jewel */}
              <path
                d="M55.6 32.4L59.6 36.4L55.6 40.4L51.6 36.4Z"
                fill={u('gold')}
                strokeWidth="2.2"
              />
              <path
                d="M55.6 34.6L57.4 36.4L55.6 38.2L53.8 36.4Z"
                fill={u('gem')}
                stroke="none"
              />
            </g>

            {/* near arm with the staff and the glowing orb */}
            <g className={`${uid}-armF`}>
              <path
                d="M86 111L76 28"
                fill="none"
                stroke="#241a2e"
                strokeWidth="6.4"
              />
              <path
                d="M86 111L76 28"
                fill="none"
                stroke={u('wood')}
                strokeWidth="4.4"
              />
              <path
                d="M75 50.4L82.1 49.6"
                fill="none"
                stroke="#241a2e"
                strokeWidth="5.6"
              />
              <path
                d="M75 50.4L82.1 49.6"
                fill="none"
                stroke={u('gold')}
                strokeWidth="3.2"
              />
              <path
                d="M69.4 23.6C71 30.6 79.4 30.6 81 23.6"
                fill="none"
                stroke="#241a2e"
                strokeWidth="5.6"
              />
              <path
                d="M69.4 23.6C71 30.6 79.4 30.6 81 23.6"
                fill="none"
                stroke={u('gold')}
                strokeWidth="3.2"
              />
              <g className={`${uid}-glow`} stroke="none">
                <circle cx="75" cy="22" r="20" fill={u('glowOut')} />
                <circle cx="75" cy="22" r="11.5" fill={u('glowIn')} />
              </g>
              <circle cx="75" cy="22" r="7" fill={u('orb')} strokeWidth="2.4" />
              <ellipse
                cx="72.6"
                cy="19.4"
                rx="2.4"
                ry="1.7"
                fill="#ffffff"
                opacity="0.85"
                stroke="none"
                transform="rotate(-32 72.6 19.4)"
              />
              <path
                d="M62 61.5C70.4 63 76.4 69.6 79.2 78.6L71 81.2C69.4 74.4 65.6 69.2 59.8 64.8Z"
                fill={u('sleeve')}
                strokeWidth="2.9"
              />
              <path
                d="M63.2 63.4C69.8 65.6 74.6 71.2 77.2 78.4"
                fill="none"
                stroke="#c0a8f8"
                strokeWidth="2"
                opacity="0.42"
              />
              <path
                d="M70.6 81.6L79.6 78.8"
                fill="none"
                stroke={u('gold')}
                strokeWidth="2.6"
              />
              {/* oversized mitten wrapped around the shaft */}
              <ellipse
                cx="79.6"
                cy="85"
                rx="6.4"
                ry="5.2"
                fill={u('glove')}
                strokeWidth="2.9"
                transform="rotate(-7 79.6 85)"
              />
              <path
                d="M79 80.8C78.4 83.2 78.4 86.6 79 89.2"
                fill="none"
                stroke="#241a2e"
                strokeWidth="1.6"
                opacity="0.45"
              />
              <ellipse
                cx="77.6"
                cy="82.6"
                rx="2.6"
                ry="1.3"
                fill="#c0a8f8"
                opacity="0.35"
                stroke="none"
                transform="rotate(-16 77.6 82.6)"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};
