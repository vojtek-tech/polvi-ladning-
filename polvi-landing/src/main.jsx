/**
 * The landing page, extracted verbatim from the generated single-file bundle and
 * adapted to real module imports. Behaviour is unchanged apart from:
 *   - window.__resources.r_*  ->  resources.r_*
 *   - framer-motion / React come from npm instead of window globals
 *   - the nav CTA is <PolviAuthCTA />, which swaps to "Go to app" when a session
 *     is detected (see authBridge.ts)
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import * as FramerMotion from 'framer-motion';

// Imported first so onAuthStateChange is registered before anything renders.
import './authBridge';

import { resources } from './resources.js';
import { PolviAuthCTA } from './components/PolviAuthCTA';

import './styles/fonts.css';
import './styles/app.css';

const { useState, useEffect, useRef, useMemo } = React;
const { motion, AnimatePresence, useScroll, useTransform, useInView } = FramerMotion;

/* ------------------------------------------------------------------ */
/*  FADE-UP on scroll                                                  */
/* ------------------------------------------------------------------ */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {if (e.isIntersecting) e.target.classList.add('in');});
    }, { threshold: 0.18 });
    document.querySelectorAll('.fade-up').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ------------------------------------------------------------------ */
/*  WORDMARK — original typographic treatment                          */
/* ------------------------------------------------------------------ */
function Wordmark({ className = '', logoSize = 48 }) {
  // The logo PNG has a lot of empty padding around the glyph — we crop it via
  // a wrapper with overflow hidden + scale the image up so the visible glyph
  // fills the box. The glyph itself sits in roughly the center ~40% of the PNG.
  const boxH = logoSize;
  const boxW = logoSize; // square crop window around the P mark
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        height: boxH,
        width: boxW,
        overflow: 'hidden',
        position: 'relative'
      }}>
      
      <img
        src={resources.r_polvi_logo_png}
        alt="Polvi"
        draggable="false"
        style={{
          position: 'absolute',
          // Source image: 1475×1115. Glyph is centered, roughly 40% of width/height.
          // Scale so glyph fills the box: scale factor ≈ 2.5× the box relative to intrinsic.
          width: boxW * 2.8,
          maxWidth: 'none',
          height: 'auto',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'block',
          pointerEvents: 'none'
        }} />
      
    </span>);

}

/* ------------------------------------------------------------------ */
/*  NAV — appears on scroll                                            */
/* ------------------------------------------------------------------ */
function Nav() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 240);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`nav-bar fixed top-0 left-0 right-0 z-50 ${show ? 'show' : ''}`}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
          <Wordmark logoSize={30} />
          <PolviAuthCTA className="linky label label-ink" />
        </div>
      </div>);

}

/* ------------------------------------------------------------------ */
/*  HEADLINE — word-by-word type-in, gold italic "point of view"        */
/* ------------------------------------------------------------------ */
function Headline() {
  // Segmented so we can italicize+gold "point of view"
  const parts = [
  { t: 'The design platform', gold: false, ital: false },
  { t: 'for architects  with a', gold: false, ital: false },
  { t: 'point of view.', gold: true, ital: true }];

  const wordsPerPart = parts.map((p) => p.t.split(' '));
  const flat = wordsPerPart.flatMap((ws, i) => ws.map((w) => ({ w, gold: parts[i].gold, ital: parts[i].ital, lineBreakAfter: false })));
  // Add explicit line breaks so the italic lands on its own line on large screens
  flat[2].lineBreakAfter = true; // after "platform"
  flat[7].lineBreakAfter = true; // after "a"

  return (
    <h1 className="serif display text-[clamp(40px,8.6vw,136px)] text-[#F5F5F4] max-w-[14ch]">
        {(() => {
        const out = [];
        flat.forEach((tok, i) => {
          out.push(
            <motion.span
              key={`w-${i}`}
              initial={{ opacity: 0, y: '0.45em', filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{
                duration: 0.9,
                delay: 0.35 + i * 0.11,
                ease: [0.2, 0.7, 0.2, 1]
              }}
              className={`inline-block ${tok.gold ? 'gold' : ''} ${tok.ital ? 'ital' : ''}`}
              style={{ marginRight: '0.22em' }}>
              
                {tok.w}
              </motion.span>
          );
          if (tok.lineBreakAfter) out.push(<br key={`br-${i}`} />);
        });
        return out;
      })()}
      </h1>);

}

/* ------------------------------------------------------------------ */
/*  HERO MEDIA — the mp4 screen, softly masked                         */
/* ------------------------------------------------------------------ */
function HeroMedia() {
  const videoRef = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 850);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative w-full h-full">
        <div className={`resolve ${on ? 'on' : ''} absolute inset-0 mask-soft`}>
          <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={resources.r_interior_1_png}
          style={{ display: 'none' }} />
        <img src={resources.r_interior_1_png} alt="" className="w-full h-full object-cover" />
        
        </div>
        {/* warm glow behind */}
        <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{ background: 'radial-gradient(60% 50% at 60% 50%, rgba(201,163,106,0.18), transparent 70%)' }} />
      
      </div>);

}

/* ------------------------------------------------------------------ */
/*  HERO SECTION                                                       */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden">
        {/* Top chrome (tiny, pre-nav) */}
        <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-0 left-0 right-0 z-20">
        
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-6 md:pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wordmark logoSize={48} />
            </div>
            <div className="hidden md:flex items-center gap-6">
              <span className="label"><span className="dot mr-2 align-middle" style={{ background: '#C9A36A' }} /> Private beta · S/S 26</span>
            </div>
            <div className="md:hidden">
              <span className="label">Beta</span>
            </div>
          </div>
        </motion.div>

        {/* Content grid */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 pt-[28vh] md:pt-[30vh] pb-24 grid grid-cols-12 gap-6 md:gap-10">
          {/* Headline column */}
          <div className="col-span-12 md:col-span-7 lg:col-span-7">
            <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="label mb-8">
            
              <span className="mr-3 mute-2">01 —</span> Polvi · Design platform for architects & interior designers
            </motion.div>

            <Headline />

            <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.9 }}
            className="mute mt-10 md:mt-12 max-w-[52ch] text-[15px] md:text-[17px] leading-[1.55]">
            
              Polvi helps architects and Interior Designers  turn briefs into client-ready visuals — while keeping your studio's visual signature intact.
            </motion.p>

            <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.2 }}
            className="mt-10 md:mt-14 flex flex-col gap-3">
            
              <a href="https://app.polvi.ai/auth?mode=signup" className="linky inline-flex items-baseline gap-3 serif text-[22px] md:text-[26px] ital"
            style={{ letterSpacing: '-0.02em', color: 'var(--gold)' }}>
                <span>Try Polvi</span>
                <span className="arrow">→</span>
              </a>
              <span className="label mute-2">For studios currently in beta.</span>
            </motion.div>
          </div>

          {/* Media column (desktop) */}
          <div className="hidden md:block md:col-span-5 lg:col-span-5 relative">
            <div className="absolute -top-[14vh] right-[-6vw] w-[52vw] max-w-[820px] aspect-[4/5]">
              <HeroMedia />
              {/* ticker strip below */}
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2.4 }}
              className="absolute -bottom-10 left-6 right-6 flex items-center justify-between label">
              
                <span>· Live canvas</span>
                <span className="mute-2">36°N 2°W / interior · pavilion</span>
              </motion.div>
            </div>
          </div>

          {/* Mobile media */}
          <div className="md:hidden col-span-12 mt-10">
            <div className="relative w-full aspect-[4/5] overflow-hidden">
              <HeroMedia />
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.6 }}
        className="absolute bottom-6 left-6 md:left-10 label z-10 flex items-center gap-3">
        
          <span className="inline-block w-10 h-px bg-[color:var(--mute-2)]" />
          <span>Scroll</span>
        </motion.div>

        {/* Bottom tick row */}
        <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2.5 }}
        className="absolute bottom-6 right-6 md:right-10 label mute-2 z-10">
        
          001 / Hero
        </motion.div>
      </section>);

}

/* ------------------------------------------------------------------ */
/*  SECTION HEADER — large serif sentence + number                      */
/* ------------------------------------------------------------------ */
function SectionHead({ n, kicker, sentence, body }) {
  return (
    <div className="grid grid-cols-12 gap-6 md:gap-10 mb-14 md:mb-20">
        <div className="col-span-12 md:col-span-5 fade-up">
          <div className="label mb-6"><span className="mute-2 mr-3">{n}</span>{kicker}</div>
          <h2 className="serif display text-[clamp(34px,5.6vw,84px)]" style={{ lineHeight: 1.02 }}>
            {sentence}
          </h2>
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-7 fade-up self-end">
          <p className="mute text-[16px] md:text-[18px] leading-[1.55] max-w-[58ch]">{body}</p>
        </div>
      </div>);

}

/* ------------------------------------------------------------------ */
/*  STYLE DNA MOCK                                                     */
/* ------------------------------------------------------------------ */
function StyleDNAMock() {
  const ref = useRef(null);
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        // animate fill 0 -> 1
        let start = performance.now();
        const DUR = 2200;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / DUR);
          setFilled(t);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const refs = [
  resources.r_viz_01_png, resources.r_viz_02_png, resources.r_viz_03_png,
  resources.r_viz_04_png, resources.r_viz_05_png, resources.r_viz_06_jpg,
  resources.r_viz_07_jpg, resources.r_viz_08_png, resources.r_viz_09_png,
  resources.r_viz_10_png, resources.r_viz_11_png, resources.r_viz_12_png];

  const count = Math.round(filled * refs.length);
  const strengthLabel = filled < 0.15 ? 'Dormant' :
  filled < 0.45 ? 'Forming' :
  filled < 0.8 ? 'Coherent' :
  'Signature';

  return (
    <div ref={ref} className="chipcard rounded-sm overflow-hidden">
        {/* window bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b hairline">
          <div className="flex items-center gap-3">
            <span className="dot" style={{ background: 'var(--gold)' }} />
            <span className="serif text-[15px]">Style 01 — <span className="mute">Nocturne, stone &amp; olive</span></span>
          </div>
          <div className="label mute-2">polvi · style dna</div>
        </div>

        {/* grid of refs */}
        <div className="p-5">
          <div className="label mb-3 flex items-center justify-between">
            <span>References</span>
            <span className="mute-2">{count} / {refs.length}</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {refs.map((src, i) =>
          <div key={i}
          className="aspect-[4/5] overflow-hidden bg-[#141415] relative">
                <img src={src} alt="" loading="lazy"
            className="w-full h-full object-cover transition-all duration-700"
            style={{
              opacity: i < count ? 1 : 0.0,
              filter: i < count ? 'grayscale(0)' : 'grayscale(1)',
              transform: i < count ? 'scale(1)' : 'scale(1.06)'
            }} />
                {i >= count && <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, rgba(245,245,244,0.03) 0 1px, transparent 1px 6px)' }} />}
              </div>
          )}
          </div>
        </div>

        {/* strength meter */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between mb-2">
            <span className="label">Style strength</span>
            <span className="serif text-[18px]">{strengthLabel}</span>
          </div>
          <div className="meter-bg h-[3px] w-full overflow-hidden">
            <div className="meter-fg h-full" style={{ width: `${Math.round(filled * 100)}%`, transition: 'width .08s linear' }} />
          </div>
          <div className="grid grid-cols-4 mt-2 label mute-2">
            <span>Dormant</span>
            <span>Forming</span>
            <span>Coherent</span>
            <span className="text-right">Signature</span>
          </div>
        </div>

        {/* extracted tokens */}
        <div className="grid grid-cols-12 border-t hairline">
          <div className="col-span-4 p-5 border-r hairline">
            <div className="label mb-3">Palette</div>
            <div className="flex gap-1">
              {['#1A1613', '#3A2E25', '#7A5F48', '#C9A36A', '#E7DCC6', '#F2ECE0'].map((c) =>
            <span key={c} className="w-6 h-6" style={{ background: c }} />
            )}
            </div>
          </div>
          <div className="col-span-4 p-5 border-r hairline">
            <div className="label mb-3">Materials</div>
            <div className="serif text-[15px] leading-snug">limestone · travertine · cream linen · olive oak</div>
          </div>
          <div className="col-span-4 p-5">
            <div className="label mb-3">Proportion</div>
            <div className="serif text-[15px] leading-snug">low horizon · arched apertures · 1.6× ceilings</div>
          </div>
        </div>
      </div>);

}

/* ------------------------------------------------------------------ */
/*  CONCEPT PACK FLOW — six stages                                     */
/* ------------------------------------------------------------------ */
function FlowMock() {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = performance.now();
        const DUR = 2400;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / DUR);
          setProgress(t);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const stages = [
  { n: '01', title: 'Brief', sub: 'Intent, site, voice', img: resources.r_cp_01_brief_png },
  { n: '02', title: 'References', sub: 'Visual research board', img: resources.r_cp_02_references_png },
  { n: '03', title: 'Concept', sub: 'Direction & materials', img: resources.r_cp_03_concept_png },
  { n: '04', title: 'Visuals', sub: 'Hero renders', img: resources.r_cp_04_visuals_png },
  { n: '05', title: 'Diagrams', sub: 'Plans, sections, flows', img: resources.r_cp_05_diagrams_png },
  { n: '06', title: 'Client PDF', sub: 'Branded deliverable', img: resources.r_cp_06_clientpdf_png }];


  const activeIdx = Math.min(stages.length - 1, Math.floor(progress * (stages.length + 0.2)));

  return (
    <div ref={ref} className="chipcard rounded-sm overflow-hidden">
        {/* title bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b hairline">
          <div className="flex items-center gap-3">
            <span className="serif text-[15px]">Villa Étoile — Concept Pack</span>
            <span className="label mute-2">Bordeaux · 2026</span>
          </div>
          <div className="label mute-2">six stages · one flow</div>
        </div>

        {/* stages */}
        <div className="relative px-6 md:px-8 py-10 md:py-14">
          {/* horizontal line */}
          <div className="absolute left-6 md:left-8 right-6 md:right-8 top-[58%] h-px" style={{ background: 'var(--line)' }} />
          {/* gold progress line */}
          <div
          className="absolute top-[58%] h-[2px] -translate-y-px"
          style={{
            left: 'clamp(24px, 6.5%, 48px)',
            width: `calc(${progress * 87}% )`,
            background: 'linear-gradient(90deg, var(--gold-2), var(--gold))',
            transition: 'width .08s linear'
          }} />
        

          <div className="grid grid-cols-6 gap-3 md:gap-6">
            {stages.map((s, i) =>
          <div key={s.n} className="flex flex-col items-center gap-4">
                {/* thumb or placeholder */}
                <div className={`w-full aspect-[4/5] overflow-hidden bg-[#141415] transition-all duration-700`}
            style={{ opacity: i <= activeIdx ? 1 : 0.35, filter: i <= activeIdx ? 'none' : 'grayscale(1)' }}>
                  {s.img ?
              <img src={s.img} alt="" className="w-full h-full object-cover" loading="lazy" /> :

              <div className="w-full h-full flex items-center justify-center">
                      <div className="serif text-[34px] mute-2">{s.title[0]}</div>
                    </div>
              }
                </div>

                <div className={`flow-dot ${i <= activeIdx ? 'active' : ''}`} />

                <div className="text-center">
                  <div className="serif text-[16px]">{s.n} · {s.title}</div>
                  <div className="label mute-2 mt-1 hidden md:block">{s.sub}</div>
                </div>
              </div>
          )}
          </div>
        </div>

        {/* footer row */}
        <div className="grid grid-cols-3 border-t hairline">
          <div className="p-5 border-r hairline">
            <div className="label mb-2">Time to first concept</div>
            <div className="serif text-[22px]">14 min</div>
          </div>
          <div className="p-5 border-r hairline">
            <div className="label mb-2">Tools replaced</div>
            <div className="serif text-[22px]">MJ · PS · InDesign</div>
          </div>
          <div className="p-5">
            <div className="label mb-2">Deliverable</div>
            <div className="serif text-[22px]">Client PDF</div>
          </div>
        </div>
      </div>);

}

/* ------------------------------------------------------------------ */
/*  CANVAS MOCK — iteration graph                                      */
/* ------------------------------------------------------------------ */
function CanvasMock() {
  const ref = useRef(null);
  const [scrollProg, setScrollProg] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
      setScrollProg(t);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // parallax offset
  const p = (factor) => `translate3d(0, ${(scrollProg - 0.5) * factor * 40}px, 0)`;

  // Node positions (percent)
  const nodes = [
  { id: 'A', x: 6, y: 16, w: 22, img: resources.r_sketch_png, label: 'Sketch', tag: 'v1 · hand' },
  { id: 'B', x: 34, y: 8, w: 26, img: resources.r_render_png, label: 'Render', tag: 'v2 · style 01' },
  { id: 'C', x: 66, y: 22, w: 26, img: resources.r_villa_png, label: 'Variant', tag: 'v3 · evening' },
  { id: 'D', x: 40, y: 58, w: 24, img: resources.r_canvas_diagrams_png, label: 'Variant', tag: 'v4 · dawn' },
  { id: 'E', x: 72, y: 64, w: 22, img: resources.r_canvas_clientpdf_png, label: 'Final', tag: 'selected', final: true }];


  // Edges (pairs) referenced by id
  const edges = [
  ['A', 'B'], ['B', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'E']];

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const centerOf = (n) => ({ cx: n.x + n.w / 2, cy: n.y + n.w * 1.25 / 2 });

  return (
    <div ref={ref} className="chipcard rounded-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b hairline">
          <div className="flex items-center gap-3">
            <span className="serif text-[15px]">Canvas — <span className="mute">Villa Étoile</span></span>
          </div>
          <div className="label mute-2">5 nodes · 5 edges · 1 selected</div>
        </div>

        <div className="relative w-full" style={{ aspectRatio: '16/9', background: 'radial-gradient(100% 80% at 40% 30%, rgba(255,255,255,0.02), transparent 70%)' }}>
          {/* grid */}
          <div className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
          'linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(70% 70% at 50% 50%, #000, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 70% at 50% 50%, #000, transparent)'
        }} />
        

          {/* edges */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 56" preserveAspectRatio="none">
            {edges.map(([a, b], i) => {
            const A = byId[a],B = byId[b];
            const ca = centerOf(A),cb = centerOf(B);
            // aspect-ratio adjust: y coords are on a 0..100 scale too; with 16/9 it's 56.25 → use 56
            const cy1 = ca.cy * 0.56,cy2 = cb.cy * 0.56;
            return (
              <path
                key={i}
                d={`M ${ca.cx} ${cy1} C ${(ca.cx + cb.cx) / 2} ${cy1}, ${(ca.cx + cb.cx) / 2} ${cy2}, ${cb.cx} ${cy2}`}
                stroke="rgba(201,163,106,0.55)" strokeWidth="0.18" fill="none" strokeDasharray="0.6 0.6" />);


          })}
          </svg>

          {/* nodes */}
          {nodes.map((n, i) =>
        <div key={n.id}
        className="absolute node overflow-hidden"
        style={{
          left: `${n.x}%`, top: `${n.y}%`, width: `${n.w}%`,
          transform: p(i % 2 === 0 ? 0.6 : -0.4),
          outline: n.final ? '1px solid var(--gold)' : 'none',
          boxShadow: n.final ? '0 0 0 4px rgba(201,163,106,0.12)' : 'none'
        }}>
              <div className="aspect-[4/5] overflow-hidden">
                <img src={n.img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between border-t hairline">
                <span className="serif text-[12px]">{n.label}</span>
                <span className="label mute-2" style={{ fontSize: 10 }}>{n.tag}</span>
              </div>
            </div>
        )}

          {/* floating tool chip */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 label">
            <span className="dot" />
            <span>Canvas · drag to iterate</span>
          </div>
          <div className="absolute bottom-4 right-4 label mute-2">scroll for parallax</div>
        </div>
      </div>);

}

/* ------------------------------------------------------------------ */
/*  FEATURE SECTIONS                                                   */
/* ------------------------------------------------------------------ */
function FeatureSections() {
  return (
    <>
        {/* 01 — Train your style */}
        <section className="relative max-w-[1440px] mx-auto px-6 md:px-10 pt-[20vh] pb-[18vh]">
          <SectionHead
          n="02"
          kicker="Style DNA"
          sentence={<>Train your <span className="ital gold">style</span> once.</>}
          body="Upload the references that define your taste. Polvi learns the palette, the proportions, the restraint - and carries them into every generation. Your style, applied consistently across every project." />
        
          <div className="fade-up">
            <StyleDNAMock />
          </div>
        </section>

        {/* 02 — Concept to client */}
        <section className="relative max-w-[1440px] mx-auto px-6 md:px-10 pt-[18vh] pb-[18vh]">
          <SectionHead
          n="03"
          kicker="Concept Pack"
          sentence={<>Concept to client in <span className="ital gold">one flow.</span></>}
          body="From project brief to client-ready PDF, in a single workflow. Six stages - each editable, each your decision. No more stitching together Midjourney, Photoshop, InDesign, and prayer." />
        
          <div className="fade-up">
            <FlowMock />
          </div>
        </section>

        {/* 03 — Iterate like you think */}
        <section className="relative max-w-[1440px] mx-auto px-6 md:px-10 pt-[18vh] pb-[20vh]">
          <SectionHead
          n="04"
          kicker="Canvas"
          sentence={<>Iterate like you <span className="ital gold">think.</span></>}
          body="The canvas where sketches become renders, renders become variations, and variations become the shot you're actually going to show. Non-linear, visual, and as fast as your attention." />
        
          <div className="fade-up">
            <CanvasMock />
          </div>
        </section>
      </>);

}

/* ------------------------------------------------------------------ */
/*  PRICING                                                            */
/* ------------------------------------------------------------------ */
function Pricing() {
  const tiers = [
  {
    name: 'Basic',
    tag: 'IDEAL FOR STUDENTS',
    for: 'For students and first-year academic projects',
    price: '€9',
    per: '/ month',
    features: [
    'Unlimited generations at 1K resolution',
    '1 Style DNA',
    'Gallery and Canvas access',
    'Academic-use license',
    'Polvi watermark on exports'],

    cta: 'Get started',
    href: '#access',
    highlight: false
  },
  {
    name: 'Pro',
    tag: 'MOST POPULAR',
    for: 'For independent architects and interior designers',
    price: '€15',
    per: '/ month',
    features: [
    'Everything in Basic',
    'Unlimited 2K, 500 × 4K generations',
    'Commercial license',
    'Concept Pack included',
    'No watermark',
    'Email support'],

    cta: 'Start 7-day trial',
    href: '#access',
    highlight: true
  },
  {
    name: 'Studio',
    for: 'For small studios and design practices',
    price: '€59',
    per: '/ month',
    features: [
    'Everything in Pro',
    'Up to 5 team seats',
    '5 Style DNAs (per designer or per project)',
    'Shared project library',
    'Priority generation queue',
    'Team-wide Concept Pack templates'],

    cta: 'Start 7-day trial',
    href: '#access',
    highlight: false
  },
  {
    name: 'Custom',
    for: 'For established firms and larger teams',
    price: 'Custom',
    per: 'pricing',
    features: [
    'Everything in Studio',
    'Unlimited seats and Style DNAs',
    'Custom model fine-tuning on your portfolio',
    'Dedicated onboarding',
    'SSO, admin controls, invoicing',
    'White-glove support'],

    cta: 'Contact sales',
    href: '#access',
    highlight: false
  }];

  return (
    <section id="pricing" className="relative max-w-[1440px] mx-auto px-6 md:px-10 pt-[18vh] pb-[16vh]">
        <div className="grid grid-cols-12 gap-6 md:gap-10 mb-14 md:mb-20">
          <div className="col-span-12 md:col-span-8 fade-up">
            <div className="label mb-6"><span className="mute-2 mr-3">05</span>Pricing</div>
            <h2 className="serif display text-[clamp(34px,5.2vw,76px)]" style={{ lineHeight: 1.02 }}>
              Pricing built for how studios <span className="ital gold">actually work.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-4 md:col-start-9 self-end fade-up">
            <p className="mute text-[15px] md:text-[16px] leading-[1.55] max-w-[40ch]">
              From first-year students to established practices — start where you are.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[900px]:grid-cols-4 gap-5 md:gap-6 fade-up items-stretch">
          {tiers.map((t) =>
        <div key={t.name}
        className="pricing-card relative flex flex-col p-8"
        style={{
          background: '#141416',
          border: t.highlight ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: t.highlight ?
          '0 0 40px rgba(201,163,106,0.15), inset 0 1px 0 rgba(201,163,106,0.12)' :
          'none',
          transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease'
        }}>
              {t.tag &&
          <div className="mb-5 label" style={{ color: 'var(--gold)', letterSpacing: '0.22em' }}>
                  {t.tag}
                </div>
          }
              {!t.tag && <div className="mb-5 label mute-2" style={{ letterSpacing: '0.22em' }}>—</div>}

              <div className="label label-ink" style={{ fontSize: 12, letterSpacing: '0.24em' }}>— {t.name.toUpperCase()} —</div>

              <div className="mute mt-4 text-[13px] leading-[1.5] max-w-[30ch] min-h-[40px]">{t.for}</div>

              <div className="mt-8 flex items-baseline gap-2 border-b hairline pb-8">
                <span className="serif display" style={{ fontSize: 'clamp(40px,3.6vw,56px)', lineHeight: 1, letterSpacing: '-0.03em' }}>{t.price}</span>
                <span className="mute text-[13px]">{t.per}</span>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                {t.features.map((f, i) =>
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.45] mute">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 mt-[5px]">
                      <path d="M1.5 5.3L4 7.5L8.5 2.5" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
            )}
              </ul>

              <div className="mt-auto pt-10">
                {t.highlight ?
            <a href={t.href}
            className="block w-full text-center py-3.5 text-[14px]"
            style={{ background: 'var(--gold)', color: '#0A0A0B', letterSpacing: '-0.005em', fontWeight: 500 }}>
                    {t.cta} →
                  </a> :

            <a href={t.href} className="linky inline-flex items-baseline gap-2 text-[14px]"
            style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    <span>{t.cta}</span> <span className="arrow gold">→</span>
                  </a>
            }
              </div>
            </div>
        )}
        </div>

        <div className="label mute-2 mt-10 text-center fade-up">
          All paid plans billed monthly or annually (2 months free). Cancel anytime.
        </div>
      </section>);

}

/* ------------------------------------------------------------------ */
/*  QUICK TOOLS                                                        */
/* ------------------------------------------------------------------ */
function QuickTools() {
  const imgs = [
  resources.r_interior_1_png, resources.r_interior_2_png, resources.r_interior_3_jpg,
  resources.r_lobby_png, resources.r_villa_png, resources.r_pavilion_jpg,
  resources.r_exterior_jpg, resources.r_render_png, resources.r_work_png,
  resources.r_sketch_to_visual_png, resources.r_sketch_png, resources.r_interior_2_png];

  const sketch = resources.r_sketch_png;
  const render = resources.r_render_png;

  const tools = [
  { n: 'Sketch → Visual', d: 'Turn rough sketches into photoreal renders.', in: sketch, out: resources.r_render_png },
  { n: 'Reference → Visual', d: 'Generate new designs from a reference image.', in: resources.r_interior_3_jpg, out: resources.r_interior_1_png },
  { n: 'Plan → Visual', d: 'Convert floor plans into 3D interior visuals.', in: resources.r_sketch_to_visual_png, out: resources.r_interior_2_png },
  { n: 'Image Variations', d: 'Multiple style variations of any image.', in: resources.r_villa_png, out: resources.r_exterior_jpg },
  { n: 'Different Angles', d: 'Alternative perspectives of your design.', in: resources.r_pavilion_jpg, out: resources.r_villa_png },
  { n: 'Lighting & Mood', d: 'Explore different lighting scenarios.', in: resources.r_lobby_png, out: resources.r_interior_3_jpg },
  { n: 'Axonometric View', d: 'Generate isometric or axonometric projections.', in: resources.r_render_png, out: resources.r_sketch_png },
  { n: 'Image → Elevation', d: 'Convert any image into a flat elevation drawing.', in: resources.r_exterior_jpg, out: resources.r_sketch_to_visual_png },
  { n: 'Exploded View', d: 'Turn any image into an exploded axonometric.', in: resources.r_villa_png, out: resources.r_sketch_png },
  { n: 'Moodboard → Visual', d: 'Translate a curated moodboard into a cohesive visualization.', in: resources.r_work_png, out: resources.r_interior_1_png },
  { n: 'Upscale & Enhance', d: 'Increase resolution and enhance detail.', in: resources.r_interior_2_png, out: resources.r_lobby_png },
  { n: 'Render → Line Drawing', d: 'Convert rendered visuals into clean architectural line drawings.', in: resources.r_render_png, out: resources.r_sketch_png }];


  return (
    <section id="quick-tools" className="relative max-w-[1440px] mx-auto px-6 md:px-10 pt-[18vh] pb-[18vh]">
        <div className="grid grid-cols-12 gap-6 md:gap-10 mb-14 md:mb-20">
          <div className="col-span-12 md:col-span-7 fade-up">
            <div className="label mb-6"><span className="mute-2 mr-3">05b</span>Quick Tools</div>
            <h2 className="serif display text-[clamp(34px,5.6vw,84px)]" style={{ lineHeight: 1.02 }}>
              Or just <span className="ital gold">sprint.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 md:col-start-8 self-end fade-up">
            <p className="mute text-[15px] md:text-[17px] leading-[1.55] max-w-[46ch]">
              Twelve focused tools for quick actions — when you don't need the full workflow, just the output.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 fade-up">
          {tools.map((t, i) =>
        <div key={i} className="tool-card p-5 flex flex-col"
        style={{
          background: '#141416',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12
        }}>
              <div className="relative grid grid-cols-2 gap-0 overflow-hidden" style={{ borderRadius: 8 }}>
                <div className="relative aspect-[4/3] overflow-hidden bg-[#0F0F10]">
                  <img src={t.in} alt="" loading="lazy" className="w-full h-full object-cover" style={{ filter: 'grayscale(0.2) brightness(0.85)' }} />
                  <span className="absolute top-2 left-2 label" style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.22em', background: 'rgba(10,10,11,0.55)', padding: '2px 6px' }}>IN</span>
                </div>
                <div className="relative aspect-[4/3] overflow-hidden bg-[#0F0F10]">
                  <img src={t.out} alt="" loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 label" style={{ color: 'var(--gold)', fontSize: 9, letterSpacing: '0.22em', background: 'rgba(10,10,11,0.55)', padding: '2px 6px' }}>OUT</span>
                </div>
                {/* gold arrow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(10,10,11,0.85)', border: '1px solid var(--gold)' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5h8M6 2l3 3-3 3" stroke="var(--gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
              <div className="mt-4 text-[14px]" style={{ fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.005em' }}>
                {t.n}
              </div>
              <div className="mute text-[12.5px] leading-[1.5] mt-1.5">
                {t.d}
              </div>
            </div>
        )}
        </div>

        <div className="label mute-2 mt-10 text-center fade-up">
          Available on all paid plans. Students get a curated selection.
        </div>
      </section>);

}

/* ------------------------------------------------------------------ */
/*  GALLERY MARQUEE                                                    */
/* ------------------------------------------------------------------ */
function Gallery() {
  const imgs = [
  resources.r_vis_01_png, resources.r_vis_02_png, resources.r_vis_03_png,
  resources.r_vis_04_png, resources.r_vis_05_png, resources.r_vis_06_png,
  resources.r_vis_07_png, resources.r_vis_08_png, resources.r_vis_09_png, resources.r_vis_10_png];

  const doubled = [...imgs, ...imgs];
  return (
    <section className="relative py-[14vh]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 mb-10 flex items-baseline justify-between fade-up">
          <span className="serif ital text-[22px] md:text-[28px]">Made with Polvi.</span>
          <span className="label mute-2">10 recent · studios in beta</span>
        </div>
        <div className="marquee mask-marquee overflow-hidden">
          <div className="marquee-track flex gap-4 w-max">
            {doubled.map((src, i) =>
          <div key={i} className="shrink-0 w-[360px] md:w-[480px] aspect-[4/5] overflow-hidden rounded-[8px] bg-[#141415]">
                <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
          )}
          </div>
        </div>
      </section>);

}

/* ------------------------------------------------------------------ */
/*  CLOSING / REQUEST ACCESS                                           */
/* ------------------------------------------------------------------ */
function Closing() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {setErr('Please enter a valid email.');return;}
    setErr('');setSent(true);
  };

  return (
    <section id="access" className="relative">
        <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-[22vh] text-center">
          <div className="label mb-8 fade-up"><span className="mute-2 mr-3">05</span> TRY POLVI</div>

          <h2 className="serif display fade-up" style={{ fontSize: 'clamp(38px,7.5vw,112px)', lineHeight: 1.0 }}>
            Work that looks like <span className="ital gold">yours.</span>
          </h2>

          <p className="mute mt-8 max-w-[56ch] mx-auto fade-up">
            Polvi- Your work, redefined.
          </p>

          <form onSubmit={submit} className="mt-12 max-w-[520px] mx-auto fade-up">
            {!sent ?
          <>
                <div className="flex items-end gap-4">
                  <input
                type="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)} />
              
                  <button type="submit" className="serif text-[18px] linky whitespace-nowrap"
              style={{ color: 'var(--gold)' }}>
                    Get access  <span className="arrow">→</span>
                  </button>
                </div>
                <div className="label mute-2 mt-3 text-left flex items-center justify-between">
                  <span>{err || 'One email. No forms. No pitch deck.'}</span>
                  <span>ONE EMAIL. NO FORMS.</span>
                </div>
              </> :

          <div className="text-left border-t hairline pt-6">
                <div className="serif text-[22px]">Noted.</div>
                <div className="mute mt-2 text-[15px] leading-[1.55]">
                  We'll be in touch when a seat opens in your studio's cohort.
                </div>
              </div>
          }
          </form>
        </div>
      </section>);

}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  const linkCls = "text-[13px] mute hover:text-[color:var(--gold)] transition-colors";
  return (
    <footer>
        <div style={{ background: '#141416' }} className="border-t hairline">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
              <div>
                <div className="label mb-5">Product</div>
                <ul className="flex flex-col gap-3">
                  <li><a href="#" className={linkCls}>Features</a></li>
                  <li><a href="#" className={linkCls}>Style DNA</a></li>
                  <li><a href="#" className={linkCls}>Concept Pack</a></li>
                  <li><a href="#" className={linkCls}>Canvas</a></li>
                  <li><a href="#quick-tools" className={linkCls}>Quick Tools</a></li>
                  <li><a href="#pricing" className={linkCls}>Pricing</a></li>
                  <li><a href="#" className={linkCls}>Changelog</a></li>
                </ul>
              </div>
              <div>
                <div className="label mb-5">Studio</div>
                <ul className="flex flex-col gap-3">
                  <li><a href="#" className={linkCls}>About</a></li>
                  <li><a href="#" className={linkCls}>Manifesto</a></li>
                  <li><a href="#" className={linkCls}>Customers</a></li>
                  <li><a href="#" className={linkCls}>Careers</a></li>
                  <li><a href="#" className={linkCls}>Press</a></li>
                </ul>
              </div>
              <div>
                <div className="label mb-5">Resources</div>
                <ul className="flex flex-col gap-3">
                  <li><a href="#" className={linkCls}>Documentation</a></li>
                  <li><a href="#" className={linkCls}>Prompt guide</a></li>
                  <li><a href="#" className={linkCls}>Community</a></li>
                  <li><a href="#" className={linkCls}>Contact</a></li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1 md:text-right">
                <div className="flex md:justify-end">
                  <Wordmark />
                </div>
                <p className="serif ital text-[15px] mute mt-4 md:ml-auto md:max-w-[28ch] leading-[1.4]">
                  The design platform for architects and designers  with a point of view.
                </p>
                <div className="flex md:justify-end gap-4 mt-6">
                  <a href="#" aria-label="Instagram" className="mute hover:text-[color:var(--gold)] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a href="#" aria-label="X / Twitter" className="mute hover:text-[color:var(--gold)] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.7 3H21l-7.3 8.35L22.2 21h-6.73l-5.27-6.62L4 21H.68l7.8-8.93L.4 3h6.9l4.76 6.04L17.7 3Zm-1.18 16h1.86L7.57 4.9H5.58L16.52 19Z" />
                    </svg>
                  </a>
                  <a href="#" aria-label="LinkedIn" className="mute hover:text-[color:var(--gold)] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S.02 4.88.02 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.5h4.52V23H.24V8.5zM8.1 8.5h4.33v2h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.43 3.02 5.43 6.95V23h-4.52v-6.88c0-1.64-.03-3.75-2.28-3.75-2.29 0-2.64 1.79-2.64 3.63V23H8.1V8.5z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t hairline" style={{ background: '#141416' }}>
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="label mute-2">© 2026 Polvi. Made for designers with taste.</div>
            <div className="flex items-center gap-6 label">
              <a href="#" className="hover:text-[color:var(--gold)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[color:var(--gold)] transition-colors">Terms</a>
              <a href="#" className="hover:text-[color:var(--gold)] transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>);

}

/* ------------------------------------------------------------------ */
/*  APP                                                                */
/* ------------------------------------------------------------------ */
function App() {
  useReveal();
  return (
    <div className="relative">
        <Nav />
        <Hero />
        <div className="rule max-w-[1440px] mx-auto" />
        <FeatureSections />
        <div className="rule max-w-[1440px] mx-auto" />
        <QuickTools />
        <div className="rule max-w-[1440px] mx-auto" />
        <Pricing />
        <div className="rule max-w-[1440px] mx-auto" />
        <Gallery />
        <div className="rule max-w-[1440px] mx-auto" />
        <Closing />
        <Footer />
      </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
