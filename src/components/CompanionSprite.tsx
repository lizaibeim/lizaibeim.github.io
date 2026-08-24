import React, { useId, useMemo } from 'react';

export type SpriteFacing = 'left' | 'right';
export type SpriteState = 'idle' | 'walking' | 'talking';

export type VignetteId =
  | 'smart-glasses-portal'
  | 'speech-overlap-mic'
  | 'apriltag-stamp'
  | 'motion-match-ghosts'
  | 'sociometric-ping';

export interface CompanionSpriteProps {
  facing: SpriteFacing;
  state: SpriteState;
  size?: number;
  className?: string;
  /** null (the default) renders exactly the base sprite — no extra dom, no extra css */
  vignette?: VignetteId | null;
}

const VIEW_W = 100;
const VIEW_H = 120;

const STATE_CLASS: Record<SpriteState, string> = {
  idle: 'idle',
  walking: 'walk',
  talking: 'talk',
};

// wall-clock length of each vignette; the controller only has to hold the prop this long
export const VIGNETTE_MS: Record<VignetteId, number> = {
  'smart-glasses-portal': 6400,
  'speech-overlap-mic': 5600,
  'apriltag-stamp': 4600,
  'motion-match-ghosts': 5200,
  'sociometric-ping': 3600,
};

// the flagship: always the first vignette of a session, then back in the bag
export const VIGNETTE_FIRST: VignetteId = 'smart-glasses-portal';

export const VIGNETTE_IDS: VignetteId[] = [
  'smart-glasses-portal',
  'speech-overlap-mic',
  'apriltag-stamp',
  'motion-match-ghosts',
  'sociometric-ping',
];

// short css-safe key so selectors stay readable
const VIGNETTE_KEY: Record<VignetteId, string> = {
  'smart-glasses-portal': 'glasses',
  'speech-overlap-mic': 'mic',
  'apriltag-stamp': 'tag',
  'motion-match-ghosts': 'ghost',
  'sociometric-ping': 'ping',
};

type Frame = [ms: number, body: string];

// a keyframe block authored in milliseconds against the vignette's own duration
const kf = (name: string, total: number, frames: Frame[]) =>
  `@keyframes ${name}{${frames
    .map(([ms, body]) => `${Math.round((ms / total) * 1e5) / 1e3}%{${body}}`)
    .join('')}}`;

// every vignette animation is `<dur> <easing> <delay> 1 both`, so its last keyframe is the rest pose
const run = (sel: string, name: string, total: number, ease = 'ease-out', delay = 0) =>
  `${sel}{animation:${name} ${total}ms ${ease} ${delay}ms 1 both}`;

const SNAP = 'cubic-bezier(.2,1.5,.4,1)';
const IMPACT = 'cubic-bezier(.5,0,.9,.55)';
const STEP = 'steps(1,end)';

// ---------------------------------------------------------------- geometry

// #1 pixel dissolve: squares scattered over the silhouette, each with its own escape vector
const G_PIXELS = [
  { x: 34, y: 52, dx: -7, dy: -5 },
  { x: 58, y: 47, dx: 6, dy: -6 },
  { x: 44, y: 66, dx: -5, dy: -8 },
  { x: 62, y: 70, dx: 7, dy: -4 },
  { x: 38, y: 80, dx: -8, dy: -3 },
  { x: 54, y: 84, dx: 4, dy: -9 },
  { x: 48, y: 96, dx: -4, dy: -7 },
  { x: 64, y: 58, dx: 8, dy: -5 },
  { x: 31, y: 68, dx: -9, dy: -4 },
];
const G_SPARKS = [
  { x: 42, y: 104 },
  { x: 57, y: 101 },
  { x: 50, y: 97 },
];
const G_DUST = [
  { x: 38, y: 111, dx: -5 },
  { x: 60, y: 111, dx: 5 },
];

// #2 two speakers: cluster A is him, cluster B is the intruder
// the only genuinely empty band in the view box is the strip above the hat, so both
// clusters live there, straddling the orb once the staff has tilted it overhead
const M_BARS_A = [40, 44, 48, 52, 56];
const M_BARS_B = [66, 70, 74, 78, 82];
const M_DELAY_A = [-40, -110, -20, -90, -60];
const M_DELAY_B = [-70, -30, -100, -50, -15];
const M_SWEAT = [
  { x: 67, y: 44, dx: 6, dy: -5 },
  { x: 37, y: 42, dx: -6, dy: -5 },
  { x: 69, y: 50, dx: 7, dy: -2 },
];

// #3 the tag rides the back hand; everything else rides the tag
const T_CX = 24;
const T_CY = 88;
const T_CORNERS = [
  'M18 85.5L18 82L21.5 82',
  'M26.5 82L30 82L30 85.5',
  'M30 90.5L30 94L26.5 94',
  'M21.5 94L18 94L18 90.5',
];
const T_PAT1 = [
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 2],
  [2, 2],
  [1, 2],
];
const T_PAT2 = [
  [1, 0],
  [0, 1],
  [2, 1],
  [1, 1],
  [0, 2],
  [2, 0],
];
const T_AXES = [
  { d: 'M24 88L31 88', c: '#ef4444' },
  { d: 'M24 88L24 81', c: '#4ade80' },
  { d: 'M24 88L28.6 92.2', c: '#60a5fa' },
];

// #4 candidate poses parked in the free corners of the view box
const H_CANDS = [
  { cx: 14, cy: 26 },
  { cx: 14, cy: 94 },
  { cx: 85, cy: 94 },
];
const H_CAND_SCALE = 0.34;
// the silhouette's own centre, so a candidate can be re-centred on its corner
const H_ART_CX = 56;
const H_ART_CY = 60;
const H_POSE = {
  rest: 'translate(0px,0px)',
  a: 'translate(-5px,0px) rotate(-7deg)',
  b: 'translate(6px,0px) rotate(8deg) scale(.94,1.08)',
  c: 'translate(0px,-4px) scale(1.1,.9)',
  d: 'translate(-3px,0px) rotate(-4deg)',
  sel: 'translate(-4px,-3px) rotate(6deg) scale(.96,1.06)',
};
const H_SPARKS = [
  { x: 30, y: 44 },
  { x: 70, y: 40 },
  { x: 38, y: 30 },
  { x: 64, y: 52 },
];
const H_TRAIL = [
  { x: 22, y: 88 },
  { x: 30, y: 82 },
  { x: 38, y: 80 },
  { x: 45, y: 82 },
];

// #5 the badge sits opposite the shoulder clasp so the mantle stays balanced
const P_BX = 34;
const P_BY = 71.5;
const P_SPARKS = [
  { x: 26, y: 65 },
  { x: 42, y: 78 },
];

// 120deg arc opening to the upper left, away from the body and toward the responder
const arcUp = (cx: number, cy: number, r: number) => {
  const c = 0.8660254;
  return `M${(cx - c * r).toFixed(2)} ${(cy + r / 2).toFixed(2)}A${r} ${r} 0 0 1 ${cx} ${(
    cy - r
  ).toFixed(2)}`;
};
// 120deg arc opening down-right, for the reply arriving from the upper left
const arcIn = (cx: number, cy: number, r: number) => {
  const c = 0.8660254;
  return `M${(cx + c * r).toFixed(2)} ${(cy - r / 2).toFixed(2)}A${r} ${r} 0 0 1 ${cx} ${(
    cy + r
  ).toFixed(2)}`;
};

// a small four-point sparkle centred on (x,y)
const spark = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y}Q${x + r * 0.22} ${
    y + r * 0.22
  } ${x} ${y + r}Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y}Q${x - r * 0.22} ${
    y - r * 0.22
  } ${x} ${y - r}Z`;

const diamond = (x: number, y: number, r: number) =>
  `M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`;

// ------------------------------------------------------- the shared rig css
//
// every act* wrapper gets nothing but a pivot. with no vignette class its computed
// transform is `none`, so the sprite is pixel-identical to the base art. the wrappers
// deliberately carry NO transition: a cancel must land on the base pose in one frame,
// not smear toward it.
// prop classes are prefixed by their vignette (gPix, mBarA, tTag, hG0, pArc), so a single
// regex keeps the always-on block down to the shared rig
const OWNER = /^([gmthp])[A-Z]/;

const rigOrigins = (uid: string, key: string | null) => {
  const o: Array<[string, string]> = [
    ['actShadow', '48px 113.5px'],
    ['actRoot', '50px 112px'],
    ['actLegB', '36px 79.6px'],
    ['actLegF', '51px 79px'],
    ['actArmB', '39px 63px'],
    ['actArmF', '63px 62px'],
    ['actStaff', '79.6px 85px'],
    ['actHead', '50px 64px'],
    ['actCone', '45px 36px'],
    ['actEyes', '53.7px 52.5px'],
    // base groups that the polish pass now transforms
    ['brows', '54px 44px'],
    ['mouthopen', '53.8px 60.8px'],
    // replacement face
    ['vfEyes', '53.7px 52.5px'],
    ['vfPupils', '54px 53px'],
    ['vfBrows', '54px 44px'],
    ['vfBrowR', '60.3px 43.5px'],
    ['vfMouth', '53.8px 61px'],
    ['vfMouthO', '53.8px 61px'],
    ['vfMouthBig', '53.8px 61px'],
    ['vfSmile', '54px 60px'],
    ['hatHide', '45px 34px'],
    // #1
    ['gHeld', '26.6px 85px'],
    ['gWorn', '55px 52px'],
    ['gClink', '66px 50.5px'],
    ['gScanL', '47.6px 52.6px'],
    ['gScanR', '60px 52.4px'],
    ['gOrbScan', '75px 22px'],
    ['gFlare', '75px 22px'],
    ['gHat', '48px 26px'],
    ['gShim', '50px 110px'],
    ['gSeam', '50px 112px'],
    // #2
    ['mBarsA', '48px 16px'],
    ['mBarsB', '74px 16px'],
    ['mDivider', '61px 16px'],
    ['mClash', '61px 10px'],
    ['mFlare', '75px 22px'],
    // #3
    ['tTag', `${T_CX}px ${T_CY}px`],
    ['tCorner', `${T_CX}px ${T_CY}px`],
    ['tAxis', `${T_CX}px ${T_CY}px`],
    ['tRing', `${T_CX}px ${T_CY}px`],
    ['tFlash', `${T_CX}px ${T_CY}px`],
    ['tScan', `${T_CX}px ${T_CY}px`],
    ['tAxis0', `${T_CX}px ${T_CY}px`],
    ['tAxis1', `${T_CX}px ${T_CY}px`],
    ['tAxis2', `${T_CX}px ${T_CY}px`],
    ['tBeam', '75px 22px'],
    // #4 — every onion skin pivots on the feet, like actRoot does
    ['hG0', '50px 112px'],
    ['hG1', '50px 112px'],
    ['hG2', '50px 112px'],
    ['hG3', '50px 112px'],
    ['hGSel', '50px 112px'],
    ['hTG0', '50px 112px'],
    ['hTG1', '50px 112px'],
    ['hTG2', '50px 112px'],
    ['hBoxSel', `${H_CANDS[1].cx}px ${H_CANDS[1].cy}px`],
    ['hPop0', '38px 110px'],
    ['hPop1', '61px 110px'],
    // #5
    ['pBadge', `${P_BX}px ${P_BY}px`],
    ['pDot', `${P_BX}px ${P_BY}px`],
    ['pFlash', `${P_BX}px ${P_BY}px`],
  ];
  // the outgoing arcs scale about the badge; the reply converges on its own off-frame centre
  [0, 1, 2].forEach((i) => {
    o.push([`pArc${i}`, `${P_BX}px ${P_BY}px`]);
    o.push([`pRArc${i}`, '6px 30px']);
  });
  G_PIXELS.forEach((p, i) => o.push([`gPix${i}`, `${p.x}px ${p.y}px`]));
  G_SPARKS.forEach((p, i) => o.push([`gSpk${i}`, `${p.x}px ${p.y}px`]));
  G_DUST.forEach((p, i) => o.push([`gDust${i}`, `${p.x}px ${p.y}px`]));
  G_DUST.forEach((p, i) => o.push([`tDust${i}`, `${p.x}px ${p.y}px`]));
  M_BARS_A.forEach((x, i) => o.push([`mBarA${i}`, `${x + 1.5}px 16px`]));
  M_BARS_B.forEach((x, i) => o.push([`mBarB${i}`, `${x + 1.5}px 16px`]));
  M_SWEAT.forEach((p, i) => o.push([`mSweat${i}`, `${p.x}px ${p.y}px`]));
  H_CANDS.forEach((p, i) => o.push([`hCand${i}`, `${p.cx}px ${p.cy}px`]));
  H_SPARKS.forEach((p, i) => o.push([`hSpk${i}`, `${p.x}px ${p.y}px`]));
  H_TRAIL.forEach((p, i) => o.push([`hTrail${i}`, `${p.x}px ${p.y}px`]));
  P_SPARKS.forEach((p, i) => o.push([`pSpk${i}`, `${p.x}px ${p.y}px`]));
  const owned: Record<string, string> = { g: 'glasses', m: 'mic', t: 'tag', h: 'ghost', p: 'ping' };
  return o
    .filter(([n]) => {
      const m = OWNER.exec(n);
      return !m || owned[m[1]] === key;
    })
    .map(([n, v]) => `.${uid}-${n}{transform-box:view-box;transform-origin:${v}}`)
    .join('\n');
};

// the one base-class override every vignette shares: hide the four base face groups and
// let the replacement face inside actHead take over. reverts the moment the class leaves.
const vfxShared = (uid: string) => `
.${uid}-vfx .${uid}-eyes,.${uid}-vfx .${uid}-lids,.${uid}-vfx .${uid}-mouth,.${uid}-vfx .${uid}-mouthopen,.${uid}-vfx .${uid}-brows{opacity:0}
.${uid}-vfx .${uid}-actRoot,.${uid}-vfx .${uid}-actHead,.${uid}-vfx .${uid}-actArmB,.${uid}-vfx .${uid}-actArmF,.${uid}-vfx .${uid}-actStaff,.${uid}-vfx .${uid}-actCone,.${uid}-vfx .${uid}-actShadow{will-change:transform}
`;

// blink keeps running on the replacement face, so the base cycle is never interrupted
const vfxSharedAnim = (uid: string) => `
.${uid}-vfx .${uid}-vfEyes{animation:${uid}Blink 5s ease-in-out infinite}
.${uid}-vfx .${uid}-vfLids{animation:${uid}Lid 5s linear infinite}
`;

// ------------------------------------------------------------------ #1 glasses
const cssGlasses = (uid: string) => {
  const T = 6400;
  const s = (n: string) => `.${uid}-v-glasses .${uid}-${n}`;
  const k = (n: string) => `${uid}G${n}`;
  const r: string[] = [];

  r.push(run(s('actRoot'), k('Root'), T, 'ease-out'));
  r.push(
    kf(k('Root'), T, [
      [0, 'transform:none;opacity:1'],
      [140, `transform:scale(1.03,.965);animation-timing-function:${IMPACT}`],
      [260, 'transform:none'],
      [420, `transform:scale(1.03,.965);animation-timing-function:${IMPACT}`],
      [540, 'transform:none'],
      [1900, 'transform:none'],
      [2050, 'transform:translateY(2px) scale(1.1,.88)'],
      [2140, 'transform:translateY(2px) scale(1.1,.88)'],
      [2300, 'transform:translateY(0px) scale(.86,1.22)'],
      [2460, 'transform:translateY(0px) scale(1.14,.02);opacity:1'],
      [2519, 'transform:translateY(0px) scale(1.14,.02);opacity:0'],
      [3699, 'transform:translateY(0px) scale(1.2,.06);opacity:0'],
      [3700, 'transform:translateY(0px) scale(1.2,.06);opacity:1'],
      [3800, 'transform:translateY(0px) scale(.82,1.24)'],
      [3880, 'transform:translateY(0px) scale(1.14,.86)'],
      [3930, 'transform:translateY(0px) scale(.97,1.03)'],
      [3980, 'transform:none'],
      [4600, 'transform:none'],
      [4800, 'transform:translateY(1.5px)'],
      [5000, 'transform:translateY(-.5px)'],
      [5200, 'transform:translateY(.6px)'],
      [5400, 'transform:none'],
      [T, 'transform:none;opacity:1'],
    ]),
  );

  r.push(run(s('actHead'), k('Head'), T, 'ease-out'));
  r.push(
    kf(k('Head'), T, [
      [0, 'transform:none'],
      [140, 'transform:rotate(7deg)'],
      [420, 'transform:rotate(7deg)'],
      [760, 'transform:rotate(2deg)'],
      [900, 'transform:rotate(-4deg)'],
      [960, 'transform:rotate(-4deg) scale(1.06,.94)'],
      [1000, 'transform:rotate(-4deg) scale(1.06,.94)'],
      [1070, 'transform:rotate(-2deg) scale(1,1)'],
      [1080, 'transform:rotate(0deg)'],
      [1190, 'transform:rotate(-12deg)'],
      [1410, 'transform:rotate(-12deg)'],
      [1520, 'transform:rotate(14deg)'],
      [1760, 'transform:rotate(14deg)'],
      [1870, 'transform:rotate(0deg)'],
      [4600, 'transform:none'],
      [4750, 'transform:rotate(9deg)'],
      [4950, 'transform:rotate(-3deg)'],
      [5150, 'transform:rotate(5deg)'],
      [5400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the back hand orbits at r~25 around (39,63) and vanishes behind the robe for any
  // negative rotation, so the whole retrieve is staged on the visible left arc
  r.push(run(s('actArmB'), k('ArmB'), T, 'ease-out'));
  r.push(
    kf(k('ArmB'), T, [
      [0, 'transform:none'],
      [140, `transform:rotate(20deg);animation-timing-function:${IMPACT}`],
      [280, 'transform:rotate(9deg)'],
      [420, `transform:rotate(20deg);animation-timing-function:${IMPACT}`],
      [540, 'transform:rotate(13deg)'],
      [610, 'transform:rotate(64deg)'],
      [620, 'transform:rotate(71deg)'],
      [700, 'transform:rotate(64deg)'],
      [900, 'transform:rotate(52deg)'],
      [1080, 'transform:rotate(20deg)'],
      [1300, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actShadow'), k('Shadow'), T, 'ease-out'));
  r.push(
    kf(k('Shadow'), T, [
      [0, 'transform:none;opacity:1'],
      [2200, 'transform:none;opacity:1'],
      [2460, 'transform:scale(.35,.35)'],
      [2519, 'transform:scale(.2,.2);opacity:0'],
      [3699, 'transform:scale(.2,.2);opacity:0'],
      [3700, 'transform:scale(.6,.6);opacity:1'],
      [3800, 'transform:scale(1.25,1.25)'],
      [3980, 'transform:none'],
      [T, 'transform:none;opacity:1'],
    ]),
  );

  r.push(run(s('actCone'), k('Cone'), T, 'ease-out'));
  r.push(
    kf(k('Cone'), T, [
      [0, 'transform:none'],
      [4270, 'transform:none'],
      [4340, 'transform:rotate(5deg)'],
      [4430, 'transform:rotate(-2deg)'],
      [4520, 'transform:rotate(1deg)'],
      [4600, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the real hat leaves with the dissolve and only comes back when the ghost lands on it
  r.push(run(s('hatHide'), k('HatHide'), T, 'linear'));
  r.push(
    kf(k('HatHide'), T, [
      [0, 'opacity:1'],
      [2199, 'opacity:1'],
      [2200, 'opacity:0'],
      [4309, 'opacity:0'],
      [4310, 'opacity:1'],
      [T, 'opacity:1'],
    ]),
  );

  // the held pair rides the arm; the composed path is an arc for free
  r.push(run(s('gHeld'), k('Held'), T, 'ease-out'));
  r.push(
    kf(k('Held'), T, [
      [0, 'opacity:0;transform:translate(0px,0px) rotate(0deg) scale(.8)'],
      [459, 'opacity:0;transform:translate(0px,0px) rotate(0deg) scale(.8)'],
      [460, 'opacity:1;transform:translate(0px,0px) rotate(0deg) scale(1)'],
      [760, 'opacity:1;transform:translate(-1px,-2.4px) rotate(-42deg) scale(1.1)'],
      [899, 'opacity:1;transform:translate(-1.4px,-3.2px) rotate(-46deg) scale(1.1)'],
      [900, 'opacity:0;transform:translate(-1.4px,-3.2px) rotate(-46deg) scale(1.1)'],
      [T, 'opacity:0'],
    ]),
  );

  // invisible prop hand-off: worn opens on the exact frame held closes
  r.push(run(s('gWorn'), k('Worn'), T, 'ease-out'));
  r.push(
    kf(k('Worn'), T, [
      [0, 'opacity:0;transform:translate(0px,0px) rotate(0deg)'],
      [899, 'opacity:0;transform:translate(0px,0px) rotate(0deg)'],
      [900, 'opacity:1;transform:translate(0px,0px) rotate(0deg)'],
      [4400, 'opacity:1;transform:translate(0px,0px) rotate(0deg)'],
      [4600, 'opacity:0;transform:translate(7px,2px) rotate(12deg)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('gClink'), k('Clink'), T, 'linear'));
  r.push(
    kf(k('Clink'), T, [
      [0, 'opacity:0'],
      [899, 'opacity:0'],
      [900, 'opacity:1'],
      [980, 'opacity:0'],
      [4510, 'opacity:0'],
      [4540, 'opacity:.95'],
      [4600, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );

  // hud refresh: a bar wiping down inside each lens, four times
  const scan: Frame[] = [
    [0, 'opacity:0;transform:translateY(0px)'],
    [1079, 'opacity:0;transform:translateY(0px)'],
    [1080, 'opacity:.9;transform:translateY(0px)'],
    [1280, 'opacity:.9;transform:translateY(3.4px)'],
    [1281, 'opacity:.9;transform:translateY(0px)'],
    [1481, 'opacity:.9;transform:translateY(3.4px)'],
    [1482, 'opacity:.9;transform:translateY(0px)'],
    [1682, 'opacity:.9;transform:translateY(3.4px)'],
    [1683, 'opacity:.9;transform:translateY(0px)'],
    [1883, 'opacity:.9;transform:translateY(3.4px)'],
    [1900, 'opacity:0;transform:translateY(3.4px)'],
    [T, 'opacity:0'],
  ];
  r.push(kf(k('Scan'), T, scan));
  r.push(run(s('gScanL'), k('Scan'), T, 'linear'));
  r.push(run(s('gScanR'), k('Scan'), T, 'linear', 90));

  r.push(run(s('gOrbScan'), k('OrbScan'), T, 'linear'));
  r.push(
    kf(k('OrbScan'), T, [
      [0, 'opacity:0;transform:translateY(15px)'],
      [1079, 'opacity:0;transform:translateY(15px)'],
      [1080, 'opacity:.3;transform:translateY(15px)'],
      [1280, 'opacity:.9;transform:translateY(29px)'],
      [1281, 'opacity:.5;transform:translateY(15px)'],
      [1480, 'opacity:1;transform:translateY(29px)'],
      [1481, 'opacity:.3;transform:translateY(15px)'],
      [1680, 'opacity:.9;transform:translateY(29px)'],
      [1681, 'opacity:.5;transform:translateY(15px)'],
      [1880, 'opacity:1;transform:translateY(29px)'],
      [1900, 'opacity:0;transform:translateY(29px)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('gFlare'), k('Flare'), T, 'ease-out'));
  r.push(
    kf(k('Flare'), T, [
      [0, 'opacity:0;transform:scale(.6)'],
      [1900, 'opacity:0;transform:scale(.6)'],
      [2200, 'opacity:1;transform:scale(1.4)'],
      [2520, 'opacity:0;transform:scale(1.7)'],
      [T, 'opacity:0'],
    ]),
  );

  // crt collapse debris: one square, one keyframe, staggered by construction
  G_PIXELS.forEach((p, i) => {
    const d = i * 18;
    r.push(run(s(`gPix${i}`), k(`Pix${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Pix${i}`), T, [
        [0, 'opacity:0;transform:translate(0px,0px)'],
        [2200 - d, 'opacity:0;transform:translate(0px,0px)'],
        [2260 - d, 'opacity:.9;transform:translate(0px,0px)'],
        [2520 - d, `opacity:0;transform:translate(${p.dx}px,${p.dy}px)`],
        [T, 'opacity:0'],
      ]),
    );
  });

  // the hat stays: a live <use> of the real hat art, hanging outside actRoot
  r.push(run(s('gHat'), k('Hat'), T, 'ease-in-out'));
  r.push(
    kf(k('Hat'), T, [
      [0, 'opacity:0;transform:translateY(0px) rotate(0deg)'],
      [2199, 'opacity:0;transform:translateY(0px) rotate(0deg)'],
      [2200, 'opacity:1;transform:translateY(0px) rotate(0deg)'],
      [2520, 'opacity:1;transform:translateY(-11px) rotate(0deg)'],
      [2745, 'opacity:1;transform:translateY(-13px) rotate(6deg)'],
      [2970, 'opacity:1;transform:translateY(-11px) rotate(0deg)'],
      [3195, 'opacity:1;transform:translateY(-9px) rotate(-6deg)'],
      [3400, 'opacity:1;transform:translateY(-11px) rotate(0deg)'],
      // the seam pulls it down a little, and then it hangs there over a bare head
      [3700, 'opacity:1;transform:translateY(-8px) rotate(0deg)'],
      [4180, `opacity:1;transform:translateY(-8px) rotate(0deg);animation-timing-function:${IMPACT}`],
      [4270, 'opacity:1;transform:translateY(3px) rotate(0deg)'],
      [4309, 'opacity:1;transform:translateY(0px) rotate(0deg)'],
      [4310, 'opacity:0;transform:translateY(0px) rotate(0deg)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('gShim'), k('Shim'), T, 'ease-in-out'));
  r.push(
    kf(k('Shim'), T, [
      [0, 'opacity:0;transform:scale(.7)'],
      [2520, 'opacity:0;transform:scale(.7)'],
      [2700, 'opacity:.42;transform:scale(1.15)'],
      [2960, 'opacity:.18;transform:scale(.7)'],
      [3200, 'opacity:.42;transform:scale(1.15)'],
      [3400, 'opacity:.18;transform:scale(.8)'],
      [3700, 'opacity:0;transform:scale(.6)'],
      [T, 'opacity:0'],
    ]),
  );

  G_SPARKS.forEach((_, i) => {
    const t0 = 2560 + i * 220;
    r.push(run(s(`gSpk${i}`), k(`Spk${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Spk${i}`), T, [
        [0, 'opacity:0;transform:translateY(0px) scale(.4)'],
        [t0, 'opacity:0;transform:translateY(0px) scale(.4)'],
        [t0 + 120, 'opacity:.9;transform:translateY(-4px) scale(1)'],
        [t0 + 460, 'opacity:0;transform:translateY(-12px) scale(.5)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  r.push(run(s('gSeam'), k('Seam'), T, 'ease-out'));
  r.push(
    kf(k('Seam'), T, [
      [0, 'opacity:0;transform:scale(1,0)'],
      [3400, 'opacity:0;transform:scale(1,0)'],
      [3410, 'opacity:.95;transform:scale(1,0)'],
      [3540, 'opacity:.95;transform:scale(1,1)'],
      [3690, 'opacity:.95;transform:scale(1,1)'],
      [3700, 'opacity:0;transform:scale(3,1)'],
      [T, 'opacity:0'],
    ]),
  );

  G_DUST.forEach((p, i) => {
    r.push(run(s(`gDust${i}`), k(`Dust${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Dust${i}`), T, [
        [0, 'opacity:0;transform:translate(0px,0px) scale(.4)'],
        [3700, 'opacity:0;transform:translate(0px,0px) scale(.4)'],
        [3760, `opacity:.75;transform:translate(${p.dx / 2}px,-1px) scale(1)`],
        [3920, `opacity:0;transform:translate(${p.dx}px,-2.5px) scale(1.3)`],
        [T, 'opacity:0'],
      ]),
    );
  });

  // satisfied nod wears the wide smile
  r.push(run(s('vfSmile'), k('Smile'), T, 'linear'));
  r.push(
    kf(k('Smile'), T, [
      [0, 'opacity:0'],
      [4599, 'opacity:0'],
      [4600, 'opacity:1'],
      [5400, 'opacity:1'],
      [5500, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );
  r.push(run(s('vfMouth'), k('Neutral'), T, 'linear'));
  r.push(
    kf(k('Neutral'), T, [
      [0, 'opacity:1'],
      [4599, 'opacity:1'],
      [4600, 'opacity:0'],
      [5400, 'opacity:0'],
      [5500, 'opacity:1'],
      [T, 'opacity:1'],
    ]),
  );

  return r.join('\n');
};

// --------------------------------------------------------------------- #2 mic
const cssMic = (uid: string) => {
  const T = 5600;
  const s = (n: string) => `.${uid}-v-mic .${uid}-${n}`;
  const k = (n: string) => `${uid}M${n}`;
  const r: string[] = [];

  r.push(run(s('actRoot'), k('Root'), T, 'ease-out'));
  r.push(
    kf(k('Root'), T, [
      [0, 'transform:none'],
      [260, 'transform:translateY(0px) scale(1.04,.95)'],
      [520, 'transform:translateY(-2.5px) scale(.97,1.06)'],
      [2900, 'transform:translateY(-2.5px) scale(.97,1.06)'],
      [2940, 'transform:translateY(0px) scale(1.16,.84)'],
      [3020, 'transform:translateY(-4px) scale(.9,1.16)'],
      [3080, 'transform:translateY(-4px) scale(.9,1.16)'],
      [3260, 'transform:translateY(0px) scale(1.08,.93)'],
      [3450, 'transform:translateY(-1.5px) scale(.97,1.03)'],
      [3640, 'transform:translateY(0px) scale(1.02,.98)'],
      [3900, 'transform:none'],
      [4500, 'transform:none'],
      [4650, 'transform:translateY(-1.5px) scale(.99,1.02)'],
      [4820, 'transform:translateY(0px) scale(1.02,.98)'],
      [5000, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actHead'), k('Head'), T, 'ease-out'));
  r.push(
    kf(k('Head'), T, [
      [0, 'transform:none'],
      [260, 'transform:translateY(0px) rotate(7deg) scale(1,1)'],
      [520, 'transform:translateY(-1.5px) rotate(-14deg) scale(1,1)'],
      [2900, 'transform:translateY(-1.5px) rotate(-14deg) scale(1,1)'],
      [2960, 'transform:translateY(-1px) rotate(-16deg) scale(1.09,1.08)'],
      [3020, 'transform:translateY(-1px) rotate(-14deg) scale(1.09,1.08)'],
      [3080, 'transform:translateY(-1px) rotate(-14deg) scale(1.09,1.08)'],
      [3260, 'transform:translateY(0px) rotate(-8deg) scale(1.03,1.02)'],
      [3600, 'transform:translateY(0px) rotate(-2deg) scale(1,1)'],
      [3900, 'transform:none'],
      [4500, 'transform:none'],
      [4650, 'transform:translateY(0px) rotate(8deg) scale(1,1)'],
      [4850, 'transform:translateY(0px) rotate(-2deg) scale(1,1)'],
      [5000, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // eyes bug out; no blink is allowed to interrupt the take
  r.push(`${s('vfLids')}{animation:none;opacity:0}`);
  r.push(run(s('actEyes'), k('Eyes'), T, 'ease-out'));
  r.push(
    kf(k('Eyes'), T, [
      [0, 'transform:none'],
      [2900, 'transform:none'],
      [2960, 'transform:scale(1.45)'],
      [3080, 'transform:scale(1.45)'],
      [3400, 'transform:scale(1.12)'],
      [3700, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actCone'), k('Cone'), T, 'ease-out'));
  r.push(
    kf(k('Cone'), T, [
      [0, 'transform:none'],
      [2900, 'transform:none'],
      [2960, 'transform:rotate(-14deg)'],
      [3080, 'transform:rotate(-14deg)'],
      [3260, 'transform:rotate(11deg)'],
      [3450, 'transform:rotate(-6deg)'],
      [3640, 'transform:rotate(3deg)'],
      [3900, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actArmB'), k('ArmB'), T, 'ease-out'));
  r.push(
    kf(k('ArmB'), T, [
      [0, 'transform:none'],
      [260, 'transform:rotate(6deg)'],
      [520, 'transform:rotate(-4deg)'],
      [2900, 'transform:rotate(-4deg)'],
      [2960, 'transform:rotate(72deg)'],
      [3080, 'transform:rotate(72deg)'],
      [3400, 'transform:rotate(24deg)'],
      [3900, 'transform:rotate(12deg)'],
      [3990, 'transform:rotate(52deg)'],
      [4050, `transform:rotate(40deg);animation-timing-function:${IMPACT}`],
      [4140, 'transform:rotate(52deg)'],
      [4260, 'transform:rotate(40deg)'],
      [4350, 'transform:rotate(48deg)'],
      [4500, 'transform:rotate(16deg)'],
      [5000, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the staff is the boom: the whole rig tilts about the mitten grip
  r.push(run(s('actStaff'), k('Staff'), T, 'ease-out'));
  r.push(
    kf(k('Staff'), T, [
      [0, 'transform:none'],
      [260, 'transform:rotate(5deg)'],
      [430, 'transform:rotate(-17deg)'],
      [520, 'transform:rotate(-14deg)'],
      [2900, 'transform:rotate(-14deg)'],
      [2960, 'transform:rotate(8deg)'],
      [3080, 'transform:rotate(8deg)'],
      [3260, 'transform:rotate(-16deg)'],
      [3500, 'transform:rotate(-12deg)'],
      [3900, 'transform:rotate(-12deg)'],
      [4500, 'transform:rotate(-6deg)'],
      [5000, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // up on his toes for the whole chatter
  const legs: Frame[] = [
    [0, 'transform:none'],
    [260, 'transform:none'],
    [520, 'transform:rotate(-4deg)'],
    [2900, 'transform:rotate(-4deg)'],
    [3260, 'transform:none'],
    [T, 'transform:none'],
  ];
  r.push(kf(k('Legs'), T, legs));
  r.push(run(s('actLegF'), k('Legs'), T, 'ease-out'));
  r.push(run(s('actLegB'), k('Legs'), T, 'ease-out'));

  // five delays turn one 360ms keyframe into organic chatter
  r.push(`@keyframes ${k('Bar')}{0%{transform:scaleY(.2)}100%{transform:scaleY(1)}}`);
  M_BARS_A.forEach((_, i) =>
    r.push(
      `${s(`mBarA${i}`)}{animation:${k('Bar')} 360ms ease-in-out ${M_DELAY_A[i]}ms infinite alternate}`,
    ),
  );
  M_BARS_B.forEach((_, i) =>
    r.push(
      `${s(`mBarB${i}`)}{animation:${k('Bar')} 360ms ease-in-out ${M_DELAY_B[i]}ms infinite alternate}`,
    ),
  );

  r.push(run(s('mBarsA'), k('ClusterA'), T, 'ease-out'));
  r.push(
    kf(k('ClusterA'), T, [
      [0, 'opacity:0;transform:translateX(0px)'],
      [519, 'opacity:0;transform:translateX(0px)'],
      [520, 'opacity:.92;transform:translateX(0px)'],
      [2560, 'opacity:.92;transform:translateX(0px)'],
      [2700, 'opacity:.92;transform:translateX(6px)'],
      [3900, 'opacity:.92;transform:translateX(6px)'],
      [4050, 'opacity:.92;transform:translateX(-4px)'],
      [4260, 'opacity:.92;transform:translateX(-8px)'],
      [5000, 'opacity:.92;transform:translateX(-8px)'],
      [5300, 'opacity:0;transform:translateX(-8px)'],
      [T, 'opacity:0'],
    ]),
  );

  // the intruder slides in and he does not notice
  r.push(run(s('mBarsB'), k('ClusterB'), T, 'ease-out'));
  r.push(
    kf(k('ClusterB'), T, [
      [0, 'opacity:0;transform:translateX(6px)'],
      [2199, 'opacity:0;transform:translateX(6px)'],
      [2200, 'opacity:.92;transform:translateX(6px)'],
      [2560, 'opacity:.92;transform:translateX(0px)'],
      [2700, 'opacity:.92;transform:translateX(-8px)'],
      [3900, 'opacity:.92;transform:translateX(-8px)'],
      [4050, 'opacity:.92;transform:translateX(-2px)'],
      [4260, 'opacity:.92;transform:translateX(6px)'],
      [5000, 'opacity:.92;transform:translateX(6px)'],
      [5300, 'opacity:0;transform:translateX(6px)'],
      [T, 'opacity:0'],
    ]),
  );

  // two speakers, separated
  r.push(run(s('mDivider'), k('Div'), T, 'ease-out'));
  r.push(
    kf(k('Div'), T, [
      [0, 'opacity:0;transform:scale(1,.2)'],
      [4259, 'opacity:0;transform:scale(1,.2)'],
      [4260, 'opacity:.9;transform:scale(1,1)'],
      [5000, 'opacity:.9;transform:scale(1,1)'],
      [5300, 'opacity:0;transform:scale(1,1)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('mClash'), k('Clash'), T, 'ease-out'));
  r.push(
    kf(k('Clash'), T, [
      [0, 'opacity:0;transform:scale(0)'],
      [2680, 'opacity:0;transform:scale(0)'],
      [2760, `opacity:1;transform:scale(1.35);animation-timing-function:${SNAP}`],
      [2900, 'opacity:0;transform:scale(1)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('mFlare'), k('Flare'), T, 'ease-out'));
  r.push(
    kf(k('Flare'), T, [
      [0, 'opacity:0;transform:scale(.6)'],
      [260, 'opacity:0;transform:scale(.6)'],
      [520, 'opacity:.85;transform:scale(1.15)'],
      [900, 'opacity:.5;transform:scale(1)'],
      [3990, 'opacity:.5;transform:scale(1)'],
      [4050, 'opacity:1;transform:scale(1.3)'],
      [4160, 'opacity:.5;transform:scale(1)'],
      [4260, 'opacity:1;transform:scale(1.3)'],
      [4400, 'opacity:.4;transform:scale(1)'],
      [5000, 'opacity:0;transform:scale(.8)'],
      [T, 'opacity:0'],
    ]),
  );

  M_SWEAT.forEach((p, i) => {
    const t0 = 2940 + i * 40;
    r.push(run(s(`mSweat${i}`), k(`Sweat${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Sweat${i}`), T, [
        [0, 'opacity:0;transform:translate(0px,0px) scale(.4)'],
        [t0, 'opacity:0;transform:translate(0px,0px) scale(.4)'],
        [t0 + 60, `opacity:.95;transform:translate(${p.dx * 0.4}px,${p.dy * 0.4}px) scale(1)`],
        [t0 + 360, `opacity:0;transform:translate(${p.dx}px,${p.dy}px) scale(.8)`],
        [T, 'opacity:0'],
      ]),
    );
  });

  // three mouths, toggled purely by opacity, plus one 340ms chatter cycle
  r.push(
    `${s('vfMouthO')}{animation:${k('MouthO')} ${T}ms linear 0ms 1 both,${k(
      'Chat',
    )} 340ms ease-in-out 0ms infinite alternate}`,
  );
  r.push(`@keyframes ${k('Chat')}{0%{transform:scale(.8,.5)}100%{transform:scale(1.05,1.15)}}`);
  r.push(
    kf(k('MouthO'), T, [
      [0, 'opacity:0'],
      [519, 'opacity:0'],
      [520, 'opacity:1'],
      [2899, 'opacity:1'],
      [2900, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );
  r.push(run(s('vfMouthBig'), k('MouthBig'), T, 'linear'));
  r.push(
    kf(k('MouthBig'), T, [
      [0, 'opacity:0'],
      [2959, 'opacity:0'],
      [2960, 'opacity:1'],
      [3399, 'opacity:1'],
      [3400, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );
  r.push(run(s('vfSmile'), k('Smile'), T, 'linear'));
  r.push(
    kf(k('Smile'), T, [
      [0, 'opacity:0'],
      [4499, 'opacity:0'],
      [4500, 'opacity:1'],
      [5199, 'opacity:1'],
      [5200, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );
  r.push(run(s('vfMouth'), k('Neutral'), T, 'linear'));
  r.push(
    kf(k('Neutral'), T, [
      [0, 'opacity:1'],
      [519, 'opacity:1'],
      [520, 'opacity:0'],
      [3399, 'opacity:0'],
      [3400, 'opacity:1'],
      [4499, 'opacity:1'],
      [4500, 'opacity:0'],
      [5199, 'opacity:0'],
      [5200, 'opacity:1'],
      [T, 'opacity:1'],
    ]),
  );
  r.push(run(s('vfBrows'), k('Brows'), T, 'ease-out'));
  r.push(
    kf(k('Brows'), T, [
      [0, 'transform:none'],
      [2900, 'transform:none'],
      [2960, 'transform:translateY(-2.4px)'],
      [3400, 'transform:translateY(-2.4px)'],
      [3900, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  return r.join('\n');
};

// --------------------------------------------------------------------- #3 tag
const cssTag = (uid: string) => {
  const T = 4600;
  const s = (n: string) => `.${uid}-v-tag .${uid}-${n}`;
  const k = (n: string) => `${uid}T${n}`;
  const r: string[] = [];

  r.push(run(s('actRoot'), k('Root'), T, 'ease-out'));
  r.push(
    kf(k('Root'), T, [
      [0, 'transform:none'],
      [320, 'transform:translateY(0px) scale(1.04,.96)'],
      [560, 'transform:none'],
      [2100, 'transform:none'],
      [2280, 'transform:translateY(-3px) scale(.96,1.07)'],
      [2370, `transform:translateY(-3px) scale(.96,1.07);animation-timing-function:${IMPACT}`],
      [2510, 'transform:translateY(3px) scale(1.14,.86)'],
      [2560, 'transform:translateY(3px) scale(1.14,.86)'],
      [2700, 'transform:translateY(-1px) scale(.96,1.05)'],
      [2850, 'transform:translateY(1px) scale(1.05,.96)'],
      [3000, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actHead'), k('Head'), T, 'ease-out'));
  r.push(
    kf(k('Head'), T, [
      [0, 'transform:none'],
      [320, 'transform:rotate(6deg) scale(1,1)'],
      [560, 'transform:rotate(2deg) scale(1,1)'],
      [780, 'transform:rotate(-10deg) scale(1,1)'],
      [2100, 'transform:rotate(-10deg) scale(1,1)'],
      [2280, 'transform:rotate(-16deg) scale(1,1)'],
      [2370, 'transform:rotate(-16deg) scale(1,1)'],
      [2510, 'transform:rotate(-4deg) scale(1.08,.92)'],
      [2700, 'transform:rotate(-8deg) scale(1,1)'],
      [3000, 'transform:rotate(0deg) scale(1,1)'],
      [3100, 'transform:rotate(8deg) scale(1,1)'],
      [3400, 'transform:rotate(8deg) scale(1,1)'],
      [4000, 'transform:rotate(4deg) scale(1,1)'],
      [4300, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actArmB'), k('ArmB'), T, 'ease-out'));
  r.push(
    kf(k('ArmB'), T, [
      [0, 'transform:none'],
      [320, 'transform:rotate(20deg)'],
      [480, `transform:rotate(78deg);animation-timing-function:${SNAP}`],
      [560, 'transform:rotate(72deg)'],
      [3400, 'transform:rotate(72deg)'],
      [3860, 'transform:rotate(-6deg)'],
      [4000, 'transform:rotate(2deg)'],
      [4120, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actStaff'), k('Staff'), T, 'ease-out'));
  r.push(
    kf(k('Staff'), T, [
      [0, 'transform:none'],
      [2100, 'transform:none'],
      // the shaft crosses his face below about -6deg, so the strike is staged the other
      // way: wind up out to the right, then slam back down through the rest pose
      [2280, 'transform:rotate(13deg)'],
      [2370, `transform:rotate(13deg);animation-timing-function:${IMPACT}`],
      [2480, 'transform:rotate(-5deg)'],
      [2560, 'transform:rotate(-5deg)'],
      [2700, 'transform:rotate(5deg)'],
      [2900, 'transform:rotate(-2deg)'],
      [3100, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the hat's delayed jolt is what gives the stamp mass
  r.push(run(s('actCone'), k('Cone'), T, 'ease-out'));
  r.push(
    kf(k('Cone'), T, [
      [0, 'transform:none'],
      [2510, 'transform:none'],
      [2560, 'transform:translateY(-3px) rotate(0deg)'],
      [2680, 'transform:translateY(1.5px) rotate(-4deg)'],
      [2790, 'transform:translateY(-1px) rotate(2deg)'],
      [2900, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the card counter-rotates out of the arm so it reads upright while presented
  r.push(run(s('tTag'), k('Tag'), T, 'ease-out'));
  r.push(
    kf(k('Tag'), T, [
      [0, 'opacity:0;transform:translate(0px,0px) rotate(-20deg) scale(.6)'],
      [399, 'opacity:0;transform:translate(0px,0px) rotate(-20deg) scale(.6)'],
      [400, 'opacity:1;transform:translate(0px,0px) rotate(-34deg) scale(.8)'],
      [560, 'opacity:1;transform:translate(0px,0px) rotate(-72deg) scale(1)'],
      [650, 'opacity:1;transform:translate(0px,0px) rotate(-65deg) scale(1)'],
      [720, 'opacity:1;transform:translate(0px,0px) rotate(-79deg) scale(1)'],
      [780, 'opacity:1;transform:translate(0px,0px) rotate(-72deg) scale(1)'],
      [1720, 'opacity:1;transform:translate(0px,0px) rotate(-72deg) scale(1)'],
      [1860, 'opacity:1;transform:translate(0px,-3px) rotate(-86deg) scale(1)'],
      [2000, 'opacity:1;transform:translate(0px,-3px) rotate(-64deg) scale(1)'],
      [2100, 'opacity:1;transform:translate(0px,-2px) rotate(-72deg) scale(1)'],
      [3400, 'opacity:1;transform:translate(0px,-2px) rotate(-72deg) scale(1)'],
      [3600, 'opacity:1;transform:translate(0px,0px) rotate(-40deg) scale(.9)'],
      [3840, 'opacity:1;transform:translate(0px,0px) rotate(-10deg) scale(.7)'],
      [4000, 'opacity:0;transform:translate(0px,0px) rotate(0deg) scale(.2)'],
      [T, 'opacity:0'],
    ]),
  );

  // the pattern flickers between two states: cheap, and it reads as processing
  r.push(run(s('tPat2'), k('Pat'), T, STEP));
  r.push(
    kf(k('Pat'), T, [
      [0, 'opacity:0'],
      [900, 'opacity:0'],
      [980, 'opacity:1'],
      [1060, 'opacity:0'],
      [1140, 'opacity:1'],
      [1220, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('tBeam'), k('Beam'), T, 'ease-out'));
  r.push(
    kf(k('Beam'), T, [
      [0, 'opacity:0'],
      [760, 'opacity:0'],
      [820, 'opacity:.5'],
      [1500, 'opacity:.5'],
      [1720, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('tScan'), k('ScanBar'), T, 'ease-in-out'));
  r.push(
    kf(k('ScanBar'), T, [
      [0, 'opacity:0;transform:translateX(-7px)'],
      [779, 'opacity:0;transform:translateX(-7px)'],
      [780, 'opacity:.95;transform:translateX(-7px)'],
      [1090, 'opacity:.95;transform:translateX(7px)'],
      [1400, 'opacity:.95;transform:translateX(-7px)'],
      [1500, 'opacity:0;transform:translateX(-7px)'],
      [T, 'opacity:0'],
    ]),
  );

  // the detection snap holds for 60ms, which is what makes it feel like a sound effect
  r.push(run(s('tCorner'), k('Corner'), T, 'ease-out'));
  r.push(
    kf(k('Corner'), T, [
      [0, 'opacity:0;transform:scale(1.5)'],
      [1500, `opacity:0;transform:scale(1.5);animation-timing-function:cubic-bezier(.2,1.4,.4,1)`],
      [1620, 'opacity:1;transform:scale(1)'],
      [1680, 'opacity:1;transform:scale(1)'],
      [3400, 'opacity:1;transform:scale(1)'],
      [3600, 'opacity:0;transform:scale(1)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('tFlash'), k('Flash'), T, 'linear'));
  r.push(
    kf(k('Flash'), T, [
      [0, 'opacity:0'],
      [1519, 'opacity:0'],
      [1520, 'opacity:.8'],
      [1620, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );

  T_AXES.forEach((_, i) => {
    const t0 = 1720 + i * 60;
    r.push(run(s(`tAxis${i}`), k(`Axis${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Axis${i}`), T, [
        [0, 'opacity:0;transform:scale(0)'],
        [t0, 'opacity:0;transform:scale(0)'],
        [t0 + 160, `opacity:1;transform:scale(1);animation-timing-function:${SNAP}`],
        [3400, 'opacity:1;transform:scale(1)'],
        [3600, 'opacity:0;transform:scale(1)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  r.push(run(s('tCheck'), k('Check'), T, 'ease-out'));
  r.push(
    kf(k('Check'), T, [
      [0, 'opacity:0;stroke-dashoffset:20'],
      [2399, 'opacity:0;stroke-dashoffset:20'],
      [2400, 'opacity:1;stroke-dashoffset:20'],
      [2530, 'opacity:1;stroke-dashoffset:0'],
      [3400, 'opacity:1;stroke-dashoffset:0'],
      [3600, 'opacity:0;stroke-dashoffset:0'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('tRing'), k('Ring'), T, 'ease-out'));
  r.push(
    kf(k('Ring'), T, [
      [0, 'opacity:0;transform:scale(.4)'],
      [2399, 'opacity:0;transform:scale(.4)'],
      [2400, 'opacity:1;transform:scale(.4)'],
      [2540, 'opacity:.7;transform:scale(1.25)'],
      [2740, 'opacity:0;transform:scale(1)'],
      [T, 'opacity:0'],
    ]),
  );

  G_DUST.forEach((p, i) => {
    r.push(run(s(`tDust${i}`), k(`Dust${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Dust${i}`), T, [
        [0, 'opacity:0;transform:translate(0px,0px) scale(.4)'],
        [2510, 'opacity:0;transform:translate(0px,0px) scale(.4)'],
        [2570, `opacity:.7;transform:translate(${p.dx / 2}px,-1px) scale(1)`],
        [2760, `opacity:0;transform:translate(${p.dx}px,-2.5px) scale(1.3)`],
        [T, 'opacity:0'],
      ]),
    );
  });

  // he is actually looking at the thing
  r.push(run(s('vfPupils'), k('Pupils'), T, 'ease-out'));
  r.push(
    kf(k('Pupils'), T, [
      [0, 'transform:none'],
      [560, 'transform:none'],
      [700, 'transform:translateX(-1.8px)'],
      [3000, 'transform:translateX(-1.8px)'],
      [3200, 'transform:translateX(-.6px)'],
      [3600, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  // the smug beat is a held pose, not an animated one
  r.push(run(s('vfBrowR'), k('BrowR'), T, 'ease-out'));
  r.push(
    kf(k('BrowR'), T, [
      [0, 'transform:none'],
      [2990, 'transform:none'],
      [3080, 'transform:translateY(-2px) rotate(-12deg)'],
      [3400, 'transform:translateY(-2px) rotate(-12deg)'],
      [3600, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('vfMouth'), k('Mouth'), T, 'ease-out'));
  r.push(
    kf(k('Mouth'), T, [
      [0, 'transform:none'],
      [2990, 'transform:none'],
      [3080, 'transform:translate(1px,-.6px) rotate(-9deg)'],
      [3400, 'transform:translate(1px,-.6px) rotate(-9deg)'],
      [3600, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  return r.join('\n');
};

// ------------------------------------------------------------------- #4 ghosts
const cssGhosts = (uid: string) => {
  const T = 5200;
  const s = (n: string) => `.${uid}-v-ghost .${uid}-${n}`;
  const k = (n: string) => `${uid}H${n}`;
  const r: string[] = [];

  // pose-to-pose: steps(1,end) between the snaps, no interpolation at all
  const posed = (frames: Frame[]): Frame[] =>
    frames.map(([ms, body]) => [ms, `${body};animation-timing-function:${STEP}`] as Frame);

  r.push(run(s('actRoot'), k('Root'), T, 'ease-out'));
  r.push(
    kf(k('Root'), T, [
      [0, 'transform:none'],
      ...posed([
        [280, 'transform:translate(0px,0px) scale(1.06,.93)'],
        [360, `transform:${H_POSE.a}`],
        [560, `transform:${H_POSE.a}`],
        [640, `transform:${H_POSE.b}`],
        [840, `transform:${H_POSE.b}`],
        [920, `transform:${H_POSE.c}`],
        [1140, `transform:${H_POSE.c}`],
        [1220, `transform:${H_POSE.d}`],
        [1500, `transform:${H_POSE.d}`],
        [1580, 'transform:none'],
        [2560, 'transform:none'],
      ]),
      [2650, `transform:${H_POSE.sel};animation-timing-function:steps(2,end)`],
      [2790, `transform:${H_POSE.sel}`],
      [3000, 'transform:translate(0px,-2px) scale(.95,1.06)'],
      [3300, `transform:translate(0px,-2px) scale(.95,1.06);animation-timing-function:cubic-bezier(.4,0,.2,1)`],
      [3900, 'transform:translate(-3px,0px) rotate(-5deg)'],
      [4100, 'transform:translate(-1.5px,0px) rotate(-2deg)'],
      [4250, 'transform:translate(-2.5px,0px) rotate(-3deg)'],
      [4400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the shadow is outside actRoot, so it gets flattened companion keyframes
  r.push(run(s('actShadow'), k('Shadow'), T, 'ease-out'));
  r.push(
    kf(k('Shadow'), T, [
      [0, 'transform:none'],
      ...posed([
        [280, 'transform:translate(0px,0px) scale(1.06,1.04)'],
        [360, 'transform:translate(-5px,0px) scale(1,1)'],
        [560, 'transform:translate(-5px,0px) scale(1,1)'],
        [640, 'transform:translate(6px,0px) scale(.86,.86)'],
        [840, 'transform:translate(6px,0px) scale(.86,.86)'],
        [920, 'transform:translate(0px,0px) scale(1.16,1.12)'],
        [1140, 'transform:translate(0px,0px) scale(1.16,1.12)'],
        [1220, 'transform:translate(-3px,0px) scale(1,1)'],
        [1500, 'transform:translate(-3px,0px) scale(1,1)'],
        [1580, 'transform:none'],
        [2560, 'transform:none'],
      ]),
      [2650, 'transform:translate(-4px,0px) scale(.94,.94)'],
      [2790, 'transform:translate(-4px,0px) scale(.94,.94)'],
      [3300, 'transform:translate(0px,0px) scale(.92,.92)'],
      [3900, 'transform:translate(-3px,0px) scale(1,1)'],
      [4400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  const limb = (name: string, sel: string, poses: [number, number, number, number]) => {
    r.push(run(sel, k(name), T, 'ease-out'));
    r.push(
      kf(k(name), T, [
        [0, 'transform:none'],
        ...posed([
          [280, 'transform:rotate(0deg)'],
          [360, `transform:rotate(${poses[0]}deg)`],
          [560, `transform:rotate(${poses[0]}deg)`],
          [640, `transform:rotate(${poses[1]}deg)`],
          [840, `transform:rotate(${poses[1]}deg)`],
          [920, `transform:rotate(${poses[2]}deg)`],
          [1140, `transform:rotate(${poses[2]}deg)`],
          [1220, `transform:rotate(${poses[3]}deg)`],
          [1500, `transform:rotate(${poses[3]}deg)`],
          [1580, 'transform:rotate(0deg)'],
          [2560, 'transform:rotate(0deg)'],
        ]),
        [2650, `transform:rotate(${poses[1]}deg);animation-timing-function:steps(2,end)`],
        [2790, `transform:rotate(${poses[1]}deg)`],
        [3300, `transform:rotate(${poses[1] / 2}deg);animation-timing-function:cubic-bezier(.4,0,.2,1)`],
        [3900, 'transform:rotate(0deg)'],
        [T, 'transform:none'],
      ]),
    );
  };

  // four visibly different arm poses, all on the arc where the back hand clears the robe
  limb('ArmB', s('actArmB'), [64, 100, 22, 46]);
  limb('Staff', s('actStaff'), [18, -10, -34, 6]);
  limb('Head', s('actHead'), [10, -12, 4, -4]);
  limb('Cone', s('actCone'), [-6, 8, 16, -4]);

  // the shuffle back home: two quick steps as the slide settles
  r.push(run(s('actLegF'), k('LegF'), T, 'ease-out'));
  r.push(
    kf(k('LegF'), T, [
      [0, 'transform:none'],
      ...posed([
        [360, 'transform:rotate(22deg)'],
        [560, 'transform:rotate(22deg)'],
        [640, 'transform:rotate(-22deg)'],
        [840, 'transform:rotate(-22deg)'],
        [920, 'transform:rotate(8deg)'],
        [1140, 'transform:rotate(8deg)'],
        [1220, 'transform:rotate(-10deg)'],
        [1500, 'transform:rotate(-10deg)'],
        [1580, 'transform:rotate(0deg)'],
        [2560, 'transform:rotate(0deg)'],
      ]),
      [2650, 'transform:rotate(-22deg)'],
      [2790, 'transform:rotate(-22deg)'],
      [3300, 'transform:rotate(-8deg)'],
      [3900, 'transform:rotate(0deg)'],
      [4020, 'transform:rotate(14deg)'],
      [4140, 'transform:rotate(-4deg)'],
      [4260, 'transform:rotate(14deg)'],
      [4400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('actLegB'), k('LegB'), T, 'ease-out'));
  r.push(
    kf(k('LegB'), T, [
      [0, 'transform:none'],
      ...posed([
        [360, 'transform:rotate(-22deg)'],
        [560, 'transform:rotate(-22deg)'],
        [640, 'transform:rotate(22deg)'],
        [840, 'transform:rotate(22deg)'],
        [920, 'transform:rotate(-8deg)'],
        [1140, 'transform:rotate(-8deg)'],
        [1220, 'transform:rotate(10deg)'],
        [1500, 'transform:rotate(10deg)'],
        [1580, 'transform:rotate(0deg)'],
        [2560, 'transform:rotate(0deg)'],
      ]),
      [2650, 'transform:rotate(22deg)'],
      [2790, 'transform:rotate(22deg)'],
      [3300, 'transform:rotate(8deg)'],
      [3900, 'transform:rotate(0deg)'],
      [4020, 'transform:rotate(-14deg)'],
      [4140, 'transform:rotate(4deg)'],
      [4260, 'transform:rotate(-14deg)'],
      [4400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // onion skins: each is a hard-coded snapshot of the pose it records, never a live copy
  const ghostPose = [H_POSE.rest, H_POSE.a, H_POSE.b, H_POSE.c];
  const ghostAt = [360, 640, 920, 1220];
  ghostPose.forEach((pose, i) => {
    r.push(run(s(`hG${i}`), k(`G${i}`), T, 'ease-out'));
    r.push(
      kf(k(`G${i}`), T, [
        [0, `opacity:0;transform:${pose} scale(1)`],
        [ghostAt[i] - 1, `opacity:0;transform:${pose} scale(1)`],
        [ghostAt[i], `opacity:.6;transform:${pose} scale(1)`],
        [ghostAt[i] + 380, `opacity:0;transform:${pose} scale(1.04)`],
        [T, 'opacity:0'],
      ]),
    );
  });

  // the database query, legible at 64px: three candidates flickering around him
  // the silhouette is already fill-opacity .22, so the flicker has to stay near full
  r.push(`@keyframes ${k('Flick')}{0%{opacity:1}100%{opacity:.45}}`);
  H_CANDS.forEach((_, i) => {
    r.push(
      `${s(`hFlick${i}`)}{animation:${k('Flick')} 160ms steps(2,end) ${-40 * i}ms infinite alternate}`,
    );
    const dead = i === 1;
    r.push(run(s(`hCand${i}`), k(`Cand${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Cand${i}`), T, [
        [0, 'opacity:0;transform:scale(1)'],
        [1500, 'opacity:0;transform:scale(1)'],
        [1620 + i * 60, 'opacity:1;transform:scale(1)'],
        [2400, 'opacity:1;transform:scale(1)'],
        ...(dead
          ? ([
              [2510, 'opacity:1;transform:scale(1.2)'],
              [2620, 'opacity:1;transform:scale(1)'],
              [2900, 'opacity:0;transform:scale(1)'],
            ] as Frame[])
          : ([
              [2460, 'opacity:0;transform:scale(.9)'],
            ] as Frame[])),
        [T, 'opacity:0'],
      ]),
    );
  });

  // the winning box goes solid green
  r.push(run(s('hBoxSel'), k('BoxSel'), T, 'ease-out'));
  r.push(
    kf(k('BoxSel'), T, [
      [0, 'opacity:0;transform:scale(1.2)'],
      [2399, 'opacity:0;transform:scale(1.2)'],
      [2400, 'opacity:1;transform:scale(1.2)'],
      [2510, 'opacity:1;transform:scale(1)'],
      [2900, 'opacity:0;transform:scale(1)'],
      [T, 'opacity:0'],
    ]),
  );

  H_TRAIL.forEach((_, i) => {
    const t0 = 2400 + i * 40;
    r.push(run(s(`hTrail${i}`), k(`Trail${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Trail${i}`), T, [
        [0, 'opacity:0;transform:scale(.4)'],
        [t0, 'opacity:0;transform:scale(.4)'],
        [t0 + 90, 'opacity:.9;transform:scale(1)'],
        [t0 + 320, 'opacity:0;transform:scale(.5)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  // the payoff shot: he lands inside the pose he picked
  r.push(run(s('hGSel'), k('GSel'), T, 'ease-out'));
  r.push(
    kf(k('GSel'), T, [
      [0, `opacity:0;transform:${H_POSE.sel} scale(1)`],
      [2559, `opacity:0;transform:${H_POSE.sel} scale(1)`],
      [2560, `opacity:.7;transform:${H_POSE.sel} scale(1)`],
      [2650, `opacity:.7;transform:${H_POSE.sel} scale(1)`],
      [2900, `opacity:0;transform:${H_POSE.sel} scale(1.03)`],
      [T, 'opacity:0'],
    ]),
  );

  // the blend-out gag: a blend time set far too long, with faint trails
  [0, 1, 2].forEach((i) => {
    r.push(run(s(`hTG${i}`), k(`TG${i}`), T, 'cubic-bezier(.4,0,.2,1)', i * 120));
    r.push(
      kf(k(`TG${i}`), T, [
        [0, 'opacity:0;transform:translate(0px,-2px) scale(.95,1.06)'],
        [3300, 'opacity:.3;transform:translate(0px,-2px) scale(.95,1.06)'],
        [3900, 'opacity:.16;transform:translate(-3px,0px) rotate(-5deg)'],
        [4200, 'opacity:0;transform:translate(0px,0px)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  H_SPARKS.forEach((_, i) => {
    const t0 = 2800 + i * 90;
    r.push(run(s(`hSpk${i}`), k(`Spk${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Spk${i}`), T, [
        [0, 'opacity:0;transform:translateY(0px) scale(.3)'],
        [t0, 'opacity:0;transform:translateY(0px) scale(.3)'],
        [t0 + 130, 'opacity:1;transform:translateY(-4px) scale(1)'],
        [t0 + 420, 'opacity:0;transform:translateY(-11px) scale(.4)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  // two diamonds pop at his feet on every snap
  r.push(run(`${s('hPop0')},${s('hPop1')}`, k('Pop'), T, STEP));
  r.push(
    kf(k('Pop'), T, [
      [0, 'opacity:0;transform:scale(.4)'],
      [360, 'opacity:.9;transform:scale(1)'],
      [440, 'opacity:0;transform:scale(1.3)'],
      [640, 'opacity:.9;transform:scale(1)'],
      [720, 'opacity:0;transform:scale(1.3)'],
      [920, 'opacity:.9;transform:scale(1)'],
      [1000, 'opacity:0;transform:scale(1.3)'],
      [1220, 'opacity:.9;transform:scale(1)'],
      [1300, 'opacity:0;transform:scale(1.3)'],
      [T, 'opacity:0'],
    ]),
  );

  // the head darts robotically, and so do the pupils
  r.push(run(s('vfPupils'), k('Pupils'), T, STEP));
  r.push(
    kf(k('Pupils'), T, [
      [0, 'transform:none'],
      [1500, 'transform:translateX(-2px)'],
      [1800, 'transform:translateX(2px)'],
      [2100, 'transform:translateX(-1px)'],
      [2400, 'transform:translateX(-2px)'],
      [2900, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('vfSmile'), k('Smile'), T, 'linear'));
  r.push(
    kf(k('Smile'), T, [
      [0, 'opacity:0'],
      [2789, 'opacity:0'],
      [2790, 'opacity:1'],
      [3299, 'opacity:1'],
      [3300, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );
  r.push(run(s('vfMouth'), k('Neutral'), T, 'linear'));
  r.push(
    kf(k('Neutral'), T, [
      [0, 'opacity:1'],
      [2789, 'opacity:1'],
      [2790, 'opacity:0'],
      [3299, 'opacity:0'],
      [3300, 'opacity:1'],
      [T, 'opacity:1'],
    ]),
  );

  return r.join('\n');
};

// -------------------------------------------------------------------- #5 ping
const cssPing = (uid: string) => {
  const T = 3600;
  const s = (n: string) => `.${uid}-v-ping .${uid}-${n}`;
  const k = (n: string) => `${uid}P${n}`;
  const r: string[] = [];

  // a listening pause reads more clearly than a hand gesture at this size
  r.push(run(s('actHead'), k('Head'), T, 'ease-out'));
  r.push(
    kf(k('Head'), T, [
      [0, 'transform:none'],
      [140, 'transform:translateY(0px) rotate(-8deg)'],
      [420, `transform:translateY(0px) rotate(-8deg);animation-timing-function:cubic-bezier(.3,0,.2,1)`],
      [510, 'transform:translateY(0px) rotate(16deg)'],
      [1900, 'transform:translateY(0px) rotate(16deg)'],
      [2010, 'transform:translateY(-1.5px) rotate(-22deg)'],
      [2100, 'transform:translateY(-1.5px) rotate(-18deg)'],
      [2600, 'transform:translateY(-1px) rotate(-14deg)'],
      [3060, 'transform:translateY(0px) rotate(-6deg)'],
      [3400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actRoot'), k('Root'), T, 'ease-out'));
  r.push(
    kf(k('Root'), T, [
      [0, 'transform:none'],
      [420, 'transform:none'],
      [480, 'transform:translateY(0px) scale(1.05,.95)'],
      [540, 'transform:translateY(0px) scale(1.05,.95)'],
      [700, 'transform:none'],
      [1900, 'transform:none'],
      [2010, 'transform:translateY(-1px) scale(.97,1.05)'],
      [2300, 'transform:translateY(0px) scale(.99,1.02)'],
      [2600, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the hat overshoot is what gives the head turn weight
  r.push(run(s('actCone'), k('Cone'), T, 'ease-out'));
  r.push(
    kf(k('Cone'), T, [
      [0, 'transform:none'],
      [1900, 'transform:none'],
      [2010, 'transform:rotate(12deg)'],
      [2160, 'transform:rotate(-5deg)'],
      [2300, 'transform:rotate(2deg)'],
      [2450, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('actArmB'), k('ArmB'), T, 'ease-out'));
  r.push(
    kf(k('ArmB'), T, [
      [0, 'transform:none'],
      [2100, 'transform:none'],
      [2230, `transform:rotate(84deg);animation-timing-function:${SNAP}`],
      [2300, 'transform:rotate(78deg)'],
      [2420, 'transform:rotate(66deg)'],
      [2540, 'transform:rotate(78deg)'],
      [2660, 'transform:rotate(66deg)'],
      [2780, 'transform:rotate(78deg)'],
      [3060, 'transform:rotate(78deg)'],
      [3300, 'transform:rotate(-8deg)'],
      [3420, 'transform:rotate(3deg)'],
      [3520, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  r.push(run(s('pBadge'), k('Badge'), T, 'ease-out'));
  r.push(
    kf(k('Badge'), T, [
      [0, 'opacity:0;transform:scale(.5)'],
      [239, 'opacity:0;transform:scale(.5)'],
      [240, `opacity:1;transform:scale(.5);animation-timing-function:${SNAP}`],
      [330, 'opacity:1;transform:scale(1.18)'],
      [420, 'opacity:1;transform:scale(1)'],
      [2820, 'opacity:1;transform:scale(1)'],
      [2900, 'opacity:1;transform:scale(1.04)'],
      [3060, 'opacity:0;transform:scale(.4)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('pFlash'), k('BFlash'), T, 'linear'));
  r.push(
    kf(k('BFlash'), T, [
      [0, 'opacity:0'],
      [259, 'opacity:0'],
      [260, 'opacity:.85'],
      [340, 'opacity:0'],
      [2819, 'opacity:0'],
      [2840, 'opacity:.8'],
      [2920, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );

  // killing the light before the body is what makes it read as going back to sleep
  r.push(run(s('pDot'), k('Dot'), T, 'ease-out'));
  r.push(
    kf(k('Dot'), T, [
      [0, 'opacity:0;transform:scale(1)'],
      [239, 'opacity:0;transform:scale(1)'],
      [240, 'opacity:1;transform:scale(1)'],
      [520, 'opacity:1;transform:scale(1.5)'],
      [640, 'opacity:1;transform:scale(1)'],
      [800, 'opacity:1;transform:scale(1.5)'],
      [920, 'opacity:1;transform:scale(1)'],
      [1080, 'opacity:1;transform:scale(1.5)'],
      [1200, 'opacity:1;transform:scale(1)'],
      [2600, 'opacity:1;transform:scale(1)'],
      [2720, 'opacity:0;transform:scale(.7)'],
      [T, 'opacity:0'],
    ]),
  );

  [0, 1, 2].forEach((i) => {
    const t0 = 520 + i * 280;
    r.push(run(s(`pArc${i}`), k(`Arc${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Arc${i}`), T, [
        [0, 'opacity:0;transform:scale(.35)'],
        [t0, 'opacity:.9;transform:scale(.35)'],
        [t0 + 900, 'opacity:0;transform:scale(1.35)'],
        [T, 'opacity:0'],
      ]),
    );
    const t1 = 1500 + i * 110;
    r.push(run(s(`pRArc${i}`), k(`RArc${i}`), T, 'ease-out'));
    r.push(
      kf(k(`RArc${i}`), T, [
        [0, 'opacity:0;transform:scale(1.4)'],
        [t1, 'opacity:0;transform:scale(1.4)'],
        [t1 + 100, 'opacity:.9;transform:scale(1.05)'],
        [t1 + 420, 'opacity:0;transform:scale(.5)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  P_SPARKS.forEach((_, i) => {
    const t0 = 2320 + i * 140;
    r.push(run(s(`pSpk${i}`), k(`Spk${i}`), T, 'ease-out'));
    r.push(
      kf(k(`Spk${i}`), T, [
        [0, 'opacity:0;transform:scale(.3)'],
        [t0, 'opacity:0;transform:scale(.3)'],
        [t0 + 120, 'opacity:1;transform:scale(1)'],
        [t0 + 380, 'opacity:0;transform:scale(.4)'],
        [T, 'opacity:0'],
      ]),
    );
  });

  r.push(run(s('actEyes'), k('Eyes'), T, 'ease-out'));
  r.push(
    kf(k('Eyes'), T, [
      [0, 'transform:none'],
      [1900, 'transform:none'],
      [2010, 'transform:scale(1.25)'],
      [2600, 'transform:scale(1.1)'],
      [3060, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('vfPupils'), k('Pupils'), T, 'ease-out'));
  r.push(
    kf(k('Pupils'), T, [
      [0, 'transform:none'],
      [420, 'transform:none'],
      [520, 'transform:translate(0px,2px)'],
      [1900, 'transform:translate(0px,2px)'],
      [2010, 'transform:translate(-2px,0px)'],
      [2900, 'transform:translate(-2px,0px)'],
      [3300, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('vfBrows'), k('Brows'), T, 'ease-out'));
  r.push(
    kf(k('Brows'), T, [
      [0, 'transform:none'],
      [420, 'transform:none'],
      [520, 'transform:translateY(-1.6px)'],
      [1900, 'transform:translateY(-1.6px)'],
      [2010, 'transform:translateY(-2.6px)'],
      [2900, 'transform:translateY(-2.6px)'],
      [3300, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('vfSmile'), k('Smile'), T, 'linear'));
  r.push(
    kf(k('Smile'), T, [
      [0, 'opacity:0'],
      [2299, 'opacity:0'],
      [2300, 'opacity:1'],
      [3059, 'opacity:1'],
      [3060, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );
  r.push(run(s('vfMouth'), k('Neutral'), T, 'linear'));
  r.push(
    kf(k('Neutral'), T, [
      [0, 'opacity:1'],
      [2299, 'opacity:1'],
      [2300, 'opacity:0'],
      [3059, 'opacity:0'],
      [3060, 'opacity:1'],
      [T, 'opacity:1'],
    ]),
  );

  return r.join('\n');
};

const VIGNETTE_CSS: Record<VignetteId, (uid: string) => string> = {
  'smart-glasses-portal': cssGlasses,
  'speech-overlap-mic': cssMic,
  'apriltag-stamp': cssTag,
  'motion-match-ghosts': cssGhosts,
  'sociometric-ping': cssPing,
};

// ------------------------------------------------------------- the base sprite
const baseStatic = (uid: string, key: string | null) => `
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
${rigOrigins(uid, key)}
${key ? vfxShared(uid) : ''}`;

const baseAnim = (uid: string) => `
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
.${uid}-walk .${uid}-brows{animation:${uid}BrowWalk .6s ease-in-out infinite}
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
.${uid}-talk .${uid}-brows{animation:${uid}BrowTalk .78s ease-in-out infinite}
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
@keyframes ${uid}WalkBob{0%,50%,100%{transform:translateY(-2.2px) scale(.98,1.035)}14%,64%{transform:translateY(-1.2px) scale(1,1)}25%,75%{transform:translateY(0) scale(1.06,.945)}34%,84%{transform:translateY(-.6px) scale(1.01,.995)}}
@keyframes ${uid}LegA{0%,50%,100%{transform:rotate(0deg)}14%,64%{transform:rotate(13deg)}25%,75%{transform:rotate(19deg)}38%,88%{transform:rotate(9deg)}}
@keyframes ${uid}LegB{0%,50%,100%{transform:rotate(0deg)}14%,64%{transform:rotate(-13deg)}25%,75%{transform:rotate(-19deg)}38%,88%{transform:rotate(-9deg)}}
@keyframes ${uid}ArmWalk{0%,100%{transform:rotate(0deg)}22%{transform:rotate(-17deg)}50%{transform:rotate(0deg)}72%{transform:rotate(17deg)}}
@keyframes ${uid}ArmFWalk{0%,100%{transform:rotate(0deg)}22%{transform:rotate(6deg)}50%{transform:rotate(0deg)}72%{transform:rotate(-6deg)}}
@keyframes ${uid}Sway{0%,50%,100%{transform:rotate(0deg)}18%{transform:rotate(-3.6deg)}68%{transform:rotate(3.6deg)}}
@keyframes ${uid}ConeWalk{0%,50%,100%{transform:rotate(0deg)}32%{transform:rotate(6deg)}82%{transform:rotate(-6deg)}}
@keyframes ${uid}HeadWalk{0%,50%,100%{transform:translateY(0) rotate(0deg)}25%,75%{transform:translateY(.7px) rotate(0deg)}30%{transform:translateY(.4px) rotate(2.2deg)}80%{transform:translateY(.4px) rotate(-2.2deg)}}
@keyframes ${uid}BrowWalk{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(.5px)}}
@keyframes ${uid}ShadowWalk{0%,50%,100%{transform:scale(.86,.78);opacity:.38}25%,75%{transform:scale(1.08,1.05);opacity:.6}}
@keyframes ${uid}TalkBob{0%,100%{transform:translateY(0) scale(1.012,.99)}18%{transform:translateY(-1.6px) scale(.995,1.01)}50%{transform:translateY(-2.2px) scale(.985,1.022)}82%{transform:translateY(-1px) scale(1.005,1)}}
@keyframes ${uid}HeadTalk{0%,100%{transform:translateY(0) rotate(-2deg) scale(1,1)}28%{transform:translateY(-1.4px) rotate(1deg) scale(1.02,.985)}50%{transform:translateY(-1.2px) rotate(2deg) scale(1,1)}78%{transform:translateY(-.4px) rotate(-.6deg) scale(.99,1.014)}}
@keyframes ${uid}ConeTalk{0%,100%{transform:rotate(3.4deg)}34%{transform:rotate(-2deg)}62%{transform:rotate(-3.4deg)}}
@keyframes ${uid}ArmTalk{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(5deg)}}
@keyframes ${uid}ArmFTalk{0%,100%{transform:rotate(2.5deg)}50%{transform:rotate(-3.5deg)}}
@keyframes ${uid}BrowTalk{0%,100%{transform:translateY(.3px) scale(1,1)}22%{transform:translateY(-1.3px) scale(1.03,1)}54%{transform:translateY(-.2px) scale(1,1)}76%{transform:translateY(-1px) scale(1.02,1)}}
@keyframes ${uid}Mouth{0%,100%{opacity:0;transform:scale(.7,.5)}10%{opacity:1;transform:scale(1,1.08)}26%{opacity:.18;transform:scale(.8,.6)}44%{opacity:1;transform:scale(1.08,.9)}62%{opacity:.12;transform:scale(.76,.55)}80%{opacity:1;transform:scale(.96,1.12)}92%{opacity:.3;transform:scale(.85,.7)}}`;

// ------------------------------------------------------------------ vfx props
//
// every prop below only exists while a vignette is set, so a cancel cannot strand one:
// the whole subtree leaves the dom in the same commit that drops the class.

interface FxProps {
  uid: string;
  u: (n: string) => string;
  v: VignetteId;
}

const VignetteDefs: React.FC<Omit<FxProps, 'u'>> = ({ uid, v }) => (
  <>
    {v === 'smart-glasses-portal' && (
      <>
        <clipPath id={`${uid}-clipL`}>
          <rect x="43.9" y="49.4" width="7.4" height="6.4" rx="1.8" />
        </clipPath>
        <clipPath id={`${uid}-clipR`}>
          <rect x="56" y="49.2" width="8" height="6.6" rx="1.8" />
        </clipPath>
        <clipPath id={`${uid}-clipOrb`}>
          <circle cx="75" cy="22" r="7" />
        </clipPath>
      </>
    )}
    {v === 'apriltag-stamp' && (
      <>
        <clipPath id={`${uid}-clipTag`}>
          <rect x="18" y="82" width="12" height="12" rx="1.6" />
        </clipPath>
        <linearGradient id={`${uid}-beam`} gradientUnits="userSpaceOnUse" x1="75" y1="22" x2="16" y2="56">
          <stop offset="0" stopColor="#a5f3fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a5f3fc" stopOpacity="0" />
        </linearGradient>
      </>
    )}
    {v === 'motion-match-ghosts' && (
      // one six-primitive silhouette, reused by all ten onion skins
      <g id={`${uid}-ghost`} fill="#a78bfa" fillOpacity="0.22" stroke="none">
        <path d="M34.6 33.8C33.2 26 30.6 16 28.8 10.6C28 7.8 24.4 8.2 25 11.4C33 14.6 46.6 22.4 53 28C56 30.6 61.6 33.2 66 33.6Z" />
        <path d="M27.5 35C27.5 31.2 37.6 28.6 50 28.6C62.4 28.6 72.5 31.2 72.5 35C72.5 38.3 65.6 40.6 57 41.2C54.7 41.4 52.4 41.5 50 41.5C47.6 41.5 45.3 41.4 43 41.2C34.4 40.6 27.5 38.3 27.5 35Z" />
        <path d="M50 31C60 31 67.5 37.4 67.5 46.8C67.5 54.6 63.8 61 58.4 64.2C55.8 65.7 53 66.4 50 66.4C47 66.4 44.2 65.7 41.6 64.2C36.2 61 32.5 54.6 32.5 46.8C32.5 37.4 40 31 50 31Z" />
        <path d="M32 62C32 58 41.2 58.2 50 58.2C58.8 58.2 68 58 68 62L70.6 100C71.4 106 68.4 111.6 65 111.6L35 111.6C31.6 111.6 28.6 106 29.4 100Z" />
        <path d="M38 62.5C30.4 65 25.4 71.6 23.4 80L31.4 82.4C32.6 76 35.8 70 41.2 66Z" />
        <path d="M84 111L88.4 111L78.6 28L74.2 28Z" />
      </g>
    )}
  </>
);

// props that ride the back hand
const ArmBFx: React.FC<FxProps> = ({ uid, u, v }) => {
  const c = (n: string) => `${uid}-${n}`;
  if (v === 'smart-glasses-portal') {
    return (
      <g className={c('gHeld')} opacity="0" stroke="#241a2e" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="21.4" y="83.2" width="5" height="3.4" rx="1.2" fill={u('gem')} fillOpacity="0.55" />
        <rect x="27.2" y="83.2" width="5" height="3.4" rx="1.2" fill={u('gem')} fillOpacity="0.55" />
        <path d="M26.4 84.6L27.2 84.6" fill="none" />
        <path d="M21.4 84.4L20 83.6" fill="none" stroke="#7dd3fc" strokeWidth="1.4" />
      </g>
    );
  }
  if (v === 'apriltag-stamp') {
    return (
      <g className={c('tTag')} opacity="0">
        {/* high contrast black on white is why this still reads at 64px */}
        <rect
          x="18"
          y="82"
          width="12"
          height="12"
          rx="1.6"
          fill="#f8fafc"
          stroke="#241a2e"
          strokeWidth="2.2"
        />
        <g fill="#241a2e" stroke="none">
          {T_PAT1.map(([cx, cy], i) => (
            <rect key={i} x={19.5 + cx * 3} y={83.5 + cy * 3} width="3" height="3" />
          ))}
        </g>
        <g className={c('tPat2')} opacity="0" fill="#241a2e" stroke="none">
          <rect x="19.5" y="83.5" width="9" height="9" fill="#f8fafc" />
          {T_PAT2.map(([cx, cy], i) => (
            <rect key={i} x={19.5 + cx * 3} y={83.5 + cy * 3} width="3" height="3" />
          ))}
        </g>
        <g clipPath={`url(#${uid}-clipTag)`}>
          <rect
            className={c('tScan')}
            opacity="0"
            x="23.2"
            y="82"
            width="1.6"
            height="12"
            fill="#ffffff"
            stroke="none"
          />
        </g>
        <rect
          className={c('tFlash')}
          opacity="0"
          x="18"
          y="82"
          width="12"
          height="12"
          rx="1.6"
          fill="#ffffff"
          stroke="none"
        />
        <g fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round">
          {T_CORNERS.map((d, i) => (
            <path key={i} className={c('tCorner')} opacity="0" d={d} />
          ))}
        </g>
        {T_AXES.map((a, i) => (
          <path
            key={i}
            className={c(`tAxis${i}`)}
            opacity="0"
            d={a.d}
            fill="none"
            stroke={a.c}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ))}
        <circle
          className={c('tRing')}
          opacity="0"
          cx={T_CX}
          cy={T_CY}
          r="9"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.4"
        />
        <path
          className={c('tCheck')}
          opacity="0"
          d="M20.4 88.2L23.2 91.4L28 84.4"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="20"
        />
      </g>
    );
  }
  return null;
};

// the flare has to ride the staff, because in #2 the staff is what moves
const StaffFx: React.FC<FxProps> = ({ uid, u, v }) =>
  v === 'speech-overlap-mic' ? (
    <circle className={`${uid}-mFlare`} opacity="0" cx="75" cy="22" r="13" fill={u('glowIn')} stroke="none" />
  ) : null;

// props that ride the head
const HeadFx: React.FC<FxProps> = ({ uid, u, v }) => {
  const c = (n: string) => `${uid}-${n}`;
  return (
    <>
      {v === 'smart-glasses-portal' && (
        <>
          <g className={c('gWorn')} opacity="0">
            <rect
              x="43.9"
              y="49.4"
              width="7.4"
              height="6.4"
              rx="1.8"
              fill={u('gem')}
              fillOpacity="0.45"
              stroke="#241a2e"
              strokeWidth="2"
            />
            <rect
              x="56"
              y="49.2"
              width="8"
              height="6.6"
              rx="1.8"
              fill={u('gem')}
              fillOpacity="0.45"
              stroke="#241a2e"
              strokeWidth="2"
            />
            <path d="M51.3 52.2L56 52" fill="none" stroke="#241a2e" strokeWidth="2" />
            <path d="M64 52.2L67.4 50.6" fill="none" stroke="#241a2e" strokeWidth="2" />
            <path d="M45.2 51.2L49.6 50.8M57.4 51L62 50.6" fill="none" stroke="#a5f3fc" strokeWidth="1.5" />
            <g clipPath={`url(#${uid}-clipL)`}>
              <rect className={c('gScanL')} opacity="0" x="44.2" y="50" width="5.6" height="0.9" fill="#a5f3fc" />
            </g>
            <g clipPath={`url(#${uid}-clipR)`}>
              <rect className={c('gScanR')} opacity="0" x="56.4" y="49.8" width="5.6" height="0.9" fill="#a5f3fc" />
            </g>
          </g>
          <g className={c('gClink')} opacity="0" fill={u('gold')} stroke="none">
            <path d={diamond(66.4, 49.4, 2)} />
            <path d={diamond(68.4, 52.2, 1.6)} />
          </g>
        </>
      )}
      {v === 'speech-overlap-mic' &&
        M_SWEAT.map((p, i) => (
          <path
            key={i}
            className={c(`mSweat${i}`)}
            opacity="0"
            d={`M${p.x} ${p.y - 3}C${p.x + 2.2} ${p.y} ${p.x + 2.2} ${p.y + 2.6} ${p.x} ${p.y + 2.6}C${
              p.x - 2.2
            } ${p.y + 2.6} ${p.x - 2.2} ${p.y} ${p.x} ${p.y - 3}Z`}
            fill="#a5f3fc"
            stroke="#241a2e"
            strokeWidth="1.8"
          />
        ))}
    </>
  );
};

// screen-space props: mounted as the last child of the flip group
const VfxLayer: React.FC<FxProps> = ({ uid, u, v }) => {
  const c = (n: string) => `${uid}-${n}`;
  return (
    <g className={`${uid}-vfxLayer`} pointerEvents="none">
      {v === 'smart-glasses-portal' && (
        <>
          <circle className={c('gFlare')} opacity="0" cx="75" cy="22" r="13" fill={u('glowIn')} stroke="none" />
          <g clipPath={`url(#${uid}-clipOrb)`}>
            <rect className={c('gOrbScan')} opacity="0" x="67.5" y="0" width="15" height="2.6" fill="#ffffff" />
          </g>
          {G_PIXELS.map((p, i) => (
            <rect
              key={i}
              className={c(`gPix${i}`)}
              opacity="0"
              x={p.x - 1.3}
              y={p.y - 1.3}
              width="2.6"
              height="2.6"
              fill="#c4b5fd"
              stroke="none"
            />
          ))}
          <ellipse
            className={c('gShim')}
            opacity="0"
            cx="50"
            cy="110"
            rx="14"
            ry="5"
            fill={u('glowOut')}
            stroke="none"
          />
          {G_SPARKS.map((p, i) => (
            <path key={i} className={c(`gSpk${i}`)} opacity="0" d={diamond(p.x, p.y, 2.4)} fill="#e9d5ff" stroke="none" />
          ))}
          <rect className={c('gSeam')} opacity="0" x="49" y="86" width="2" height="26" fill="#e9d5ff" stroke="none" />
          {G_DUST.map((p, i) => (
            <path
              key={i}
              className={c(`gDust${i}`)}
              opacity="0"
              d={`M${p.x - 4} ${p.y}Q${p.x} ${p.y - 3.4} ${p.x + 4} ${p.y}`}
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
          {/* the hat hangs in the vfx layer, so it is untouched by the body dissolving under it */}
          <use className={c('gHat')} opacity="0" href={`#${uid}-hatArt`} />
        </>
      )}

      {v === 'speech-overlap-mic' && (
        <>
          <g className={c('mBarsA')} opacity="0" fill="#a78bfa" stroke="none">
            {M_BARS_A.map((x, i) => (
              <rect key={i} className={c(`mBarA${i}`)} x={x} y="2" width="3" height="14" rx="1.5" />
            ))}
          </g>
          <g className={c('mBarsB')} opacity="0" fill="#38bdf8" stroke="none">
            {M_BARS_B.map((x, i) => (
              <rect key={i} className={c(`mBarB${i}`)} x={x} y="2" width="3" height="14" rx="1.5" />
            ))}
          </g>
          <rect
            className={c('mDivider')}
            opacity="0"
            x="60.4"
            y="2"
            width="1.2"
            height="14"
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="1.2"
            strokeDasharray="2.4 2"
          />
          <g className={c('mClash')} opacity="0">
            <path
              d="M61 2L63.6 7.4L69.4 8.2L65.2 12.4L66.2 18.2L61 15.4L55.8 18.2L56.8 12.4L52.6 8.2L58.4 7.4Z"
              fill="#fbbf24"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M72.6 5L75.6 3.6M49.4 5L46.4 3.6M61 21.4L61 24.4"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </>
      )}

      {v === 'apriltag-stamp' && (
        <>
          <path
            className={c('tBeam')}
            opacity="0"
            d="M74 24L16.6 50.5L16.6 62.5Z"
            fill={`url(#${uid}-beam)`}
            stroke="none"
          />
          {G_DUST.map((p, i) => (
            <path
              key={i}
              className={c(`tDust${i}`)}
              opacity="0"
              d={`M${p.x - 4} ${p.y}Q${p.x} ${p.y - 3.4} ${p.x + 4} ${p.y}`}
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}
        </>
      )}

      {v === 'motion-match-ghosts' && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <use key={i} className={c(`hG${i}`)} opacity="0" href={`#${uid}-ghost`} />
          ))}
          {H_CANDS.map((p, i) => (
            <g key={i} className={c(`hCand${i}`)} opacity="0">
              <use
                className={c(`hFlick${i}`)}
                href={`#${uid}-ghost`}
                transform={`translate(${p.cx} ${p.cy}) scale(${H_CAND_SCALE}) translate(${-H_ART_CX} ${-H_ART_CY}) rotate(${
                  i * 7 - 7
                } ${H_ART_CX} ${H_ART_CY})`}
              />
              <rect
                x={p.cx - 12.5}
                y={p.cy - 20}
                width="25"
                height="40"
                rx="2"
                fill="none"
                stroke="#a5f3fc"
                strokeWidth="1.4"
                strokeDasharray="3 2.4"
                opacity="0.7"
              />
            </g>
          ))}
          <rect
            className={c('hBoxSel')}
            opacity="0"
            x={H_CANDS[1].cx - 12.5}
            y={H_CANDS[1].cy - 20}
            width="25"
            height="40"
            rx="2"
            fill="none"
            stroke="#4ade80"
            strokeWidth="2"
          />
          {H_TRAIL.map((p, i) => (
            <circle key={i} className={c(`hTrail${i}`)} opacity="0" cx={p.x} cy={p.y} r="1.8" fill="#4ade80" stroke="none" />
          ))}
          <use className={c('hGSel')} opacity="0" href={`#${uid}-ghost`} />
          {[0, 1, 2].map((i) => (
            <use key={i} className={c(`hTG${i}`)} opacity="0" href={`#${uid}-ghost`} />
          ))}
          {H_SPARKS.map((p, i) => (
            <path key={i} className={c(`hSpk${i}`)} opacity="0" d={spark(p.x, p.y, 3)} fill="#e9d5ff" stroke="none" />
          ))}
          <path className={c('hPop0')} opacity="0" d={diamond(38, 110, 2.4)} fill="#a5f3fc" stroke="none" />
          <path className={c('hPop1')} opacity="0" d={diamond(61, 110, 2.4)} fill="#a5f3fc" stroke="none" />
        </>
      )}

      {v === 'sociometric-ping' && (
        <>
          {[21, 15, 9].map((r, i) => (
            <path
              key={i}
              className={c(`pArc${2 - i}`)}
              opacity="0"
              d={arcUp(P_BX, P_BY, r)}
              fill="none"
              stroke="#a5f3fc"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          ))}
          {[20, 15, 10].map((r, i) => (
            <path
              key={i}
              className={c(`pRArc${i}`)}
              opacity="0"
              d={arcIn(6, 30, r)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          ))}
          {/* reuses the existing gold and gem gradients, so it reads as costume, not sticker */}
          <g className={c('pBadge')} opacity="0">
            <path d={`M${P_BX - 1.8} ${P_BY - 3.2}L${P_BX - 1.8} ${P_BY - 5.4}L${P_BX + 1.8} ${P_BY - 5.4}L${P_BX + 1.8} ${P_BY - 3.2}`} fill={u('goldDeep')} stroke="#241a2e" strokeWidth="1.8" strokeLinejoin="round" />
            <rect
              x={P_BX - 4.5}
              y={P_BY - 3.2}
              width="9"
              height="6.4"
              rx="1.8"
              fill={u('gold')}
              stroke="#241a2e"
              strokeWidth="2.2"
            />
            <circle className={c('pDot')} opacity="0" cx={P_BX} cy={P_BY} r="1.2" fill={u('gem')} stroke="none" />
            <rect
              className={c('pFlash')}
              opacity="0"
              x={P_BX - 4.5}
              y={P_BY - 3.2}
              width="9"
              height="6.4"
              rx="1.8"
              fill="#ffffff"
              stroke="none"
            />
          </g>
          {P_SPARKS.map((p, i) => (
            <path key={i} className={c(`pSpk${i}`)} opacity="0" d={spark(p.x, p.y, 2.8)} fill="#fbbf24" stroke="none" />
          ))}
        </>
      )}
    </g>
  );
};

// a hand-painted chibi wizard-scholar: bold contour, gradient shading, one glowing orb
export const CompanionSprite: React.FC<CompanionSpriteProps> = ({
  facing,
  state,
  size = 72,
  className,
  vignette = null,
}) => {
  const rawId = useId();
  // useId() returns characters that are illegal in css selectors, so strip them
  const uid = useMemo(() => `cs${rawId.replace(/[^a-zA-Z0-9]/g, '')}`, [rawId]);

  const g = useMemo(() => (name: string) => `${uid}-${name}`, [uid]);
  const u = useMemo(() => (name: string) => `url(#${uid}-${name})`, [uid]);

  // the vignette rules are appended after the state rules, so `.uid-v-x .uid-actRoot`
  // reliably beats anything at equal specificity, and they vanish with the prop
  const css = useMemo(
    () =>
      `${baseStatic(uid, vignette ? VIGNETTE_KEY[vignette] : null)}\n@media (prefers-reduced-motion: no-preference){\n${baseAnim(
        uid,
      )}\n${vignette ? `${vfxSharedAnim(uid)}\n${VIGNETTE_CSS[vignette](uid)}` : ''}\n}\n`,
    [uid, vignette],
  );

  const flip = facing === 'left' ? `translate(${VIEW_W},0) scale(-1,1)` : undefined;
  const rootClass = `${uid} ${uid}-${STATE_CLASS[state]}${
    vignette ? ` ${uid}-vfx ${uid}-v-${VIGNETTE_KEY[vignette]}` : ''
  }`;

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
        {vignette && <VignetteDefs uid={uid} v={vignette} />}
      </defs>

      <style dangerouslySetInnerHTML={{ __html: css }} />

      <g className={rootClass}>
        <g transform={flip}>
          {/* contact shadow */}
          <g className={g('actShadow')}>
            <ellipse
              className={g('shadow')}
              cx="48"
              cy="113.5"
              rx="25"
              ry="4.4"
              fill={u('shadow')}
            />
          </g>

          <g
            className={g('body')}
            stroke="#241a2e"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            {/* the vignette rig hangs off the feet, so the base cycles keep running underneath */}
            <g className={g('actRoot')}>
              {/* far arm, behind the robe */}
              <g className={g('armB')}>
                <g className={g('actArmB')}>
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
                  {vignette && <ArmBFx uid={uid} u={u} v={vignette} />}
                </g>
              </g>

              {/* legs, tucked under the robe hem */}
              <g className={g('legB')}>
                <g className={g('actLegB')}>
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
              </g>
              <g className={g('legF')}>
                <g className={g('actLegF')}>
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
              </g>

              {/* torso: sway pivots at the shoulders, breathing scales from the hem */}
              <g className={g('sway')}>
                <g className={g('breathe')}>
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
              <g className={g('head')}>
                <g className={g('actHead')}>
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

                  {/* brows: the talk cycle now lifts them */}
                  <g className={g('brows')} fill="none" stroke="#8a5836" strokeWidth="2.3">
                    <path d="M43.4 45C45.2 43 48.8 42.8 51.4 44.6" />
                    <path d="M56 44.4C58 42.2 62.2 42.2 64.6 44.2" />
                  </g>

                  {/* eyes: the whole group squashes for the blink */}
                  <g className={g('actEyes')}>
                    <g className={g('eyes')}>
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
                    {/* replacement eyes: identical art, but the vignette can scale and dart them */}
                    {vignette && (
                      <g className={g('vfEyes')}>
                        <ellipse cx="47.6" cy="52.6" rx="4.6" ry="5.4" fill="#fffaf2" strokeWidth="2.1" />
                        <ellipse cx="60" cy="52.4" rx="5.1" ry="5.7" fill="#fffaf2" strokeWidth="2.1" />
                        <g className={g('vfPupils')}>
                          <circle cx="48.6" cy="53.4" r="2.7" fill="#33205a" stroke="none" />
                          <circle cx="61" cy="53.3" r="2.9" fill="#33205a" stroke="none" />
                          <circle cx="48.6" cy="54.7" r="1.25" fill="#7c5ce0" opacity="0.85" stroke="none" />
                          <circle cx="61" cy="54.6" r="1.35" fill="#7c5ce0" opacity="0.85" stroke="none" />
                          <circle cx="47" cy="51.3" r="1.2" fill="#ffffff" stroke="none" />
                          <circle cx="59.4" cy="51.1" r="1.3" fill="#ffffff" stroke="none" />
                        </g>
                      </g>
                    )}
                  </g>
                  <g className={g('lids')}>
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
                    className={g('mouth')}
                    d="M49.6 59.6C51.8 63.2 56 63.2 58 59.4"
                    fill="none"
                    strokeWidth="2.3"
                  />
                  <g className={g('mouthopen')}>
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

                  {/* the replacement face: one rig, five vignettes, opacity-toggled variants */}
                  {vignette && (
                    <>
                      <g className={g('vfLids')}>
                        <path d="M43.3 52.5C45 54.6 50.2 54.6 51.9 52.5" fill="none" strokeWidth="2.3" />
                        <path d="M55 52.3C57 54.6 63 54.6 65 52.3" fill="none" strokeWidth="2.3" />
                      </g>
                      <g className={g('vfBrows')} fill="none" stroke="#8a5836" strokeWidth="2.3">
                        <path d="M43.4 45C45.2 43 48.8 42.8 51.4 44.6" />
                        <path className={g('vfBrowR')} d="M56 44.4C58 42.2 62.2 42.2 64.6 44.2" />
                      </g>
                      <path
                        className={g('vfMouth')}
                        d="M49.6 59.6C51.8 63.2 56 63.2 58 59.4"
                        fill="none"
                        strokeWidth="2.3"
                      />
                      <g className={g('vfMouthO')} opacity="0">
                        <ellipse cx="53.8" cy="60.8" rx="3.6" ry="3.2" fill="#4a2036" strokeWidth="2.1" />
                        <ellipse cx="53.8" cy="62.2" rx="2.1" ry="1" fill="#e07a72" stroke="none" />
                      </g>
                      <g className={g('vfMouthBig')} opacity="0">
                        <ellipse cx="53.8" cy="61" rx="6.2" ry="5" fill="#4a2036" strokeWidth="2.2" />
                        <ellipse cx="53.8" cy="63.6" rx="3.2" ry="1.6" fill="#e07a72" stroke="none" />
                      </g>
                      <path
                        className={g('vfSmile')}
                        opacity="0"
                        d="M46.6 58.2C49.6 65.2 58.6 65.2 61.6 58C56.8 60.4 51.4 60.4 46.6 58.2Z"
                        fill="#4a2036"
                        strokeWidth="2.2"
                      />
                      <HeadFx uid={uid} u={u} v={vignette} />
                    </>
                  )}

                  {/* pointed hat: the cone lags behind the head, the brim sits over its base.
                      hatHide wraps hatArt so the <use> clone in the vfx layer is never hidden with it */}
                  <g className={g('hatHide')}>
                    <g id={g('hatArt')}>
                      <g className={g('cone')}>
                        <g className={g('actCone')}>
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
                          <g className={g('star')}>
                            <path
                              d="M37 19.5C37.9 23 39.1 24.1 41.2 24.5C39.1 24.9 37.9 26 37 29.5C36.1 26 34.9 24.9 32.8 24.5C34.9 24.1 36.1 23 37 19.5Z"
                              fill={u('gold')}
                              strokeWidth="2.1"
                            />
                          </g>
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
                  </g>
                </g>
              </g>

              {/* near arm with the staff and the glowing orb */}
              <g className={g('armF')}>
                <g className={g('actArmF')}>
                  {/* actStaff wraps only the staff itself, so the sleeve stays welded to the arm */}
                  <g className={g('actStaff')}>
                    {vignette && <StaffFx uid={uid} u={u} v={vignette} />}
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
                    <g className={g('glow')} stroke="none">
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
                  </g>
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

          {vignette && <VfxLayer uid={uid} u={u} v={vignette} />}
        </g>
      </g>
    </svg>
  );
};
