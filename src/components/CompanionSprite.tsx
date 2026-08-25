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

// the rectangle the art is composed against, and the one that used to be the whole view
// box. it no longer bounds the drawing, but it still sets the scale: `size` is the height
// of THIS rectangle, so a caller that passed size={88} before gets the same character.
const ART_W = 100;
const ART_H = 120;

// the view box the sprite actually paints into. measured, not guessed: getBBox() sampled
// across the whole of all three base cycles and all five vignettes puts the union of every
// visible element at x -27.9..117.0, y -30.1..122.0. what drives those corners is not the
// body — it is the staff's amber halo, a 20-unit radial fade that a whole-body stretch or
// lean throws outward, plus the hat star's glow, the spellbook's, and the contact shadow at
// y=120.5. three units of air on top of that. the box is kept symmetric about x=50, the
// axis the character is drawn around, so the facing flip below mirrors it in place.
const VIEW_X = -31;
const VIEW_Y = -34;
const VIEW_W = 162;
const VIEW_H = 159;

// he does not walk any more, he flies — and this picks what he flies on. only the carpet
// is drawn today; the cloud that was meant to sit beside it never arrived, so the union is
// here to keep the swap a one-line edit rather than a rewrite when it does.
const RIDE: 'carpet' | 'cloud' = 'carpet';

// the svg is bigger than its `size` box now, so it has to hang outside the slot a consumer
// gives it. a caller keeps a size x size slot, positions the sprite at this offset inside
// it, and the character lands exactly where a plain size x size svg used to put it —
// which is what Companion's catch radius and bubble anchoring assume.
export const spriteSlotOffset = (size: number) => ({
  left: (size * ((ART_H - ART_W) / 2 + VIEW_X)) / ART_H,
  top: (size * VIEW_Y) / ART_H,
});

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
  { x: 36, y: 38, dx: -7, dy: -5 },
  { x: 60, y: 38, dx: 6, dy: -6 },
  { x: 48, y: 60, dx: -2, dy: -8 },
  { x: 30, y: 70, dx: -9, dy: -4 },
  { x: 68, y: 72, dx: 8, dy: -5 },
  { x: 40, y: 86, dx: -6, dy: -8 },
  { x: 57, y: 88, dx: 5, dy: -9 },
  { x: 38, y: 104, dx: -5, dy: -7 },
  { x: 60, y: 104, dx: 7, dy: -4 },
];
const G_SPARKS = [
  { x: 40, y: 110 },
  { x: 57, y: 107 },
  { x: 48, y: 103 },
];
const G_DUST = [
  { x: 33, y: 113, dx: -5 },
  { x: 63, y: 113, dx: 5 },
];

// #2 two speakers: cluster A is him, cluster B is the intruder. the view box now clears the
// hat, so both bands sit above it on one baseline, straddling the head — his to the left of
// the cone, the intruder's to the right — and slide into each other. the collision is
// horizontal, which is what overlapping speech looks like on a two-channel meter.
// the hat's topmost ink is the star's glow at y=-5, so the baseline sits at -8.
const M_BARS_A = [20, 24, 28, 32, 36];
const M_BARS_B = [57, 61, 65, 69, 73];
const M_BASE_A = -8;
const M_BASE_B = -8;
const M_BAR_H = 10;
// the seam the two bands meet on, and the height the clash flash pops at
const M_MID = 48;
const M_MID_Y = -14;
// each band travels this far inward; the gap between them is 18, so they overlap by 6
const M_CLOSE = 12;
const M_DELAY_A = [-40, -110, -20, -90, -60];
const M_DELAY_B = [-70, -30, -100, -50, -15];
const M_SWEAT = [
  { x: 70, y: 36, dx: 6, dy: -5 },
  { x: 27, y: 34, dx: -6, dy: -5 },
  { x: 66, y: 45, dx: 7, dy: -2 },
];

// #3 the tag rides the back hand; everything else rides the tag
// the card is centred on the new back mitten (76.2, 83); every corner, axis and scan bar
// below is that 12x12 card offset by (+52, -5) from where the old hand held it
const T_CX = 76;
const T_CY = 83;
const T_CORNERS = [
  'M70 80.5L70 77L73.5 77',
  'M78.5 77L82 77L82 80.5',
  'M82 85.5L82 89L78.5 89',
  'M73.5 89L70 89L70 85.5',
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
  { d: 'M76 83L83 83', c: '#ef4444' },
  { d: 'M76 83L76 76', c: '#4ade80' },
  { d: 'M76 83L80.6 87.2', c: '#60a5fa' },
];

// #4 candidate poses parked in the free corners of the view box. the chibi is 97 units
// wide once the staff and the spellbook are counted, so the thumbnails shrank and their
// boxes widened to hold the whole silhouette.
const H_CANDS = [
  { cx: 84, cy: 18 },
  { cx: 84, cy: 99 },
  { cx: 14, cy: 99 },
];
const H_CAND_SCALE = 0.26;
const H_BOX_W = 28;
const H_BOX_H = 34;
// the silhouette's own centre, so a candidate can be re-centred on its corner
const H_ART_CX = 49;
const H_ART_CY = 57;
// these pivot on the feet, 113.3 units below the hat star, so a small vertical scale moves
// the star a long way; the view box has the headroom for it now, but the poses stay modest
// so the silhouette still reads as the same character between snaps
const H_POSE = {
  rest: 'translate(0px,0px)',
  a: 'translate(-5px,0px) rotate(-7deg)',
  b: 'translate(6px,0px) rotate(8deg) scale(.94,1.02)',
  c: 'translate(0px,-4px) scale(1.1,.9)',
  d: 'translate(-3px,0px) rotate(-4deg)',
  sel: 'translate(-4px,-3px) rotate(6deg) scale(.96,1)',
};
const H_SPARKS = [
  { x: 26, y: 8 },
  { x: 84, y: 30 },
  { x: 22, y: 104 },
  { x: 80, y: 96 },
];
// the trail runs from the winning thumbnail in the lower right back to the body
const H_TRAIL = [
  { x: 78, y: 94 },
  { x: 70, y: 88 },
  { x: 62, y: 82 },
  { x: 55, y: 76 },
];

// #5 the badge pins to the left collar wing, high and clear of the belt and both clasps;
// from there the arcs open up-left into the only open quadrant the chibi leaves
const P_BX = 24;
const P_BY = 58;
const P_SPARKS = [
  { x: 16, y: 66 },
  { x: 31, y: 48 },
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

// a five-point star centred on (x,y), point up; the waist ratio is the one the old
// hand-authored clash star used, so the silhouette is unchanged
const star5 = (x: number, y: number, r: number) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.435 : r;
    p.push(`${(x + rr * Math.cos(a)).toFixed(2)} ${(y + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${p.join('L')}Z`;
};

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
    ['actShadow', '48px 114.5px'],
    ['actRoot', '48px 113.6px'],
    ['actLegB', '40px 70.5px'],
    ['actLegF', '56px 70.5px'],
    ['actArmB', '64px 57px'],
    ['actArmF', '32px 57px'],
    ['actStaff', '15.4px 81.8px'],
    ['actHead', '48px 53px'],
    ['actCone', '48px 21px'],
    ['actEyes', '48px 40px'],
    ['actBook', '82.5px 55px'],
    // base groups that the polish pass now transforms
    ['brows', '48px 30.2px'],
    ['mouthopen', '48.4px 49.8px'],
    // flight rig: the vehicle, and the parts of him that only exist off the ground
    ['carpet', '48px 115px'],
    ['carpetLip', '48px 115px'],
    ['carpetFringeB', '-10.3px 112.9px'],
    ['carpetFringeF', '104.4px 115.9px'],
    ['carpetAura', '48px 119px'],
    ['flyRise', '48px 113.6px'],
    ['flyLegs', '48px 97px'],
    ['flyStaff', '15.4px 81.8px'],
    ['flyTailA', '27px 84px'],
    ['flyTailB', '26.5px 89.5px'],
    // replacement face
    ['vfEyes', '48px 40px'],
    ['vfPupils', '48.3px 41.5px'],
    ['vfBrows', '48px 30.2px'],
    ['vfBrowR', '57px 30.2px'],
    ['vfMouth', '48.4px 49.8px'],
    ['vfMouthO', '48.4px 49.8px'],
    ['vfMouthBig', '48.4px 49.8px'],
    ['vfSmile', '48.4px 49px'],
    ['hatHide', '48px 21px'],
    // #1
    ['gHeld', '76.2px 82.6px'],
    ['gWorn', '48px 39.5px'],
    ['gClink', '70px 36.5px'],
    ['gScanL', '38.8px 39.5px'],
    ['gScanR', '57.2px 39.5px'],
    ['gOrbScan', '9px 14px'],
    ['gFlare', '9px 14px'],
    ['gHat', '48px 21px'],
    ['gShim', '48px 113px'],
    ['gSeam', '48px 113.6px'],
    // #2
    ['mBarsA', `${M_MID}px ${M_BASE_A}px`],
    ['mBarsB', `${M_MID}px ${M_BASE_B}px`],
    ['mDivider', `${M_MID}px ${M_MID_Y}px`],
    ['mClash', `${M_MID}px ${M_MID_Y}px`],
    ['mFlare', '9px 14px'],
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
    ['tBeam', '9px 14px'],
    // #4 — every onion skin pivots on the feet, like actRoot does
    ['hG0', '48px 113.6px'],
    ['hG1', '48px 113.6px'],
    ['hG2', '48px 113.6px'],
    ['hG3', '48px 113.6px'],
    ['hGSel', '48px 113.6px'],
    ['hTG0', '48px 113.6px'],
    ['hTG1', '48px 113.6px'],
    ['hTG2', '48px 113.6px'],
    ['hBoxSel', `${H_CANDS[1].cx}px ${H_CANDS[1].cy}px`],
    ['hPop0', '34px 112px'],
    ['hPop1', '62px 112px'],
    // #5
    ['pBadge', `${P_BX}px ${P_BY}px`],
    ['pDot', `${P_BX}px ${P_BY}px`],
    ['pFlash', `${P_BX}px ${P_BY}px`],
  ];
  // the outgoing arcs scale about the badge; the reply converges on its own off-frame centre
  [0, 1, 2].forEach((i) => {
    o.push([`pArc${i}`, `${P_BX}px ${P_BY}px`]);
    o.push([`pRArc${i}`, '2px 30px']);
  });
  G_PIXELS.forEach((p, i) => o.push([`gPix${i}`, `${p.x}px ${p.y}px`]));
  G_SPARKS.forEach((p, i) => o.push([`gSpk${i}`, `${p.x}px ${p.y}px`]));
  G_DUST.forEach((p, i) => o.push([`gDust${i}`, `${p.x}px ${p.y}px`]));
  G_DUST.forEach((p, i) => o.push([`tDust${i}`, `${p.x}px ${p.y}px`]));
  M_BARS_A.forEach((x, i) => o.push([`mBarA${i}`, `${x + 1.5}px ${M_BASE_A}px`]));
  M_BARS_B.forEach((x, i) => o.push([`mBarB${i}`, `${x + 1.5}px ${M_BASE_B}px`]));
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
      [2300, 'transform:translateY(0px) scale(.86,1.16)'],
      [2460, 'transform:translateY(0px) scale(1.14,.02);opacity:1'],
      [2519, 'transform:translateY(0px) scale(1.14,.02);opacity:0'],
      [3699, 'transform:translateY(0px) scale(1.2,.06);opacity:0'],
      [3700, 'transform:translateY(0px) scale(1.2,.06);opacity:1'],
      [3800, 'transform:translateY(0px) scale(.82,1.18)'],
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

  // the back hand orbits at r=28.7 around the shoulder (64,57); the only part of that
  // circle it can reach without disappearing behind the front arm or the spellbook is the
  // sweep across the belly, so the retrieve is now a dip into the belt pouch — at +64deg
  // the mitten lands on the hex buckle — and the glasses fly the rest of the way
  r.push(run(s('actArmB'), k('ArmB'), T, 'ease-out'));
  r.push(
    kf(k('ArmB'), T, [
      [0, 'transform:none'],
      [140, `transform:rotate(18deg);animation-timing-function:${IMPACT}`],
      [280, 'transform:rotate(8deg)'],
      [420, `transform:rotate(18deg);animation-timing-function:${IMPACT}`],
      [540, 'transform:rotate(10deg)'],
      [610, 'transform:rotate(58deg)'],
      [620, 'transform:rotate(64deg)'],
      [700, 'transform:rotate(60deg)'],
      [820, 'transform:rotate(30deg)'],
      [900, 'transform:rotate(8deg)'],
      [1080, 'transform:rotate(2deg)'],
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

  // the pair is revealed at the bottom of the dip, counter-rotates so it stays level in the
  // rotating mitten, then flies the last 28x42 units to the eye line on its own — the new
  // arm simply cannot put a hand on the face without sweeping 160deg across the chest
  r.push(run(s('gHeld'), k('Held'), T, 'ease-out'));
  r.push(
    kf(k('Held'), T, [
      [0, 'opacity:0;stroke:#241a2e;transform:translate(0px,0px) rotate(0deg) scale(.7)'],
      [699, 'opacity:0;stroke:#241a2e;transform:translate(0px,0px) rotate(-60deg) scale(.7)'],
      [700, 'opacity:1;stroke:#241a2e;transform:translate(0px,0px) rotate(-60deg) scale(.9)'],
      [820, 'opacity:1;stroke:#241a2e;transform:translate(0px,0px) rotate(-30deg) scale(1)'],
      // dark frames vanish against a violet coat, so the lenses wake up as they fly
      [900, 'opacity:1;stroke:#241a2e;transform:translate(0px,0px) rotate(-8deg) scale(1)'],
      [980, 'opacity:1;stroke:#a5f3fc;transform:translate(-14px,-20px) rotate(-14deg) scale(1.14)'],
      [1059, 'opacity:1;stroke:#a5f3fc;transform:translate(-28px,-42.4px) rotate(0deg) scale(1.06)'],
      [1060, 'opacity:0;stroke:#a5f3fc;transform:translate(-28px,-42.4px) rotate(0deg) scale(1.06)'],
      [T, 'opacity:0;stroke:#241a2e'],
    ]),
  );

  // invisible prop hand-off: worn opens on the exact frame held closes
  r.push(run(s('gWorn'), k('Worn'), T, 'ease-out'));
  r.push(
    kf(k('Worn'), T, [
      [0, 'opacity:0;transform:translate(0px,0px) rotate(0deg)'],
      [1059, 'opacity:0;transform:translate(0px,0px) rotate(0deg)'],
      [1060, 'opacity:1;transform:translate(0px,0px) rotate(0deg)'],
      [4400, 'opacity:1;transform:translate(0px,0px) rotate(0deg)'],
      [4600, 'opacity:0;transform:translate(9px,3px) rotate(12deg)'],
      [T, 'opacity:0'],
    ]),
  );

  r.push(run(s('gClink'), k('Clink'), T, 'linear'));
  r.push(
    kf(k('Clink'), T, [
      [0, 'opacity:0'],
      [1059, 'opacity:0'],
      [1060, 'opacity:1'],
      [1140, 'opacity:0'],
      [4510, 'opacity:0'],
      [4540, 'opacity:.95'],
      [4600, 'opacity:0'],
      [T, 'opacity:0'],
    ]),
  );

  // hud refresh: a bar wiping down inside each lens, four times. the chibi's eyes are
  // 15 units tall, so the lenses grew to 11.8 and the wipe travels 10 instead of 3.4
  const scan: Frame[] = [
    [0, 'opacity:0;transform:translateY(0px)'],
    [1079, 'opacity:0;transform:translateY(0px)'],
    [1080, 'opacity:.9;transform:translateY(0px)'],
    [1280, 'opacity:.9;transform:translateY(10px)'],
    [1281, 'opacity:.9;transform:translateY(0px)'],
    [1481, 'opacity:.9;transform:translateY(10px)'],
    [1482, 'opacity:.9;transform:translateY(0px)'],
    [1682, 'opacity:.9;transform:translateY(10px)'],
    [1683, 'opacity:.9;transform:translateY(0px)'],
    [1883, 'opacity:.9;transform:translateY(10px)'],
    [1900, 'opacity:0;transform:translateY(10px)'],
    [T, 'opacity:0'],
  ];
  r.push(kf(k('Scan'), T, scan));
  r.push(run(s('gScanL'), k('Scan'), T, 'linear'));
  r.push(run(s('gScanR'), k('Scan'), T, 'linear', 90));

  r.push(run(s('gOrbScan'), k('OrbScan'), T, 'linear'));
  r.push(
    kf(k('OrbScan'), T, [
      [0, 'opacity:0;transform:translateY(5px)'],
      [1079, 'opacity:0;transform:translateY(5px)'],
      [1080, 'opacity:.3;transform:translateY(5px)'],
      [1280, 'opacity:.9;transform:translateY(23px)'],
      [1281, 'opacity:.5;transform:translateY(5px)'],
      [1480, 'opacity:1;transform:translateY(23px)'],
      [1481, 'opacity:.3;transform:translateY(5px)'],
      [1680, 'opacity:.9;transform:translateY(23px)'],
      [1681, 'opacity:.5;transform:translateY(5px)'],
      [1880, 'opacity:1;transform:translateY(23px)'],
      [1900, 'opacity:0;transform:translateY(23px)'],
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

  // the hat stays: a live <use> of the real hat art, hanging outside actRoot.
  // the head goes out from under it, so it lifts, hangs and tilts over nothing — and the
  // whole point of the beat is the landing: when he rematerialises it drops onto him with
  // an impact ease, overshooting past its resting place before it settles. the float is
  // what buys that fall its height, so do not flatten it into a sag.
  r.push(run(s('gHat'), k('Hat'), T, 'ease-in-out'));
  r.push(
    kf(k('Hat'), T, [
      [0, 'opacity:0;transform:translateY(0px) rotate(0deg)'],
      [2199, 'opacity:0;transform:translateY(0px) rotate(0deg)'],
      [2200, 'opacity:1;transform:translateY(0px) rotate(0deg)'],
      [2520, 'opacity:1;transform:translateY(-12px) rotate(0deg)'],
      [2745, 'opacity:1;transform:translateY(-15px) rotate(6deg)'],
      [2970, 'opacity:1;transform:translateY(-13px) rotate(0deg)'],
      [3195, 'opacity:1;transform:translateY(-11px) rotate(-6deg)'],
      [3400, 'opacity:1;transform:translateY(-13px) rotate(0deg)'],
      // untethered now, so it drifts up rather than settling — this is the height the
      // fall is bought with, and it is the whole reason the beat reads
      [3700, 'opacity:1;transform:translateY(-14px) rotate(0deg)'],
      // he is back under it by 3980 (see the Root keyframes) — one beat of a bare head,
      // then it falls. the fall runs 250ms rather than the 90 it used to: 90ms of 9px on
      // an 88px sprite is a cut, not a drop, which is why nobody ever saw this happen.
      [3980, `opacity:1;transform:translateY(-14px) rotate(0deg);animation-timing-function:${IMPACT}`],
      [4230, 'opacity:1;transform:translateY(4px) rotate(0deg)'],
      [4285, 'opacity:1;transform:translateY(-1.5px) rotate(0deg)'],
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

  // the spellbook is right there, so it riffles as he snaps back through the seam
  r.push(run(s('pages'), k('Riffle'), T, 'ease-out'));
  r.push(
    kf(k('Riffle'), T, [
      [0, 'transform:none'],
      [3700, 'transform:none'],
      [3760, 'transform:scaleX(.82) skewY(-4deg)'],
      [3840, 'transform:scaleX(1.06) skewY(3deg)'],
      [3920, 'transform:scaleX(.9) skewY(-2deg)'],
      [4000, 'transform:scaleX(1.03) skewY(1.4deg)'],
      [4120, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

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
      // squash-dominant, so the take lands as a flinch rather than a rise into the bars
      [260, 'transform:translateY(0px) scale(1.05,.94)'],
      [520, 'transform:translateY(-1.6px) scale(.985,.995)'],
      [2900, 'transform:translateY(-1.6px) scale(.985,.995)'],
      [2940, 'transform:translateY(0px) scale(1.18,.82)'],
      [3020, 'transform:translateY(-2.2px) scale(.93,1)'],
      [3080, 'transform:translateY(-2.2px) scale(.93,1)'],
      [3260, 'transform:translateY(0px) scale(1.09,.92)'],
      [3450, 'transform:translateY(-1.2px) scale(.985,1)'],
      [3640, 'transform:translateY(0px) scale(1.02,.98)'],
      [3900, 'transform:none'],
      [4500, 'transform:none'],
      [4650, 'transform:translateY(-1.2px) scale(.99,1)'],
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
      // the jolt leads positive: the star swings down-right, away from the two meters
      [2960, 'transform:rotate(14deg)'],
      [3080, 'transform:rotate(14deg)'],
      [3260, 'transform:rotate(-9deg)'],
      [3450, 'transform:rotate(5deg)'],
      [3640, 'transform:rotate(-3deg)'],
      [3900, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the far hand's reachable circle is bounded by the spellbook on the right and the front
  // arm on the left, so the flustered wave is staged on the short outward arc where it
  // clears both: -8..-22deg parks the mitten around (84,78), just under the book
  r.push(run(s('actArmB'), k('ArmB'), T, 'ease-out'));
  r.push(
    kf(k('ArmB'), T, [
      [0, 'transform:none'],
      [260, 'transform:rotate(4deg)'],
      [520, 'transform:rotate(-3deg)'],
      [2900, 'transform:rotate(-3deg)'],
      [2960, 'transform:rotate(-22deg)'],
      [3080, 'transform:rotate(-22deg)'],
      [3400, 'transform:rotate(-10deg)'],
      [3900, 'transform:rotate(-5deg)'],
      [3990, 'transform:rotate(-20deg)'],
      [4050, `transform:rotate(-14deg);animation-timing-function:${IMPACT}`],
      [4140, 'transform:rotate(-20deg)'],
      [4260, 'transform:rotate(-14deg)'],
      [4350, 'transform:rotate(-19deg)'],
      [4500, 'transform:rotate(-6deg)'],
      [5000, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the staff is the boom, tilting about the mitten grip at (15.4,81.8). the amber crystal
  // sits 68 units up that shaft, so it sweeps 1.19 units of arc per degree: +14deg carries
  // it from (9,14) to (25.6,14.5), right up beside his cheek under the hat brim, and that
  // is as close to the mouth as a one-segment arm on a full-length staff can get. anything
  // past +18 lays the shaft across the eyes, and the negative half of the arc walks the
  // crystal's 20-unit halo out toward the left margin, so the swing stays on the plus side
  r.push(run(s('actStaff'), k('Staff'), T, 'ease-out'));
  r.push(
    kf(k('Staff'), T, [
      [0, 'transform:none'],
      [260, 'transform:rotate(4deg)'],
      [430, 'transform:rotate(17deg)'],
      [520, 'transform:rotate(14deg)'],
      [2900, 'transform:rotate(14deg)'],
      [2960, 'transform:rotate(2deg)'],
      [3080, 'transform:rotate(2deg)'],
      [3260, 'transform:rotate(16deg)'],
      [3500, 'transform:rotate(12deg)'],
      [3900, 'transform:rotate(12deg)'],
      [4500, 'transform:rotate(6deg)'],
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

  // side by side, so the collision is horizontal: his band holds the left of the hat and
  // the intruder's crowds in from the right until the two overlap over the cone
  r.push(run(s('mBarsA'), k('ClusterA'), T, 'ease-out'));
  r.push(
    kf(k('ClusterA'), T, [
      [0, 'opacity:0;transform:translateX(0px)'],
      [519, 'opacity:0;transform:translateX(0px)'],
      [520, 'opacity:.92;transform:translateX(0px)'],
      [2560, 'opacity:.92;transform:translateX(0px)'],
      [2700, `opacity:.92;transform:translateX(${M_CLOSE}px)`],
      [3900, `opacity:.92;transform:translateX(${M_CLOSE}px)`],
      [4050, 'opacity:.92;transform:translateX(2px)'],
      [4260, 'opacity:.92;transform:translateX(-1px)'],
      [5000, 'opacity:.92;transform:translateX(-1px)'],
      [5300, 'opacity:0;transform:translateX(-1px)'],
      [T, 'opacity:0'],
    ]),
  );

  // the intruder slides in from off his right shoulder and he does not notice
  r.push(run(s('mBarsB'), k('ClusterB'), T, 'ease-out'));
  r.push(
    kf(k('ClusterB'), T, [
      [0, 'opacity:0;transform:translateX(6px)'],
      [2199, 'opacity:0;transform:translateX(6px)'],
      [2200, 'opacity:.92;transform:translateX(6px)'],
      [2560, 'opacity:.92;transform:translateX(0px)'],
      [2700, `opacity:.92;transform:translateX(${-M_CLOSE}px)`],
      [3900, `opacity:.92;transform:translateX(${-M_CLOSE}px)`],
      [4050, 'opacity:.92;transform:translateX(-2px)'],
      [4260, 'opacity:.92;transform:translateX(1px)'],
      [5000, 'opacity:.92;transform:translateX(1px)'],
      [5300, 'opacity:0;transform:translateX(1px)'],
      [T, 'opacity:0'],
    ]),
  );

  // two speakers, separated — the rule stands between them, so it wipes open downward
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
      // the pop is capped at 1.25: the flash sits between the hat and the top of the view
      // box, and a bigger one runs its points out of that strip
      [2760, `opacity:1;transform:scale(1.25);animation-timing-function:${SNAP}`],
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
      [2280, 'transform:translateY(-2.4px) scale(.96,1)'],
      [2370, `transform:translateY(-2.4px) scale(.96,1);animation-timing-function:${IMPACT}`],
      [2510, 'transform:translateY(3px) scale(1.14,.86)'],
      [2560, 'transform:translateY(3px) scale(1.14,.86)'],
      [2700, 'transform:translateY(-1px) scale(.96,1)'],
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
      // the crystal is 68 units up the shaft from the grip, so a couple of degrees is a
      // couple of units of travel for it: the strike winds up toward the hat and slams back
      // down through the rest pose rather than past it
      [2280, 'transform:rotate(16deg)'],
      [2370, `transform:rotate(16deg);animation-timing-function:${IMPACT}`],
      [2480, 'transform:rotate(1deg)'],
      [2560, 'transform:rotate(1deg)'],
      [2700, 'transform:rotate(9deg)'],
      [2900, 'transform:rotate(3deg)'],
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
      [2560, 'transform:translateY(-2px) rotate(0deg)'],
      [2680, 'transform:translateY(1.5px) rotate(-4deg)'],
      [2790, 'transform:translateY(-1px) rotate(2deg)'],
      [2900, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );

  // the stamp is now landing right beside the spellbook, so the book takes the hit too
  r.push(run(s('actBook'), k('Book'), T, 'ease-out'));
  r.push(
    kf(k('Book'), T, [
      [0, 'transform:none'],
      [2430, 'transform:none'],
      [2510, 'transform:translate(2.5px,-4px) rotate(7deg)'],
      [2680, 'transform:translate(-1px,1.5px) rotate(-3deg)'],
      [2850, 'transform:translate(.5px,-.5px) rotate(1.5deg)'],
      [3020, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('pages'), k('Riffle'), T, 'ease-out'));
  r.push(
    kf(k('Riffle'), T, [
      [0, 'transform:none'],
      [2510, 'transform:none'],
      [2570, 'transform:scaleX(.84) skewY(-4deg)'],
      [2660, 'transform:scaleX(1.06) skewY(3deg)'],
      [2760, 'transform:scaleX(.92) skewY(-1.8deg)'],
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
      [3000, 'transform:translate(0px,-2px) scale(.95,1)'],
      [3300, `transform:translate(0px,-2px) scale(.95,1);animation-timing-function:cubic-bezier(.4,0,.2,1)`],
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

  // four visibly different arm poses, all on the arc where the back hand clears the robe.
  // the staff swings are tiny in degrees and huge in pixels — 1.19 units of crystal travel
  // per degree — so they stay small enough to read as four poses of one character
  limb('ArmB', s('actArmB'), [44, 86, -16, 26]);
  limb('Staff', s('actStaff'), [12, 4, 16, 8]);
  limb('Head', s('actHead'), [10, -12, 4, -4]);
  limb('Cone', s('actCone'), [4, 12, 18, -2]);

  // the shuffle back home: two quick steps as the slide settles
  r.push(run(s('actLegF'), k('LegF'), T, 'ease-out'));
  r.push(
    kf(k('LegF'), T, [
      [0, 'transform:none'],
      ...posed([
        [360, 'transform:rotate(16deg)'],
        [560, 'transform:rotate(16deg)'],
        [640, 'transform:rotate(-16deg)'],
        [840, 'transform:rotate(-16deg)'],
        [920, 'transform:rotate(6deg)'],
        [1140, 'transform:rotate(6deg)'],
        [1220, 'transform:rotate(-7deg)'],
        [1500, 'transform:rotate(-7deg)'],
        [1580, 'transform:rotate(0deg)'],
        [2560, 'transform:rotate(0deg)'],
      ]),
      [2650, 'transform:rotate(-16deg)'],
      [2790, 'transform:rotate(-16deg)'],
      [3300, 'transform:rotate(-6deg)'],
      [3900, 'transform:rotate(0deg)'],
      [4020, 'transform:rotate(10deg)'],
      [4140, 'transform:rotate(-3deg)'],
      [4260, 'transform:rotate(10deg)'],
      [4400, 'transform:none'],
      [T, 'transform:none'],
    ]),
  );
  r.push(run(s('actLegB'), k('LegB'), T, 'ease-out'));
  r.push(
    kf(k('LegB'), T, [
      [0, 'transform:none'],
      ...posed([
        [360, 'transform:rotate(-16deg)'],
        [560, 'transform:rotate(-16deg)'],
        [640, 'transform:rotate(16deg)'],
        [840, 'transform:rotate(16deg)'],
        [920, 'transform:rotate(-6deg)'],
        [1140, 'transform:rotate(-6deg)'],
        [1220, 'transform:rotate(7deg)'],
        [1500, 'transform:rotate(7deg)'],
        [1580, 'transform:rotate(0deg)'],
        [2560, 'transform:rotate(0deg)'],
      ]),
      [2650, 'transform:rotate(16deg)'],
      [2790, 'transform:rotate(16deg)'],
      [3300, 'transform:rotate(6deg)'],
      [3900, 'transform:rotate(0deg)'],
      [4020, 'transform:rotate(-10deg)'],
      [4140, 'transform:rotate(3deg)'],
      [4260, 'transform:rotate(-10deg)'],
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
        [0, 'opacity:0;transform:translate(0px,-2px) scale(.95,1)'],
        [3300, 'opacity:.3;transform:translate(0px,-2px) scale(.95,1)'],
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
      [2010, 'transform:translateY(-1px) scale(.97,1)'],
      [2300, 'transform:translateY(0px) scale(.99,1)'],
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
      // the greeting wave goes outward, not across: +78deg would park the mitten on the
      // hex buckle, while -22 puts it in clear air at (86,76) just under the spellbook
      [2230, `transform:rotate(-24deg);animation-timing-function:${SNAP}`],
      [2300, 'transform:rotate(-20deg)'],
      [2420, 'transform:rotate(-9deg)'],
      [2540, 'transform:rotate(-20deg)'],
      [2660, 'transform:rotate(-9deg)'],
      [2780, 'transform:rotate(-20deg)'],
      [3060, 'transform:rotate(-20deg)'],
      [3300, 'transform:rotate(6deg)'],
      [3420, 'transform:rotate(-2deg)'],
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
//
// the walk state is flight now, and the whole seated pose is pinned here rather than in the
// animation block below: a reduced-motion visitor still has to be sitting ON the carpet, not
// standing on it. the flight keyframes open on the same values, and an animation outranks a
// normal declaration, so none of this fights the cycles when they do run.
//
// legF and legB cannot fold — each is one rigid hip-to-toe segment with no knee, so laying
// it flat would throw a boot 43 units sideways. they retract behind the coat instead (every
// extreme lands inside the coat/collar silhouette) and a purpose-drawn crossed pair fades in.
const baseStatic = (uid: string, key: string | null) => `
.${uid}-shadow{transform-box:view-box;transform-origin:48px 114.5px}
.${uid}-body{transform-box:view-box;transform-origin:48px 113.6px}
.${uid}-sway{transform-box:view-box;transform-origin:48px 56px}
.${uid}-breathe{transform-box:view-box;transform-origin:48px 90px}
.${uid}-head{transform-box:view-box;transform-origin:48px 53px}
.${uid}-cone{transform-box:view-box;transform-origin:48px 21px}
.${uid}-star{transform-box:view-box;transform-origin:61.6px 4.9px}
.${uid}-book{transform-box:view-box;transform-origin:82.5px 55px}
.${uid}-pages{transform-box:view-box;transform-origin:73.5px 56.5px}
.${uid}-legF{transform-box:view-box;transform-origin:56px 70.5px}
.${uid}-legB{transform-box:view-box;transform-origin:40px 70.5px}
.${uid}-armB{transform-box:view-box;transform-origin:64px 57px}
.${uid}-armF{transform-box:view-box;transform-origin:32px 57px}
.${uid}-eyes{transform-box:view-box;transform-origin:48px 40px}
.${uid}-glow{transform-box:view-box;transform-origin:9px 15px;opacity:.85}
.${uid}-lids{opacity:0}
.${uid}-mouthopen{opacity:0}
.${uid}-carpet,.${uid}-carpetLip,.${uid}-flyLegs,.${uid}-flyTailA,.${uid}-flyTailB{opacity:0}
.${uid}-walk .${uid}-carpet,.${uid}-walk .${uid}-carpetLip,.${uid}-walk .${uid}-flyLegs,.${uid}-walk .${uid}-flyTailA,.${uid}-walk .${uid}-flyTailB{opacity:1}
.${uid}-walk .${uid}-flyRise{transform:translateY(-10px) rotate(2.4deg)}
.${uid}-walk .${uid}-legB{transform:translate(3px,-31px) rotate(9deg)}
.${uid}-walk .${uid}-legF{transform:translate(-3px,-31px) rotate(-9deg)}
.${uid}-walk .${uid}-flyStaff{transform:translateY(-9px) rotate(-3.4deg)}
.${uid}-walk .${uid}-shadow{transform:translateY(2px) scale(.58,.47);opacity:.3}
${rigOrigins(uid, key)}
${key ? vfxShared(uid) : ''}`;

// the cycles are re-timed for the chibi's proportions: longer legs and a much taller
// hat mean the old degree values would over-travel, so each amplitude is re-derived from
// the distance between its new pivot and the tip it throws.
//
// every vertical move on .body and .actRoot pivots on the feet at y=113.6, and the gold star
// at the folded hat tip sits 113.3 units above that: translateY(t) scale(_,k) puts the tip at
// 113.6 - 113.3k + t, so a stretch throws it a long way. the view box now carries 26 units of
// air above y=0 and nothing shears any more, but the squash-dominant shaping below is kept
// anyway — it is what gives the chibi weight, not a clipping workaround.
//
// the walk state is the exception: nothing there touches the ground, so nothing squashes. its
// base cycle is 2.4s, four times the .6s footfall it replaced — the same rhythm family at a
// quarter tempo. the hat (1.9s), the coat tails (1.5s / 1.7s), the carpet (1.6s), the aura
// (2.2s) and the book (3.4s) are deliberately not harmonics of it, so nothing marches in
// lockstep with the bob. the lean pivots on the feet at y=113.6, seventeen units below the
// seat: the seat barely moves while the hat tip swings, so he tips without sliding off.
const baseAnim = (uid: string) => `
.${uid}-legF,.${uid}-legB,.${uid}-armB,.${uid}-armF,.${uid}-sway,.${uid}-cone,.${uid}-head,.${uid}-book,.${uid}-flyStaff{transition:transform .18s ease-out}
.${uid}-carpet,.${uid}-carpetLip,.${uid}-flyLegs,.${uid}-flyTailA,.${uid}-flyTailB{transition:opacity .2s ease-out}
.${uid}-flyRise{transition:transform .3s cubic-bezier(.22,.86,.3,1)}
.${uid}-idle .${uid}-body{animation:${uid}Float 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-breathe{animation:${uid}Breath 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-head{animation:${uid}HeadIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-cone{animation:${uid}ConeIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-armB{animation:${uid}ArmIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-armF{animation:${uid}ArmFIdle 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-glow{animation:${uid}Pulse 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-star{animation:${uid}Star 2.6s ease-in-out infinite}
.${uid}-idle .${uid}-book{animation:${uid}BookIdle 4.3s ease-in-out infinite}
.${uid}-walk .${uid}-body{animation:${uid}FlyBob 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-breathe{animation:${uid}Breath 3.2s ease-in-out infinite}
.${uid}-walk .${uid}-sway{animation:${uid}FlySway 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-flyLegs{animation:${uid}FlyLegs 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-flyTailA{animation:${uid}FlyTailA 1.5s ease-in-out infinite}
.${uid}-walk .${uid}-flyTailB{animation:${uid}FlyTailB 1.7s ease-in-out infinite}
.${uid}-walk .${uid}-armB{animation:${uid}FlyArmB 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-armF{animation:${uid}FlyArmF 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-flyStaff{animation:${uid}FlyStaff 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-cone{animation:${uid}FlyCone 1.9s ease-in-out infinite}
.${uid}-walk .${uid}-head{animation:${uid}FlyHead 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-brows{animation:${uid}FlyBrow 2.4s ease-in-out infinite}
.${uid}-walk .${uid}-shadow{animation:${uid}FlyShadow 2.4s ease-in-out infinite;filter:url(#${uid}-soft)}
.${uid}-walk .${uid}-glow{animation:${uid}Pulse 1.8s ease-in-out infinite}
.${uid}-walk .${uid}-star{animation:${uid}Star 1.8s ease-in-out infinite}
.${uid}-walk .${uid}-book{animation:${uid}FlyBook 3.4s ease-in-out infinite}
.${uid}-walk .${uid}-carpet,.${uid}-walk .${uid}-carpetLip{animation:${uid}CarpetRipple 1.6s ease-in-out infinite}
.${uid}-walk .${uid}-carpetFringeB{animation:${uid}CarpetFringe 1.6s ease-in-out -.12s infinite}
.${uid}-walk .${uid}-carpetFringeF{animation:${uid}CarpetFringe 1.6s ease-in-out infinite}
.${uid}-walk .${uid}-carpetAura{animation:${uid}CarpetAura 2.2s ease-in-out infinite}
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
.${uid}-talk .${uid}-book{animation:${uid}BookTalk .78s ease-in-out infinite}
.${uid}-talk .${uid}-pages{animation:${uid}Page .78s ease-in-out infinite}
.${uid}-idle .${uid}-eyes,.${uid}-walk .${uid}-eyes,.${uid}-talk .${uid}-eyes{animation:${uid}Blink 5s ease-in-out infinite}
.${uid}-idle .${uid}-lids,.${uid}-walk .${uid}-lids,.${uid}-talk .${uid}-lids{animation:${uid}Lid 5s linear infinite}
@keyframes ${uid}Float{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes ${uid}Breath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.019,1.025)}}
@keyframes ${uid}HeadIdle{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-.9px) rotate(1.2deg)}}
@keyframes ${uid}ConeIdle{0%,100%{transform:rotate(2.4deg)}50%{transform:rotate(-2.4deg)}}
@keyframes ${uid}ArmIdle{0%,100%{transform:rotate(-1.4deg)}50%{transform:rotate(2.2deg)}}
@keyframes ${uid}ArmFIdle{0%,100%{transform:rotate(1deg)}50%{transform:rotate(-1.6deg)}}
@keyframes ${uid}BookIdle{0%,100%{transform:translateY(0) rotate(0deg)}34%{transform:translateY(-1.7px) rotate(1.5deg)}68%{transform:translateY(-2.6px) rotate(-1.1deg)}}
@keyframes ${uid}Star{0%,100%{opacity:.7;transform:scale(.88) rotate(0deg)}50%{opacity:1;transform:scale(1.16) rotate(22deg)}}
@keyframes ${uid}Pulse{0%,100%{opacity:.66;transform:scale(.92)}50%{opacity:1;transform:scale(1.1)}}
@keyframes ${uid}PulseFast{0%,100%{opacity:.86;transform:scale(1)}50%{opacity:1;transform:scale(1.24)}}
@keyframes ${uid}Blink{0%,90%,100%{transform:scaleY(1)}92.4%,95%{transform:scaleY(.08)}}
@keyframes ${uid}Lid{0%,91.6%,95.8%,100%{opacity:0}92.6%,94.8%{opacity:1}}
@keyframes ${uid}FlyBob{0%,100%{transform:translateY(1.2px) rotate(-.3deg)}34%{transform:translateY(-1.6px) rotate(.3deg)}68%{transform:translateY(0) rotate(-.1deg)}}
@keyframes ${uid}FlySway{0%,100%{transform:rotate(1deg)}40%{transform:rotate(2.2deg)}72%{transform:rotate(1.4deg)}}
@keyframes ${uid}FlyHead{0%,100%{transform:translateY(.5px) rotate(-1.3deg)}30%{transform:translateY(-.3px) rotate(-2.4deg)}64%{transform:translateY(.2px) rotate(-1deg)}}
@keyframes ${uid}FlyCone{0%,100%{transform:rotate(-8.6deg)}36%{transform:rotate(-12.4deg)}70%{transform:rotate(-8deg)}}
@keyframes ${uid}FlyBrow{0%,100%{transform:translateY(-.45px)}45%{transform:translateY(-.9px)}}
@keyframes ${uid}FlyArmB{0%,100%{transform:rotate(3.4deg)}42%{transform:rotate(5.4deg)}74%{transform:rotate(4deg)}}
@keyframes ${uid}FlyArmF{0%,100%{transform:rotate(-1.4deg)}46%{transform:rotate(-3deg)}}
@keyframes ${uid}FlyStaff{0%,100%{transform:translateY(-9px) rotate(-3.4deg)}38%{transform:translateY(-10.3px) rotate(-5deg)}72%{transform:translateY(-9.3px) rotate(-3.7deg)}}
@keyframes ${uid}FlyLegs{0%,100%{transform:translateY(.5px) rotate(-.7deg)}38%{transform:translateY(-.3px) rotate(.7deg)}70%{transform:translateY(.3px) rotate(-.2deg)}}
@keyframes ${uid}FlyBook{0%,100%{transform:translate(-3.2px,1.2px) rotate(-2.2deg)}33%{transform:translate(-4.4px,-.5px) rotate(-.6deg)}66%{transform:translate(-2.6px,2.2px) rotate(-3deg)}}
@keyframes ${uid}FlyShadow{0%,100%{transform:translateY(2px) scale(.62,.5);opacity:.34}34%{transform:translateY(2.7px) scale(.52,.42);opacity:.25}68%{transform:translateY(2.2px) scale(.58,.47);opacity:.3}}
@keyframes ${uid}FlyTailA{0%,100%{transform:rotate(-2deg) scaleX(1)}30%{transform:rotate(3.4deg) scaleX(1.07)}62%{transform:rotate(-.6deg) scaleX(.97)}}
@keyframes ${uid}FlyTailB{0%,100%{transform:rotate(2.6deg) scaleX(.98)}34%{transform:rotate(-2.2deg) scaleX(1.06)}70%{transform:rotate(1.2deg) scaleX(1)}}
@keyframes ${uid}CarpetRipple{0%,100%{transform:translateY(0) rotate(.45deg) skewY(1.8deg) scaleY(.984)}25%{transform:translateY(-1px) rotate(0deg) skewY(0deg) scaleY(1.028)}50%{transform:translateY(0) rotate(-.45deg) skewY(-1.8deg) scaleY(.984)}75%{transform:translateY(.9px) rotate(0deg) skewY(0deg) scaleY(1.028)}}
@keyframes ${uid}CarpetFringe{0%,50%,100%{transform:rotate(0deg) scaleX(1)}25%{transform:rotate(3.2deg) scaleX(1.05)}75%{transform:rotate(-3.2deg) scaleX(1.05)}}
@keyframes ${uid}CarpetAura{0%,100%{transform:scale(1,.92);opacity:.5}50%{transform:scale(1.06,1.12);opacity:.85}}
@keyframes ${uid}TalkBob{0%,100%{transform:translateY(0) scale(1.014,.988)}18%{transform:translateY(-1.5px) scale(.995,1)}50%{transform:translateY(-2.2px) scale(.985,1)}82%{transform:translateY(-1px) scale(1.005,1)}}
@keyframes ${uid}HeadTalk{0%,100%{transform:translateY(0) rotate(-2.2deg) scale(1,1)}28%{transform:translateY(-1.5px) rotate(1.1deg) scale(1.02,.985)}50%{transform:translateY(-1.3px) rotate(2.2deg) scale(1,1)}78%{transform:translateY(-.5px) rotate(-.7deg) scale(.99,1.014)}}
@keyframes ${uid}ConeTalk{0%,100%{transform:rotate(4.3deg)}34%{transform:rotate(-2.5deg)}62%{transform:rotate(-4.3deg)}}
@keyframes ${uid}ArmTalk{0%,100%{transform:rotate(-2.6deg)}50%{transform:rotate(4.2deg)}}
@keyframes ${uid}ArmFTalk{0%,100%{transform:rotate(2deg)}50%{transform:rotate(-3.2deg)}}
@keyframes ${uid}BrowTalk{0%,100%{transform:translateY(.3px) scale(1,1)}22%{transform:translateY(-1.3px) scale(1.03,1)}54%{transform:translateY(-.2px) scale(1,1)}76%{transform:translateY(-1px) scale(1.02,1)}}
@keyframes ${uid}BookTalk{0%,100%{transform:translateY(0) rotate(0deg)}22%{transform:translateY(-.9px) rotate(-1.5deg)}55%{transform:translateY(-1.6px) rotate(1.3deg)}80%{transform:translateY(-.5px) rotate(-.5deg)}}
@keyframes ${uid}Page{0%,100%{transform:scaleX(1) skewY(0deg)}18%{transform:scaleX(.9) skewY(-1.8deg)}38%{transform:scaleX(1.02) skewY(1.3deg)}60%{transform:scaleX(.93) skewY(-1.1deg)}80%{transform:scaleX(1.01) skewY(.7deg)}}
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
          <rect x="32.4" y="33.6" width="12.8" height="11.8" rx="3.2" />
        </clipPath>
        <clipPath id={`${uid}-clipR`}>
          <rect x="50.8" y="33.6" width="12.8" height="11.8" rx="3.2" />
        </clipPath>
        {/* the amber crystal is the sprite's light source now, so the orb beats moved to it */}
        <clipPath id={`${uid}-clipOrb`}>
          <path d="M9 3.5L16.6 14L9 24.5L1.4 14Z" />
        </clipPath>
      </>
    )}
    {v === 'apriltag-stamp' && (
      <>
        <clipPath id={`${uid}-clipTag`}>
          <rect x="70" y="77" width="12" height="12" rx="1.6" />
        </clipPath>
        <linearGradient id={`${uid}-beam`} gradientUnits="userSpaceOnUse" x1="10" y1="21" x2="43" y2="77">
          <stop offset="0" stopColor="#a5f3fc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a5f3fc" stopOpacity="0" />
        </linearGradient>
      </>
    )}
    {v === 'motion-match-ghosts' && (
      // one silhouette of the chibi, reused by all ten onion skins: hat, head, coat, both
      // boots, both mittens, the staff and the spellbook, drawn as fills and fat strokes
      <g
        id={`${uid}-ghost`}
        fill="#a78bfa"
        fillOpacity="0.22"
        stroke="#a78bfa"
        strokeOpacity="0.22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 16L17.5 113" fill="none" strokeWidth="4" />
        <path d="M9 3.5L16.6 14L9 24.5L1.4 14Z" strokeWidth="0" />
        <path d="M40 68L39.6 100M56 68L56.4 100" fill="none" strokeWidth="11" />
        <path d="M34.6 96L45.4 96L45.4 107.4C45.4 111.6 42.8 114 38.6 114L32.4 114C29 114 27.8 111.2 28.7 108.4Z" strokeWidth="0" />
        <path d="M61.4 96L50.6 96L50.6 107.4C50.6 111.6 53.2 114 57.4 114L63.6 114C67 114 68.2 111.2 67.3 108.4Z" strokeWidth="0" />
        <path d="M22 46C18.6 52 17.6 60 18.7 66C20 74 21 82 21.5 90L26 93L31 85L36 93L41 86L48 84L55 86L60 93L65 85L70 93L74.5 90C75 82 76 74 77.3 66C78.4 60 77.4 52 74 46C68 52 58 56.4 48 56.4C38 56.4 28 52 22 46Z" strokeWidth="0" />
        <path d="M64 57C69 63 73.6 70 74.9 76M32 57C27 62 22 68 19.6 74" fill="none" strokeWidth="13" />
        <ellipse cx="76.2" cy="83" rx="8.2" ry="7.6" strokeWidth="0" />
        <ellipse cx="15.4" cy="81.8" rx="8.2" ry="7.6" strokeWidth="0" />
        <ellipse cx="48" cy="33.5" rx="23" ry="20.5" strokeWidth="0" />
        <path d={HAT_BRIM_D} strokeWidth="0" />
        <path d={HAT_CONE_D} strokeWidth="0" />
        <path
          d="M73 44L92 44C93.5 44 94.2 44.8 94.2 46.2L94.2 63.8C94.2 65.2 93.5 66 92 66L73 66C71.5 66 70.8 65.2 70.8 63.8L70.8 46.2C70.8 44.8 71.5 44 73 44Z"
          strokeWidth="0"
          transform="rotate(-7 82.5 55)"
        />
      </g>
    )}
  </>
);

// props that ride the back hand
const ArmBFx: React.FC<FxProps> = ({ uid, u, v }) => {
  const c = (n: string) => `${uid}-${n}`;
  if (v === 'smart-glasses-portal') {
    return (
      // folded, centred on the new back mitten at (76.2, 83)
      <g className={c('gHeld')} opacity="0" stroke="#241a2e" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="70.8" y="80.9" width="5" height="3.4" rx="1.2" fill={u('gem')} fillOpacity="0.75" />
        <rect x="76.6" y="80.9" width="5" height="3.4" rx="1.2" fill={u('gem')} fillOpacity="0.75" />
        <path d="M75.8 82.3L76.6 82.3" fill="none" />
        <path d="M81.6 82.1L83 81.3" fill="none" stroke="#7dd3fc" strokeWidth="1.4" />
      </g>
    );
  }
  if (v === 'apriltag-stamp') {
    return (
      <g className={c('tTag')} opacity="0">
        {/* high contrast black on white is why this still reads at 64px */}
        <rect
          x="70"
          y="77"
          width="12"
          height="12"
          rx="1.6"
          fill="#f8fafc"
          stroke="#241a2e"
          strokeWidth="2.2"
        />
        <g fill="#241a2e" stroke="none">
          {T_PAT1.map(([cx, cy], i) => (
            <rect key={i} x={71.5 + cx * 3} y={78.5 + cy * 3} width="3" height="3" />
          ))}
        </g>
        <g className={c('tPat2')} opacity="0" fill="#241a2e" stroke="none">
          <rect x="71.5" y="78.5" width="9" height="9" fill="#f8fafc" />
          {T_PAT2.map(([cx, cy], i) => (
            <rect key={i} x={71.5 + cx * 3} y={78.5 + cy * 3} width="3" height="3" />
          ))}
        </g>
        <g clipPath={`url(#${uid}-clipTag)`}>
          <rect
            className={c('tScan')}
            opacity="0"
            x="75.2"
            y="77"
            width="1.6"
            height="12"
            fill="#ffffff"
            stroke="none"
          />
        </g>
        <rect
          className={c('tFlash')}
          opacity="0"
          x="70"
          y="77"
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
          d="M72.4 83.2L75.2 86.4L80 79.4"
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
    <circle className={`${uid}-mFlare`} opacity="0" cx="9" cy="14" r="15" fill={u('glowIn')} stroke="none" />
  ) : null;

// props that ride the head
const HeadFx: React.FC<FxProps> = ({ uid, u, v }) => {
  const c = (n: string) => `${uid}-${n}`;
  return (
    <>
      {v === 'smart-glasses-portal' && (
        <>
          {/* lenses sized to the chibi's eyes: 12.8 x 11.8 centred on (38.8,39.5) and
              (57.2,39.5), with both temples drawn because the new head is much wider */}
          <g className={c('gWorn')} opacity="0">
            <rect
              x="32.4"
              y="33.6"
              width="12.8"
              height="11.8"
              rx="3.2"
              fill={u('gem')}
              fillOpacity="0.45"
              stroke="#241a2e"
              strokeWidth="2"
            />
            <rect
              x="50.8"
              y="33.6"
              width="12.8"
              height="11.8"
              rx="3.2"
              fill={u('gem')}
              fillOpacity="0.45"
              stroke="#241a2e"
              strokeWidth="2"
            />
            <path d="M45.2 38.6L50.8 38.6" fill="none" stroke="#241a2e" strokeWidth="2" />
            <path d="M63.6 38.4L68.8 36.2" fill="none" stroke="#241a2e" strokeWidth="2" />
            <path d="M32.4 38.4L27.2 36.2" fill="none" stroke="#241a2e" strokeWidth="2" />
            <path d="M34.4 36.2L42.6 35.6M52.8 36.2L61 35.6" fill="none" stroke="#a5f3fc" strokeWidth="1.5" />
            <g clipPath={`url(#${uid}-clipL)`}>
              <rect className={c('gScanL')} opacity="0" x="32.7" y="34.2" width="12.2" height="1.4" fill="#a5f3fc" />
            </g>
            <g clipPath={`url(#${uid}-clipR)`}>
              <rect className={c('gScanR')} opacity="0" x="51.1" y="34.2" width="12.2" height="1.4" fill="#a5f3fc" />
            </g>
          </g>
          <g className={c('gClink')} opacity="0" fill={u('gold')} stroke="none">
            <path d={diamond(69.6, 35.4, 2)} />
            <path d={diamond(71.6, 38, 1.6)} />
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
          <circle className={c('gFlare')} opacity="0" cx="9" cy="14" r="15" fill={u('glowIn')} stroke="none" />
          <g clipPath={`url(#${uid}-clipOrb)`}>
            <rect className={c('gOrbScan')} opacity="0" x="0" y="0" width="18" height="2.6" fill="#ffffff" />
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
            cx="48"
            cy="113"
            rx="17"
            ry="5"
            fill={u('glowOut')}
            stroke="none"
          />
          {G_SPARKS.map((p, i) => (
            <path key={i} className={c(`gSpk${i}`)} opacity="0" d={diamond(p.x, p.y, 2.4)} fill="#e9d5ff" stroke="none" />
          ))}
          <rect className={c('gSeam')} opacity="0" x="47" y="83.6" width="2" height="30" fill="#e9d5ff" stroke="none" />
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
          {/* the two bands straddle the hat on one baseline and close on the seam at x=48,
              so his violet meter and the intruder's blue one overlap over the cone */}
          <g className={c('mBarsA')} opacity="0" fill="#a78bfa" stroke="none">
            {M_BARS_A.map((x, i) => (
              <rect
                key={i}
                className={c(`mBarA${i}`)}
                x={x}
                y={M_BASE_A - M_BAR_H}
                width="3"
                height={M_BAR_H}
                rx="1.5"
              />
            ))}
          </g>
          <g className={c('mBarsB')} opacity="0" fill="#38bdf8" stroke="none">
            {M_BARS_B.map((x, i) => (
              <rect
                key={i}
                className={c(`mBarB${i}`)}
                x={x}
                y={M_BASE_B - M_BAR_H}
                width="3"
                height={M_BAR_H}
                rx="1.5"
              />
            ))}
          </g>
          <path
            className={c('mDivider')}
            opacity="0"
            d={`M${M_MID} ${M_MID_Y - 6.5}L${M_MID} ${M_MID_Y + 6.5}`}
            fill="none"
            stroke="#e9d5ff"
            strokeWidth="1.2"
            strokeDasharray="2.4 2"
          />
          <g className={c('mClash')} opacity="0">
            <path
              d={star5(M_MID, M_MID_Y, 6.8)}
              fill="#fbbf24"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d={`M${M_MID + 9.4} ${M_MID_Y - 5}L${M_MID + 12} ${M_MID_Y - 6.6}M${
                M_MID - 9.4
              } ${M_MID_Y - 5}L${M_MID - 12} ${M_MID_Y - 6.6}M${M_MID} ${M_MID_Y + 8.6}L${M_MID} ${
                M_MID_Y + 11
              }`}
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
          {/* the cone runs from the amber crystal down to where the presented card sits
              once the back arm has swung it across to (43, 76.6) */}
          <path
            className={c('tBeam')}
            opacity="0"
            d="M10 21L35.3 81.2L50.7 72Z"
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
                x={p.cx - H_BOX_W / 2}
                y={p.cy - H_BOX_H / 2}
                width={H_BOX_W}
                height={H_BOX_H}
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
            x={H_CANDS[1].cx - H_BOX_W / 2}
            y={H_CANDS[1].cy - H_BOX_H / 2}
            width={H_BOX_W}
            height={H_BOX_H}
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
          <path className={c('hPop0')} opacity="0" d={diamond(34, 112, 2.4)} fill="#a5f3fc" stroke="none" />
          <path className={c('hPop1')} opacity="0" d={diamond(62, 112, 2.4)} fill="#a5f3fc" stroke="none" />
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
              d={arcIn(2, 30, r)}
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

// the hat silhouette is painted three times — fill, clip, contour — so it lives in one place
const HAT_CONE_D =
  'M36.6 19.8C36 15.4 36.8 10.8 39.2 7C41.2 3.8 44.6 1.6 48.4 1.4C52.8 1.2 56.8 2.6 59.4 5.2C58 7.2 55.6 8.6 52.8 9.2C51.4 9.5 50.6 10.2 50.9 11.4C51.6 14.2 53.8 16.8 57.5 20C51.6 22.6 42.4 22.4 36.6 19.8Z';
const HAT_BRIM_D =
  'M21 22.4C22.4 17.4 30.2 14 39.8 12.9C42.6 12.6 45.2 12.5 48 12.5C50.8 12.5 53.4 12.6 56.2 12.9C65.8 14 73.6 17.4 75 22.4C75 24.9 66.4 26.4 56.5 26.9C51 27.2 45 27.2 39.5 26.9C29.6 26.4 21 24.9 21 22.4Z';

// the flying carpet, drawn once and reused for the deck, its underside and the pattern clip,
// the way the hat cone already is. a shallow S down the long axis: the left half crests, the
// right half troughs, and the inflection lands at x=48 so the flattest stretch is exactly
// where he sits.
//
// the near edge runs 18 units below the far edge, and that gap is the whole thing. the first
// pass ran it at 10 and the deck read as a broomstick — 119 units long against a 10-unit face
// is a stick, and the fringe at each end finished the joke. 18 gives roughly 13 screen pixels
// of visible top surface at size 88, enough to read as a plane he is sitting on rather than a
// line he is balanced on. the end caps bulge only ~3: at 4 the border wraps the ends and the
// whole thing turns into a rolled scarf.
const CARPET_D =
  'M-9 108C-2.4 105.4 7.6 103.6 17 104.2C27 104.9 38 107.6 48 110.5C58 112 68 112.3 77 112C86 112 97 111.2 105 109.8C108.2 113.5 108.3 124.5 105 128.1C97 128.9 86 129.3 77 129.3C68 129.5 58 129.4 48 128.9C38 126.6 27 124 17 123.3C7.6 122.6 -2.4 124.1 -9 125.9C-12.2 122 -12.3 111.5 -9 108Z';
// the centreline of the deck, midway between the two long edges: the pattern's spine, and the
// line his boots land on
const CARPET_SPINE_D =
  'M-9 116.95C-2.4 114.3 7.6 113.1 17 113.75C27 114.45 38 117.1 48 119.7C58 120.7 68 120.9 77 120.65C86 120.65 97 120.2 105 118.95';
// five strands per end, spread over the taller cap. they start under the deck so the roots
// never show
const CARPET_FRINGE_B_D =
  'M-10.2 109.6C-13.8 108.6 -17.4 107.8 -20.6 106.8M-11 113.6C-14.6 113 -18.2 112.6 -21.4 111.8M-11.4 117.4C-15.2 117.4 -18.8 117.2 -22 116.6M-11 121.4C-14.6 122 -18.2 122.4 -21.4 122M-10.2 124.8C-13.6 125.8 -17 126.6 -20 126.8';
const CARPET_FRINGE_F_D =
  'M104.2 111.4C107.8 110.4 111.4 109.6 114.6 108.6M105 115.4C108.6 114.8 112.2 114.4 115.4 113.6M105.4 119.2C109.2 119.2 112.8 119 116 118.4M105 123.2C108.6 123.8 112.2 124.2 115.4 123.8M104.2 126.8C107.6 127.8 111 128.6 114 128.8';
// the near edge again as a lens tapering to nothing at both ends, so the piece drawn in FRONT
// of him has no cut edge to give itself away. 7.7 deep at the centre, which is what it takes
// to bring the front edge up level with his heels — any shallower and it is just a second copy
// of a line already drawn behind him. its lower boundary is numerically the same stretch of
// CARPET_D: move one and the other has to move or a bright seam opens.
const CARPET_LIP_D =
  'M17 123.3C27 124 38 126.6 48 128.9C58 129.4 68 129.5 77 129.3C68 126.5 58 123.5 48 121.2C38 121.4 27 121.5 17 123.3Z';
const CARPET_LIP_TOP_D = 'M17 123.3C27 121.5 38 121.4 48 121.2C58 123.5 68 126.5 77 129.3';
const CARPET_LIP_BOT_D = 'M17 123.3C27 124 38 126.6 48 128.9C58 129.4 68 129.5 77 129.3';
const carpetDiamond = (cx: number, cy: number, w: number, h: number) =>
  `M${cx - w} ${cy}L${cx} ${cy - h}L${cx + w} ${cy}L${cx} ${cy + h}Z`;

// the carpet is drawn around a figure standing on it, feet at y=113.6. seated, his lowest paint
// is the near boot heel at y≈95, so the whole deck rides up until its spine — the midline of
// the visible surface — meets that heel, which is 25 units. it is a wrapper translate rather
// than baked into the paths because the ripple animates `transform` on the deck itself and
// would overwrite anything set there.
const CARPET_LIFT = -25;

// a hand-painted chibi warden: bold contour, gradient shading, one amber crystal
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

  // mirrors on x=ART_W/2, the axis the character is drawn around — which is also the
  // centre of the view box, so a flipped sprite keeps the same margins it had
  const flip = facing === 'left' ? `translate(${ART_W},0) scale(-1,1)` : undefined;
  const rootClass = `${uid} ${uid}-${STATE_CLASS[state]}${
    vignette ? ` ${uid}-vfx ${uid}-v-${VIGNETTE_KEY[vignette]}` : ''
  }`;

  return (
    <svg
      viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
      // `size` stays the height of the ART_H-tall art rectangle, so the character does not
      // shrink to fit the wider canvas: the box grows around it instead. both edges scale
      // by the same size/ART_H, so the view box meets the viewport exactly — no letterbox.
      width={(size * VIEW_W) / ART_H}
      height={(size * VIEW_H) / ART_H}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* coat: violet-magenta falling into deep indigo */}
        <linearGradient id={g('coat')} x1="0.06" y1="0" x2="0.94" y2="1">
          <stop offset="0" stopColor="#f078f5" />
          <stop offset="0.22" stopColor="#c04fe0" />
          <stop offset="0.56" stopColor="#9a45db" />
          <stop offset="0.84" stopColor="#6c29a8" />
          <stop offset="1" stopColor="#4a1d7a" />
        </linearGradient>
        <linearGradient id={g('coatSide')} x1="0.05" y1="0" x2="0.95" y2="1">
          <stop offset="0" stopColor="#dd68ee" />
          <stop offset="0.4" stopColor="#9a45db" />
          <stop offset="0.82" stopColor="#6a28a6" />
          <stop offset="1" stopColor="#451b70" />
        </linearGradient>
        <linearGradient id={g('collarG')} x1="0" y1="0.15" x2="1" y2="0.85">
          <stop offset="0" stopColor="#e06bf2" />
          <stop offset="0.5" stopColor="#9743d8" />
          <stop offset="1" stopColor="#4a1d7a" />
        </linearGradient>
        {/* pale lavender lining, the coat's inside face */}
        <linearGradient id={g('lining')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#fdf9ff" />
          <stop offset="0.42" stopColor="#e8dcf5" />
          <stop offset="1" stopColor="#bda7e2" />
        </linearGradient>
        <linearGradient id={g('gold')} x1="0.1" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#fff3c0" />
          <stop offset="0.3" stopColor="#f5c451" />
          <stop offset="0.7" stopColor="#dfa02c" />
          <stop offset="1" stopColor="#b8791a" />
        </linearGradient>
        <linearGradient id={g('goldDeep')} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f8d576" />
          <stop offset="0.5" stopColor="#dda93c" />
          <stop offset="1" stopColor="#a86f14" />
        </linearGradient>
        <linearGradient id={g('hair')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#edc2ff" />
          <stop offset="0.32" stopColor="#b76ee8" />
          <stop offset="1" stopColor="#65299f" />
        </linearGradient>
        <linearGradient id={g('skin')} x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#fff5e8" />
          <stop offset="0.5" stopColor="#ffdec2" />
          <stop offset="1" stopColor="#ecab88" />
        </linearGradient>
        <linearGradient id={g('trouser')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#5b3ea6" />
          <stop offset="0.5" stopColor="#4a2d84" />
          <stop offset="1" stopColor="#241542" />
        </linearGradient>
        <linearGradient id={g('boot')} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#7d5586" />
          <stop offset="0.36" stopColor="#3d2543" />
          <stop offset="1" stopColor="#170d1b" />
        </linearGradient>
        <linearGradient id={g('leather')} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#d68e50" />
          <stop offset="0.4" stopColor="#9c5729" />
          <stop offset="1" stopColor="#5a2d16" />
        </linearGradient>
        <linearGradient id={g('page')} x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0" stopColor="#fffbf0" />
          <stop offset="0.55" stopColor="#f0e3c2" />
          <stop offset="1" stopColor="#cdb689" />
        </linearGradient>
        <linearGradient id={g('gem')} x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#f5e2ff" />
          <stop offset="0.32" stopColor="#bd74ef" />
          <stop offset="1" stopColor="#4a1d7a" />
        </linearGradient>
        <linearGradient id={g('staffWood')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a482bd" />
          <stop offset="0.4" stopColor="#5b3a78" />
          <stop offset="1" stopColor="#2e1b44" />
        </linearGradient>
        {/* hat palette, same family as the coat */}
        <linearGradient id={g('hatConeG')} x1="0.08" y1="0" x2="0.92" y2="1">
          <stop offset="0" stopColor="#f078f5" />
          <stop offset="0.2" stopColor="#cf5ce8" />
          <stop offset="0.52" stopColor="#9a45db" />
          <stop offset="0.82" stopColor="#67279f" />
          <stop offset="1" stopColor="#42186b" />
        </linearGradient>
        <linearGradient id={g('hatBrimG')} x1="0.04" y1="0" x2="0.96" y2="1">
          <stop offset="0" stopColor="#e26df3" />
          <stop offset="0.34" stopColor="#a54ce0" />
          <stop offset="0.72" stopColor="#6f2bab" />
          <stop offset="1" stopColor="#3d1866" />
        </linearGradient>
        <radialGradient id={g('hatStarGlow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff2cc" stopOpacity="0.95" />
          <stop offset="0.34" stopColor="#ffd15e" stopOpacity="0.48" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('hatStarG')} x1="0.15" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fffbe2" />
          <stop offset="0.4" stopColor="#ffdd6e" />
          <stop offset="1" stopColor="#f0a828" />
        </linearGradient>
        {/* the amber crystal is the only light source on the page */}
        <radialGradient id={g('amber')} cx="0.36" cy="0.28" r="0.8">
          <stop offset="0" stopColor="#fffaea" />
          <stop offset="0.26" stopColor="#ffd77f" />
          <stop offset="0.6" stopColor="#ffb347" />
          <stop offset="1" stopColor="#ff7a1f" />
        </radialGradient>
        <radialGradient id={g('amberGlow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc266" stopOpacity="0.85" />
          <stop offset="0.38" stopColor="#ff9330" stopOpacity="0.34" />
          <stop offset="1" stopColor="#ff7a1f" stopOpacity="0" />
        </radialGradient>
        {/* glowIn / glowOut stay in the palette: the vfx props paint flares with them */}
        <radialGradient id={g('glowIn')}>
          <stop offset="0" stopColor="#fff3d6" stopOpacity="0.7" />
          <stop offset="0.34" stopColor="#ffc266" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ff9330" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('glowOut')}>
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.38" />
          <stop offset="0.45" stopColor="#ff9330" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ff7a1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('bookGlow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c47bf5" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#8b3fd4" stopOpacity="0.2" />
          <stop offset="1" stopColor="#8b3fd4" stopOpacity="0" />
        </radialGradient>
        {/* the carpet: a plum field ending darker than the coat's darkest violet, so the coat
            stays the brightest thing on the page */}
        <linearGradient id={g('carpetTop')} x1="0.04" y1="0" x2="0.96" y2="1">
          <stop offset="0" stopColor="#6b3072" />
          <stop offset="0.28" stopColor="#4e2160" />
          <stop offset="0.62" stopColor="#3f1c56" />
          <stop offset="1" stopColor="#2c1444" />
        </linearGradient>
        <linearGradient id={g('carpetUnder')} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#2b1440" />
          <stop offset="0.5" stopColor="#1d0c2f" />
          <stop offset="1" stopColor="#140821" />
        </linearGradient>
        {/* the one warm note on the whole sprite: a madder red kept below the coat in both
            value and chroma, so it contrasts without competing */}
        <linearGradient id={g('carpetBand')} x1="0.05" y1="0" x2="0.95" y2="1">
          <stop offset="0" stopColor="#c2455c" />
          <stop offset="0.34" stopColor="#972f47" />
          <stop offset="0.72" stopColor="#7d2338" />
          <stop offset="1" stopColor="#5c1729" />
        </linearGradient>
        {/* its own gold rather than a reuse of `gold`, which finishes at x2=0.55 and would
            leave the right half of a 119-unit-wide carpet flat */}
        <linearGradient id={g('carpetTrim')} x1="0" y1="0.1" x2="1" y2="0.9">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.24" stopColor="#f0c258" />
          <stop offset="0.52" stopColor="#c9922c" />
          <stop offset="0.78" stopColor="#e8bb52" />
          <stop offset="1" stopColor="#c08a22" />
        </linearGradient>
        <radialGradient id={g('carpetAuraG')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#d98cf7" stopOpacity="0.3" />
          <stop offset="0.45" stopColor="#9a45db" stopOpacity="0.13" />
          <stop offset="1" stopColor="#6c29a8" stopOpacity="0" />
        </radialGradient>
        <clipPath id={g('carpetClip')}>
          <path d={CARPET_D} />
        </clipPath>
        <clipPath id={g('carpetLipClip')}>
          <path d={CARPET_LIP_D} />
        </clipPath>
        <radialGradient id={g('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1c0d2b" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#1c0d2b" stopOpacity="0.2" />
          <stop offset="1" stopColor="#1c0d2b" stopOpacity="0" />
        </radialGradient>
        <filter id={g('soft')} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        {/* clip regions so the hat shading never spills past its silhouette */}
        <clipPath id={g('hatConeClip')}>
          <path d={HAT_CONE_D} />
        </clipPath>
        <clipPath id={g('hatBrimClip')}>
          <path d={HAT_BRIM_D} />
        </clipPath>
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
              cy="114.5"
              rx="30"
              ry="6"
              fill={u('shadow')}
              stroke="none"
            />
          </g>

          {/* the vehicle, behind him and outside every act* group so no vignette can reach it.
              only the walk class reveals it. the near edge that runs in front of his shins is
              a second group, drawn after the body. */}
          {RIDE === 'carpet' && (
            <g transform={`translate(0,${CARPET_LIFT})`}>
              <g className={g('carpet')}>
                <ellipse
                  className={g('carpetAura')}
                  cx="48"
                  cy="120"
                  rx="68"
                  ry="15"
                  fill={u('carpetAuraG')}
                  stroke="none"
                />
                {/* the same silhouette dropped 0.9, so a dark selvage peeks out underneath */}
                <path
                  d={CARPET_D}
                  transform="translate(0,0.9)"
                  fill={u('carpetUnder')}
                  stroke="#2a1a3a"
                  strokeWidth="2.1"
                  strokeLinejoin="round"
                />
                {/* fringe first, so the strands tuck under the deck instead of onto it */}
                <g className={g('carpetFringeB')}>
                  <path d={CARPET_FRINGE_B_D} fill="none" stroke={u('carpetTrim')} strokeWidth="1.5" strokeLinecap="round" />
                </g>
                <g className={g('carpetFringeF')}>
                  <path d={CARPET_FRINGE_F_D} fill="none" stroke={u('carpetTrim')} strokeWidth="1.5" strokeLinecap="round" />
                </g>
                <path d={CARPET_D} fill={u('carpetTop')} stroke="#2a1a3a" strokeWidth="2.1" strokeLinejoin="round" />
                {/* clipped to the silhouette so no pattern can spill — the same trick the hat
                    brim already uses. field first, then the border painted over its edges. */}
                <g clipPath={u('carpetClip')} fill="none">
                  <rect x="-16" y="99" width="26" height="32" fill={u('carpetBand')} />
                  <rect x="98" y="104" width="26" height="31" fill={u('carpetBand')} />
                  <path d="M10 99L10 130M98 104L98 134" stroke={u('carpetTrim')} strokeWidth="1.5" opacity="0.8" />
                  <path d={CARPET_SPINE_D} stroke={u('carpetTrim')} strokeWidth="0.9" opacity="0.5" />
                  {/* chunky on purpose: anything with interior detail turns to mud at size 88 */}
                  <g fill={u('carpetTrim')}>
                    <path d={carpetDiamond(17, 113.8, 3.2, 2.4)} />
                    <path d={carpetDiamond(32, 116, 3.2, 2.4)} />
                    <path d={carpetDiamond(48, 119.7, 4.4, 3)} />
                    <path d={carpetDiamond(64, 120.6, 3.2, 2.4)} />
                    <path d={carpetDiamond(81, 120.5, 3.2, 2.4)} />
                  </g>
                  {/* three centred strokes of the deck path itself. the clip discards the outer
                      half of each, so widest-first stacks up as gold rim / red band / gold
                      hairline reading inward, and it hugs the S without a second path. */}
                  <path d={CARPET_D} stroke={u('carpetTrim')} strokeWidth="5.2" />
                  <path d={CARPET_D} stroke={u('carpetBand')} strokeWidth="4.2" />
                  <path d={CARPET_D} stroke={u('carpetTrim')} strokeWidth="1.4" />
                  <path
                    d="M-5 110C1 107.2 9 105.8 17 106.5C27 107.2 38 109.9 48 112.8C58 114.3 68 114.6 77 114.3C86 114.3 96 113.7 102 112.3"
                    stroke="#e6b9ff"
                    strokeWidth="1.1"
                    opacity="0.3"
                  />
                </g>
              </g>
            </g>
          )}

          {/* the takeoff lift lives on its own wrapper, outside `body`. body carries an animation
              in all three states, and an animation cannot be transitioned into — putting the 10
              units there made him jump onto the carpet in a single frame. here it is a plain
              declaration, so the .3s ease below actually runs and he rises and settles. */}
          <g className={g('flyRise')}>
            <g
              className={g('body')}
              stroke="#2a1a3a"
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {/* the vignette rig hangs off the feet, so the base cycles keep running underneath */}
              <g className={g('actRoot')}>
                {/* legs and boots, tucked under the coat hem */}
                <g className={g('legB')}>
                  <g className={g('actLegB')}>
                    <path d="M40 72L39.6 98" fill="none" stroke={u('trouser')} strokeWidth="11" strokeLinecap="butt" />
                    <path d="M35 96L45 96L45 107C45 111.4 42.8 113.6 38.6 113.6L32.4 113.6C29.2 113.6 28 111.2 28.9 108.6L32 99.5C32.5 97.2 33.4 96 35 96Z" fill={u('boot')} strokeWidth="2.1" />
                    <path d="M35 96L45 96L45 100.6L31.55 100.6L32 99.5C32.5 97.2 33.4 96 35 96Z" fill={u('gold')} strokeWidth="1.3" />
                    <path d="M34.4 101.4C33.6 104 32.9 106.4 32.4 108.6" fill="none" stroke="#a487ac" strokeWidth="1.5" opacity="0.42" />
                    <path d="M30.6 109.6C32.6 112.2 35.6 113.2 39.4 113" fill="none" stroke="#9a7aa2" strokeWidth="1.3" opacity="0.6" />
                    <path d="M32.5 97C31.4 101 30.2 105.6 29.7 108.8" fill="none" stroke="#ffd0a0" strokeWidth="2" opacity="0.6" filter={u('soft')} />
                  </g>
                </g>
                <g className={g('legF')}>
                  <g className={g('actLegF')}>
                    <path d="M56 72L56.4 98" fill="none" stroke={u('trouser')} strokeWidth="11" strokeLinecap="butt" />
                    <path d="M61 96L51 96L51 107C51 111.4 53.2 113.6 57.4 113.6L63.6 113.6C66.8 113.6 68 111.2 67.1 108.6L64 99.5C63.5 97.2 62.6 96 61 96Z" fill={u('boot')} strokeWidth="2.1" />
                    <path d="M61 96L51 96L51 100.6L64.45 100.6L64 99.5C63.5 97.2 62.6 96 61 96Z" fill={u('gold')} strokeWidth="1.3" />
                    <path d="M65.4 109.6C63.4 112.2 60.4 113.2 56.6 113" fill="none" stroke="#9a7aa2" strokeWidth="1.2" opacity="0.3" />
                  </g>
                </g>

                {/* the flight-only rider parts sit here so the coat, drawn after, overlaps the lap
                    and the tail roots — the occlusion a seated figure needs. opacity 0 by
                    attribute, so idle, talk and every vignette leave them invisible. */}
                <g className={g('flyLegs')} opacity="0">
                  {/* where the lap disappears under the hem */}
                  <ellipse cx="48" cy="89" rx="22" ry="6.5" fill="#2a1a3a" opacity="0.34" stroke="none" filter={u('soft')} />
                  {/* far shin: a straight mirror about x=48, so the pose can never be handed */}
                  <use href={`#${g('flySeat')}`} transform="translate(96,0) scale(-1,1)" />
                  {/* near shin, drawn second so the overlap at x=48 reads as the crossing */}
                  <g id={g('flySeat')}>
                    <path d="M58.5 83.5C54 87 49 91 45 94.6" fill="none" stroke={u('trouser')} strokeWidth="11" strokeLinecap="butt" />
                    {/* the standing boot, same path, rotated to the shin's own 52deg — which swings
                        its toe from pointing along -x to pointing up and outward, the turned-up
                        foot a cross-legged pose needs. the gold is trimmed from 4.6 to 2.9 units
                        so it reads as an ankle strap rather than a bar. */}
                    <g transform="translate(5,-1.4) rotate(52 40 96)">
                      <path d="M35 96L45 96L45 107C45 111.4 42.8 113.6 38.6 113.6L32.4 113.6C29.2 113.6 28 111.2 28.9 108.6L32 99.5C32.5 97.2 33.4 96 35 96Z" fill={u('boot')} strokeWidth="2.1" />
                      <path d="M35 96L45 96L45 98.9L31.9 98.9L32 99.5C32.5 97.2 33.4 96 35 96Z" fill={u('gold')} strokeWidth="1.1" />
                      <path d="M34.4 101.4C33.6 104 32.9 106.4 32.4 108.6" fill="none" stroke="#a487ac" strokeWidth="1.5" opacity="0.42" />
                      <path d="M30.6 109.6C32.6 112.2 35.6 113.2 39.4 113" fill="none" stroke="#9a7aa2" strokeWidth="1.3" opacity="0.6" />
                    </g>
                  </g>
                </g>

                {/* the coat being moved through air. two ribbons on different periods so they never
                    stream in lockstep; their roots sit inside the coat outline at x 26-28, so the
                    coat drawn after hides where they attach. one-sided by design — "trailing"
                    follows facing, and facing follows travel, so the flip carries it. */}
                <g className={g('flyTailB')} opacity="0">
                  <path d="M26.5 87.6C20 90.4 13.6 94.6 9 99.4C7 101.4 7.6 103.4 10.4 103.2C13.4 100 18.2 97 23.4 95C25.6 94.2 27 93 27 91.4Z" fill={u('coatSide')} strokeWidth="2" />
                </g>
                <g className={g('flyTailA')} opacity="0">
                  <path d="M27 79.5C19 81 11 84.6 4.4 89.6C1.2 92 0.4 94.6 3.4 96.6C6 94 10.4 91.4 15.6 89.4C20.4 87.6 25 86.6 28 86.4Z" fill={u('coat')} strokeWidth="2" />
                  <path d="M3.4 96.6C6 94 10.4 91.4 15.6 89.4C20.4 87.6 25 86.6 28 86.4" fill="none" stroke={u('gold')} strokeWidth="1.4" />
                  <path d="M6.2 92.6C10.4 90 15.6 88 21.4 86.8" fill="none" stroke={u('lining')} strokeWidth="1.6" opacity="0.5" />
                </g>

                {/* torso: sway pivots at the shoulders, breathing scales from the hem */}
                <g className={g('sway')}>
                  <g className={g('breathe')}>
                    {/* tall standing collar, behind the head */}
                    <path
                      d="M22 65C18.8 59 17.9 52.6 18.7 47.4C19 45.2 21.3 44.4 23.2 45.7L33 50.8C36 54.4 41.5 56.4 48 56.4C54.5 56.4 60 54.4 63 50.8L72.8 45.7C74.7 44.4 77 45.2 77.3 47.4C78.1 52.6 77.2 59 74 65C64 69 32 69 22 65Z"
                      fill={u('collarG')}
                      strokeWidth="2.1"
                    />
                    <path
                      d="M25.4 64.2C22.6 58.4 21.5 52.8 22.2 48.4C22.4 47 23.8 46.5 24.9 47.2L33.8 51.8C36.9 55.2 42.2 57.1 48 57.1C53.8 57.1 59.1 55.2 62.2 51.8L71.1 47.2C72.2 46.5 73.6 47 73.8 48.4C74.5 52.8 73.4 58.4 70.6 64.2Z"
                      fill={u('lining')}
                      strokeWidth="1.2"
                    />
                    <path d="M18.3 54.5C18.1 51.4 18.4 48.2 18.7 47.4C19 45.2 21.3 44.4 23.2 45.7L32.6 50.6" fill="none" stroke={u('gold')} strokeWidth="1.9" />
                    <path d="M77.7 54.5C77.9 51.4 77.6 48.2 77.3 47.4C77 45.2 74.7 44.4 72.8 45.7L63.4 50.6" fill="none" stroke={u('gold')} strokeWidth="1.9" />
                    <path d="M26.6 50.2C26.6 54.8 27.8 59.4 29.8 63.6" fill="none" stroke="#a98fd0" strokeWidth="1.3" opacity="0.5" />
                    <path d="M69.4 50.2C69.4 54.8 68.2 59.4 66.2 63.6" fill="none" stroke="#a98fd0" strokeWidth="1.3" opacity="0.5" />
                    <path d="M23.4 62C20.2 56.4 19.2 50.6 19.8 47" fill="none" stroke="#ffd0a0" strokeWidth="2" opacity="0.6" filter={u('soft')} />

                    {/* coat */}
                    <path
                      d="M30 53C26 61 23.5 71 22 80C21.5 84 21 87 21.5 90L26 93L31 85L36 93L41 86L48 84L55 86L60 93L65 85L70 93L74.5 90C75 87 74.5 84 74 80C72.5 71 70 61 66 53Z"
                      fill={u('coat')}
                      strokeWidth="2.1"
                    />
                    <path d="M31 53C36 60 60 60 65 53L65 50L31 50Z" fill="#2a1a3a" opacity="0.24" stroke="none" filter={u('soft')} />
                    <path d="M66 54C69 62 71.4 71 72.8 80C73.2 83.4 73.6 86 73.4 88L69 84.8C68.6 81.4 68 77 66.8 72C65.6 66.6 64 60 62 55.6Z" fill="#2a1a3a" opacity="0.2" stroke="none" />
                    {/* pale lavender lining along the zigzag hem */}
                    <path
                      d="M21.5 90L26 93L31 85L36 93L41 86L48 84L55 86L60 93L65 85L70 93L74.5 90L74.5 85.5L70 88.5L65 80.5L60 88.5L55 81.5L48 79.5L41 81.5L36 88.5L31 80.5L26 88.5L21.5 85.5Z"
                      fill={u('lining')}
                      strokeWidth="1.3"
                    />
                    <path
                      d="M21.5 85.5L26 88.5L31 80.5L36 88.5L41 81.5L48 79.5L55 81.5L60 88.5L65 80.5L70 88.5L74.5 85.5"
                      fill="none"
                      stroke={u('gold')}
                      strokeWidth="1.7"
                    />
                    {/* chest: pale inner robe V */}
                    <path d="M34.5 53C38 60 45 66 48 71C51 66 58 60 61.5 53Z" fill={u('lining')} strokeWidth="1.5" />
                    <path d="M34.5 53C38 60 45 66 48 71C51 66 58 60 61.5 53" fill="none" stroke={u('gold')} strokeWidth="2" />
                    <path d="M37.6 53.8C40.8 59.4 45.8 64.4 48 68.2" fill="none" stroke="#ffffff" strokeWidth="1.4" opacity="0.55" />
                    <path d="M30.6 55.6C36 51.6 60 51.6 65.4 55.6" fill="none" stroke={u('gold')} strokeWidth="1.7" />
                    {/* chest clasps */}
                    <g strokeWidth="1">
                      <path d="M35.6 56.4L38.4 58L38.4 61L35.6 62.6L32.8 61L32.8 58Z" fill={u('gold')} />
                      <path d="M60.4 56.4L63.2 58L63.2 61L60.4 62.6L57.6 61L57.6 58Z" fill={u('gold')} />
                    </g>
                    {/* belt with the hexagonal buckle and its violet gem */}
                    <path d="M25 66.5C32 71 64 71 71 66.5L71 74.5C64 79 32 79 25 74.5Z" fill="#381e52" strokeWidth="1.7" />
                    <path d="M25 67.9C32 72.4 64 72.4 71 67.9" fill="none" stroke={u('gold')} strokeWidth="1.3" opacity="0.9" />
                    <path d="M48 66L55.7 70.4L55.7 79.2L48 83.6L40.3 79.2L40.3 70.4Z" fill={u('gold')} strokeWidth="1.9" />
                    <path d="M48 70.6L52.1 72.9L52.1 77.5L48 79.8L43.9 77.5L43.9 72.9Z" fill={u('gem')} strokeWidth="1.1" />
                    <path d="M48 71.7L50.6 73.2L48 74.7L45.4 73.2Z" fill="#f6e6ff" opacity="0.75" stroke="none" />
                    <path d="M29.4 54.6C26 62.4 23.6 71.6 22.4 80" fill="none" stroke="#ffd0a0" strokeWidth="2" opacity="0.6" filter={u('soft')} />
                  </g>
                </g>

                {/* far arm (the character's right): drawn over the coat, the way the art reads */}
                <g className={g('armB')}>
                  <g className={g('actArmB')}>
                    <path d="M64 57C69 63 73.6 70 74.9 76" fill="none" strokeWidth="14.5" />
                    <path d="M64 57C69 63 73.6 70 74.9 76" fill="none" stroke={u('coatSide')} strokeWidth="11" />
                    <path d="M74.4 72.8C74.7 74.2 74.9 75.3 75.1 76.6" fill="none" stroke={u('lining')} strokeWidth="11.5" />
                    <ellipse cx="70.2" cy="77.4" rx="4.1" ry="3.1" transform="rotate(38 70.2 77.4)" fill={u('coatSide')} strokeWidth="1.8" />
                    <ellipse cx="76.2" cy="83" rx="8.2" ry="7.6" fill={u('coatSide')} strokeWidth="2" />
                    <path d="M72.8 79.2C72 81.8 72.2 84.6 73.4 87" fill="none" stroke="#3d1a5c" strokeWidth="1.3" opacity="0.4" />
                    {vignette && <ArmBFx uid={uid} u={u} v={vignette} />}
                  </g>
                </g>

                {/* head, face, hair, hat */}
                <g className={g('head')}>
                  <g className={g('actHead')}>
                    <ellipse cx="48" cy="33.5" rx="23" ry="20.5" fill={u('skin')} strokeWidth="2.1" />
                    <path d="M26 30C30 38 38 42 48 42C58 42 66 38 70 30L70 20L26 20Z" fill="#8b3fd4" opacity="0.12" stroke="none" filter={u('soft')} />
                    <ellipse cx="32.6" cy="44.5" rx="4.6" ry="2.7" fill="#ff7fbb" opacity="0.42" stroke="none" />
                    <ellipse cx="63.4" cy="44.5" rx="4.6" ry="2.7" fill="#ff7fbb" opacity="0.42" stroke="none" />

                    {/* eyes: the whole group squashes for the blink */}
                    <g className={g('actEyes')}>
                      <g className={g('eyes')} stroke="none">
                        <ellipse cx="38.8" cy="39.5" rx="5.9" ry="7.5" fill="#2a1a3a" />
                        <ellipse cx="57.2" cy="39.5" rx="5.9" ry="7.5" fill="#2a1a3a" />
                        <ellipse cx="39.1" cy="40.6" rx="4.4" ry="5.8" fill="#5b32a8" />
                        <ellipse cx="57.5" cy="40.6" rx="4.4" ry="5.8" fill="#5b32a8" />
                        <ellipse cx="39.1" cy="42.4" rx="3.3" ry="3.7" fill="#a074ee" />
                        <ellipse cx="57.5" cy="42.4" rx="3.3" ry="3.7" fill="#a074ee" />
                        <circle cx="36.7" cy="37" r="2.4" fill="#ffffff" />
                        <circle cx="55.1" cy="37" r="2.4" fill="#ffffff" />
                        <circle cx="41" cy="43.4" r="1.2" fill="#ffffff" opacity="0.85" />
                        <circle cx="59.4" cy="43.4" r="1.2" fill="#ffffff" opacity="0.85" />
                      </g>
                      {/* replacement eyes: identical art, but the vignette can scale and dart them */}
                      {vignette && (
                        <g className={g('vfEyes')} stroke="none">
                          <ellipse cx="38.8" cy="39.5" rx="5.9" ry="7.5" fill="#2a1a3a" />
                          <ellipse cx="57.2" cy="39.5" rx="5.9" ry="7.5" fill="#2a1a3a" />
                          <g className={g('vfPupils')}>
                            <ellipse cx="39.1" cy="40.6" rx="4.4" ry="5.8" fill="#5b32a8" />
                            <ellipse cx="57.5" cy="40.6" rx="4.4" ry="5.8" fill="#5b32a8" />
                            <ellipse cx="39.1" cy="42.4" rx="3.3" ry="3.7" fill="#a074ee" />
                            <ellipse cx="57.5" cy="42.4" rx="3.3" ry="3.7" fill="#a074ee" />
                            <circle cx="36.7" cy="37" r="2.4" fill="#ffffff" />
                            <circle cx="55.1" cy="37" r="2.4" fill="#ffffff" />
                            <circle cx="41" cy="43.4" r="1.2" fill="#ffffff" opacity="0.85" />
                            <circle cx="59.4" cy="43.4" r="1.2" fill="#ffffff" opacity="0.85" />
                          </g>
                        </g>
                      )}
                    </g>

                    <path className={g('mouth')} d="M44.6 47.7C46.4 51 50.2 51.2 52.2 47.3" fill="none" stroke="#7b3450" strokeWidth="2.1" />

                    {/* hair: the crown tucks under the brim, the lock sweeps right */}
                    <path
                      d="M25.8 36C24.5 30.2 25.4 24 30.2 20.4C35.8 16.2 43 14.8 49.4 15.4C56 16 61.6 18.2 65.6 21.8C68.6 24.4 70 26.2 70.4 28.2C75.6 27.2 80.8 26.2 84 23.6C85.4 22.4 86.4 21.6 87.2 20.8C86 22.8 84.8 24.6 83 26.2C79.6 29.4 75.2 31.4 71.2 32.6C71.4 34 71.2 35.2 71 36.4L66 45L64.6 25.4L57.5 33L53 26L47.5 38.4L41 26L36.5 32.6L33 25.2L30 45Z"
                      fill={u('hair')}
                      strokeWidth="2.1"
                    />
                    <path d="M31.4 33.8C31.8 30.8 33.2 28.6 35.6 27.2" fill="none" stroke="#f0cfff" strokeWidth="2.4" opacity="0.5" filter={u('soft')} />
                    <path d="M73.4 28.8C77.4 28 81 27 84.2 24.4" fill="none" stroke="#f6dcff" strokeWidth="1.9" opacity="0.62" filter={u('soft')} />
                    <path d="M72.6 31.4C76.2 30.6 79.6 29.2 82.2 27" fill="none" stroke="#4a1d7a" strokeWidth="1.2" opacity="0.45" />

                    {/* the brim casts down over the forehead */}
                    <path d="M28.5 24C33.5 29.6 40 32 48 32C56 32 62.5 29.6 67.5 24L67.5 19L28.5 19Z" fill="#2a1a3a" opacity="0.24" stroke="none" filter={u('soft')} />

                    {/* blink lids and the open mouth ride over the finished face */}
                    <g className={g('lids')} fill="none" strokeWidth="2.6">
                      <path d="M33.4 39C35.8 42.4 41.8 42.4 44.2 39" />
                      <path d="M51.8 39C54.2 42.4 60.2 42.4 62.6 39" />
                    </g>
                    <g className={g('mouthopen')} stroke="#7b3450">
                      <ellipse cx="48.4" cy="49.8" rx="4.4" ry="3.2" fill="#5c2338" strokeWidth="1.8" />
                      <ellipse cx="48.4" cy="51.5" rx="2.5" ry="1.2" fill="#e07a72" stroke="none" />
                    </g>
                    {/* brows read through the fringe, the way anime draws them */}
                    <g className={g('brows')} fill="none" stroke="#3f1f66" strokeWidth="2.2" opacity="0.92">
                      <path d="M33.8 31.6C36.6 28.8 41.2 28.4 44.6 30.4" />
                      <path d="M51.4 30.4C54.8 28.4 59.4 28.8 62.2 31.6" />
                    </g>
                    <path d="M26.8 34C26.2 30.6 27.2 27.6 29.6 25.4" fill="none" stroke="#ffd0a0" strokeWidth="2" opacity="0.6" filter={u('soft')} />

                    {/* the replacement face: one rig, five vignettes, opacity-toggled variants */}
                    {vignette && (
                      <>
                        <g className={g('vfLids')} fill="none" strokeWidth="2.6">
                          <path d="M33.4 39C35.8 42.4 41.8 42.4 44.2 39" />
                          <path d="M51.8 39C54.2 42.4 60.2 42.4 62.6 39" />
                        </g>
                        <g className={g('vfBrows')} fill="none" stroke="#3f1f66" strokeWidth="2.2" opacity="0.92">
                          <path d="M33.8 31.6C36.6 28.8 41.2 28.4 44.6 30.4" />
                          <path className={g('vfBrowR')} d="M51.4 30.4C54.8 28.4 59.4 28.8 62.2 31.6" />
                        </g>
                        <path
                          className={g('vfMouth')}
                          d="M44.6 47.7C46.4 51 50.2 51.2 52.2 47.3"
                          fill="none"
                          stroke="#7b3450"
                          strokeWidth="2.1"
                        />
                        <g className={g('vfMouthO')} opacity="0" stroke="#7b3450">
                          <ellipse cx="48.4" cy="49.8" rx="3.2" ry="2.9" fill="#5c2338" strokeWidth="1.8" />
                          <ellipse cx="48.4" cy="51" rx="1.8" ry="0.9" fill="#e07a72" stroke="none" />
                        </g>
                        <g className={g('vfMouthBig')} opacity="0" stroke="#7b3450">
                          <ellipse cx="48.4" cy="50" rx="5.4" ry="4.4" fill="#5c2338" strokeWidth="1.9" />
                          <ellipse cx="48.4" cy="52.4" rx="2.8" ry="1.4" fill="#e07a72" stroke="none" />
                        </g>
                        <path
                          className={g('vfSmile')}
                          opacity="0"
                          d="M42.6 46.6C45.4 53.6 51.8 53.6 54.4 46.4C50.4 48.8 46.4 48.8 42.6 46.6Z"
                          fill="#5c2338"
                          strokeWidth="1.9"
                        />
                        <HeadFx uid={uid} u={u} v={vignette} />
                      </>
                    )}

                    {/* pointed wizard hat: one rig unit pivoting on 48,21 where it sits on the head.
                        hatHide wraps hatArt so the <use> clone in the vfx layer is never hidden with it */}
                    <g className={g('hatHide')}>
                      <g id={g('hatArt')}>
                        <g className={g('cone')}>
                          <g className={g('actCone')}>
                            {/* brim, behind the cone */}
                            <path d={HAT_BRIM_D} fill={u('hatBrimG')} strokeWidth="2.1" />
                            <g clipPath={u('hatBrimClip')}>
                              <path d="M34.6 18.6C40.8 23.4 53 23.6 59.4 18.8C62 22 66 24.6 70 26.4L70 29L27 29L27 26C30.6 23.8 33 21.4 34.6 18.6Z" fill="#2a1a3a" opacity="0.26" stroke="none" filter={u('soft')} />
                              <path d="M22.6 21.6C24.6 17.6 30.8 14.6 39.4 13.6" fill="none" stroke="#f5c8ff" strokeWidth="1.8" opacity="0.45" filter={u('soft')} />
                            </g>
                            {/* cone with a soft fold near the tip */}
                            <path d={HAT_CONE_D} fill={u('hatConeG')} strokeWidth="2.1" />
                            <g clipPath={u('hatConeClip')}>
                              <path d="M48 1.2C53 0.8 57.4 2.4 60 5.4C58.4 7.8 55.4 9.2 52.6 9.8C50.8 10.2 49.8 11.2 50.2 12.8C51.2 16.4 54.2 19.4 59 22.4L62 24.4L62 0Z" fill="#2a1a3a" opacity="0.17" stroke="none" />
                              <path d="M59.4 5.2C58 7.2 55.6 8.6 52.8 9.2C51.4 9.5 50.6 10.2 50.9 11.4C46.6 11.8 42.2 13.4 38.6 16.4C42.4 10.8 49.6 7.2 59.4 5.2Z" fill="#2a1a3a" opacity="0.32" stroke="none" filter={u('soft')} />
                              <path d="M38.6 18.4C37.8 13.6 38.8 9.2 41.6 5.6" fill="none" stroke="#f5b8ff" strokeWidth="2.6" opacity="0.5" filter={u('soft')} />
                              {/* pale lavender band where the cone meets the brim */}
                              <path d="M36.5 15.1C40.6 17.2 47.6 17.8 52.6 15.5C53.6 17.4 55.4 18.9 57.5 20C51.6 22.6 42.4 22.4 36.6 19.8C36.4 18.2 36.4 16.6 36.5 15.1Z" fill={u('lining')} stroke="none" />
                              <path d="M36.5 15.1C40.6 17.2 47.6 17.8 52.6 15.5" fill="none" stroke={u('gold')} strokeWidth="1.6" />
                              <path d="M38.4 18.4C42.6 20 47.6 20.4 52 19.6" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.5" />
                            </g>
                            {/* crisp silhouette back on top of the band */}
                            <path d={HAT_CONE_D} fill="none" strokeWidth="2.1" />
                            {/* gold star at the folded tip */}
                            <g className={g('star')}>
                              <circle cx="61.6" cy="4.9" r="8.6" fill={u('hatStarGlow')} stroke="none" />
                              <path
                                d="M61.6 0.3L63.07 2.88L65.98 3.48L63.98 5.67L64.3 8.62L61.6 7.4L58.9 8.62L59.22 5.67L57.22 3.48L60.13 2.88Z"
                                fill={u('hatStarG')}
                                strokeWidth="0.95"
                              />
                              <circle cx="61.6" cy="4.7" r="1.55" fill="#fff4c8" opacity="0.92" stroke="none" />
                            </g>
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </g>

                {/* near arm (the character's left) with the amber crystal staff */}
                <g className={g('armF')}>
                  <g className={g('actArmF')}>
                    {/* actStaff wraps only the staff itself, so the sleeve stays welded to the arm.
                        flyStaff goes around it, never inside: at rest the butt is on the ground at
                        y=113, so once he lifts it would hang through the deck. 9 units is chosen so
                        the upper gold band slides under the crystal collar and the lower one
                        emerges just below the mitten as a ferrule; the hand never appears to move
                        because the mitten is painted over the shaft. */}
                    <g className={g('flyStaff')}>
                      <g className={g('actStaff')}>
                        {vignette && <StaffFx uid={uid} u={u} v={vignette} />}
                        <g className={g('glow')} stroke="none">
                          <ellipse cx="9" cy="15" rx="20" ry="20" fill={u('amberGlow')} />
                        </g>
                        <path d="M6.1 26L9.9 26L19.4 113L15.6 113Z" fill={u('staffWood')} strokeWidth="1.6" />
                        <path d="M7 28L16.4 113" fill="none" stroke="#c7a8dd" strokeWidth="0.9" opacity="0.45" />
                        <path d="M6.9 35L10.7 35L11.1 39L7.3 39Z" fill={u('gold')} strokeWidth="1" />
                        <path d="M14.2 100L18 100L18.4 104L14.6 104Z" fill={u('gold')} strokeWidth="1" />
                        <path d="M3.6 27.5L14.2 27.5L12.6 21L5.2 21Z" fill={u('gold')} strokeWidth="1.5" />
                        <path d="M9 3.5L16.6 14L9 24.5L1.4 14Z" fill={u('amber')} strokeWidth="1.6" />
                        <path d="M9 3.5L9 24.5M1.4 14L16.6 14" fill="none" stroke="#ffeec4" strokeWidth="0.7" opacity="0.6" />
                        <path d="M9 6.5L13.8 13.6L9 12.4Z" fill="#fffbe8" opacity="0.8" stroke="none" />
                      </g>
                    </g>
                    <path d="M32 57C27 62 22 68 19.6 74" fill="none" strokeWidth="14.5" />
                    <path d="M32 57C27 62 22 68 19.6 74" fill="none" stroke={u('coatSide')} strokeWidth="11" />
                    <path d="M20.8 70.8C20.2 72 19.8 73.1 19.5 74.4" fill="none" stroke={u('lining')} strokeWidth="11.5" />
                    <ellipse cx="21.6" cy="76.2" rx="4.1" ry="3.1" transform="rotate(-38 21.6 76.2)" fill={u('coatSide')} strokeWidth="1.8" />
                    {/* oversized mitten wrapped around the shaft */}
                    <ellipse cx="15.4" cy="81.8" rx="8.2" ry="7.6" fill={u('coatSide')} strokeWidth="2" />
                    <path d="M18.8 78C19.6 80.6 19.4 83.4 18.2 85.8" fill="none" stroke="#3d1a5c" strokeWidth="1.3" opacity="0.45" />
                    <path d="M9.4 79C10.8 75.4 14.4 73.6 17.8 74.8" fill="none" stroke="#eab9ff" strokeWidth="1.6" opacity="0.6" />
                    <path d="M8.8 78.2C10.4 76 13 74.8 15.8 74.7" fill="none" stroke="#ffd0a0" strokeWidth="1.5" opacity="0.42" />
                  </g>
                </g>

                {/* floating spellbook: its own actor, so the next phase can fly it anywhere */}
                <g className={g('book')}>
                  <g className={g('actBook')}>
                    <g transform="rotate(-7 82.5 55)">
                      <ellipse cx="82.5" cy="55" rx="21" ry="17" fill={u('bookGlow')} stroke="none" />
                      <g className={g('pages')}>
                        <path d="M73.5 46.5L95.5 46.5C96.1 53 96.1 60 95.5 66.5L73.5 66.5Z" fill={u('page')} strokeWidth="1.4" />
                        <path d="M93.7 47.7C94.3 53.6 94.3 59.6 93.7 65.4M91.7 47.5C92.3 53.6 92.3 59.6 91.7 65.6" fill="none" stroke="#b39a68" strokeWidth="0.8" opacity="0.85" />
                      </g>
                      <path
                        d="M73 44L92 44C93.5 44 94.2 44.8 94.2 46.2L94.2 63.8C94.2 65.2 93.5 66 92 66L73 66C71.5 66 70.8 65.2 70.8 63.8L70.8 46.2C70.8 44.8 71.5 44 73 44Z"
                        fill={u('leather')}
                        strokeWidth="1.9"
                      />
                      <path d="M74.6 44L78.2 44L78.2 66L74.6 66Z" fill="#4d2513" opacity="0.6" stroke="none" />
                      {/* gold corner caps */}
                      <g fill={u('gold')} strokeWidth="1.2">
                        <path d="M73 44L79.4 44L73 50.4C71.5 50.4 70.8 49.6 70.8 48.2L70.8 46.2C70.8 44.8 71.5 44 73 44Z" />
                        <path d="M92 44L85.6 44L92 50.4C93.5 50.4 94.2 49.6 94.2 48.2L94.2 46.2C94.2 44.8 93.5 44 92 44Z" />
                        <path d="M73 66L79.4 66L73 59.6C71.5 59.6 70.8 60.4 70.8 61.8L70.8 63.8C70.8 65.2 71.5 66 73 66Z" />
                        <path d="M92 66L85.6 66L92 59.6C93.5 59.6 94.2 60.4 94.2 61.8L94.2 63.8C94.2 65.2 93.5 66 92 66Z" />
                      </g>
                      {/* gold hex emblem with a violet gem */}
                      <path d="M83.3 47.6L89.1 51L89.1 57.8L83.3 61.2L77.5 57.8L77.5 51Z" fill={u('gold')} strokeWidth="1.7" />
                      <path d="M83.3 51L86.2 52.7L86.2 56.1L83.3 57.8L80.4 56.1L80.4 52.7Z" fill={u('gem')} strokeWidth="1.1" />
                      <path d="M83.3 52L85.3 53.2L83.3 54.4L81.3 53.2Z" fill="#f6e6ff" opacity="0.75" stroke="none" />
                      <path d="M72.2 45.2L91.1 45.2" fill="none" stroke="#ffd8a8" strokeWidth="1.1" opacity="0.5" />
                      <ellipse cx="82" cy="71" rx="12" ry="2.6" fill="#1c0d2b" opacity="0.22" stroke="none" />
                    </g>
                    <g fill="#e0aeff" stroke="none">
                      <path d="M94 34L94.9 36.4L97.3 37.3L94.9 38.2L94 40.6L93.1 38.2L90.7 37.3L93.1 36.4Z" opacity="0.7" />
                      <path d="M69 70L69.7 71.7L71.4 72.4L69.7 73.1L69 74.8L68.3 73.1L66.6 72.4L68.3 71.7Z" opacity="0.45" />
                      <path d="M96.5 64L97 65.3L98.3 65.8L97 66.3L96.5 67.6L96 66.3L94.7 65.8L96 65.3Z" opacity="0.55" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>

          {/* the carpet's near edge again, this time in front of him: this is what makes him sit
              IN it rather than on a stripe behind him. it is the same field and the same border
              stack as the deck, clipped to the lens — paint it in the accent red instead and the
              front half turns into a separate scarf lying across his lap. */}
          {RIDE === 'carpet' && (
            <g transform={`translate(0,${CARPET_LIFT})`}>
              <g className={g('carpetLip')}>
                <path d={CARPET_LIP_D} fill={u('carpetTop')} stroke="none" />
                <g clipPath={u('carpetLipClip')} fill="none">
                  <path d={CARPET_D} stroke={u('carpetTrim')} strokeWidth="5.2" />
                  <path d={CARPET_D} stroke={u('carpetBand')} strokeWidth="4.2" />
                  <path d={CARPET_D} stroke={u('carpetTrim')} strokeWidth="1.4" />
                </g>
                {/* the fold itself: light enough to catch, too dim to read as a stripe */}
                <path d={CARPET_LIP_TOP_D} fill="none" stroke="#e6b9ff" strokeWidth="1.2" strokeLinecap="round" opacity="0.22" />
                <path d={CARPET_LIP_BOT_D} fill="none" stroke="#2a1a3a" strokeWidth="2.1" strokeLinecap="round" />
              </g>
            </g>
          )}

          {vignette && <VfxLayer uid={uid} u={u} v={vignette} />}
        </g>
      </g>
    </svg>
  );
};
