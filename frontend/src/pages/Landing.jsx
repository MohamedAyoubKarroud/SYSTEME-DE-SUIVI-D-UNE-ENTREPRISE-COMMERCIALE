import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { RoomEnvironment }    from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer }     from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }         from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }    from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }         from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import './Landing.css';

gsap.registerPlugin(ScrollTrigger);

/* Landing — public-facing intro for SSEC.

   Visuals stack:
     scene.environment (PMREM-prefiltered RoomEnvironment) → real reflections
     UnrealBloomPass via EffectComposer                    → soft highlight glow
     Lenis smooth scroll bridged to ScrollTrigger          → silky scrubbing

   Performance levers:
     - DPR capped (huge win on retina screens).
     - Postprocessing is disabled on narrow viewports + reduced-motion.
     - Single RAF (GSAP ticker) drives Lenis, the scene, and ScrollTrigger.
     - Full disposal on unmount → no leaked GPU contexts / scroll handlers.    */
export default function Landing() {
  const rootRef   = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const canvas = canvasRef.current;
    const root   = rootRef.current;
    if (!canvas || !root) return;

    const isNarrow  = window.innerWidth < 720;
    const usePost   = !isNarrow;            // bloom adds GPU cost — desktop only

    /* ---------- Renderer ---------- */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !usePost,                  // composer's own AA handles it when on
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;

    /* ---------- Scene + camera ---------- */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    /* ---------- Environment map (PMREM-prefiltered) ----------
       This is the single biggest visual upgrade. The metal surface now
       samples a real environment for reflections instead of relying on
       the three direct lights. RoomEnvironment is bundled and free.
       To swap in a real .hdr: use RGBELoader → pmrem.fromEquirectangular(). */
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    /* ---------- Lighting (still useful for shadows + the colored accent) */
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(4, 6, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.radius = 6;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x66ccff, 8, 20);
    pointLight.position.set(-3, -2, 3);
    scene.add(pointLight);

    /* ---------- Hero object ---------- */
    const geometry = new THREE.TorusKnotGeometry(1, 0.32, 220, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      metalness: 1.0,
      roughness: 0.12,
      envMapIntensity: 1.4,
      transparent: true,
    });
    const hero = new THREE.Mesh(geometry, material);
    hero.castShadow = hero.receiveShadow = true;
    scene.add(hero);

    /* ---------- Postprocessing (bloom) ---------- */
    let composer = null, bloomPass = null;
    if (usePost) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      composer.setSize(window.innerWidth, window.innerHeight);
      composer.addPass(new RenderPass(scene, camera));
      // (strength, radius, threshold). Higher threshold = only very bright
      // specular tips bloom — keeps text crisp around the object.
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.28, 0.55, 0.92
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    /* ---------- Resize ---------- */
    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const w = window.innerWidth, h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        if (composer) {
          composer.setSize(w, h);
          composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        }
        ScrollTrigger.refresh();
      });
    };
    window.addEventListener('resize', onResize);

    /* ---------- Pause when tab hidden ---------- */
    let running = true;
    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) clock.getDelta();
    };
    document.addEventListener('visibilitychange', onVisibility);

    /* ---------- Mouse parallax (super cheap + alive feeling) ----------
       gsap.quickTo gives us framerate-independent lerp without per-frame
       allocation; we just steer a target X/Y and the values catch up.     */
    const mouseTarget = { x: 0, y: 0 };
    const setRotX = gsap.quickTo(hero.rotation, 'x', { duration: 0.6, ease: 'power3' });
    const setRotY = gsap.quickTo(hero.rotation, 'y', { duration: 0.6, ease: 'power3' });
    const onMouseMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouseTarget.x = ny * 0.15;
      mouseTarget.y = nx * 0.25;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    /* ---------- Lenis smooth scroll bridged into GSAP ---------- */
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),  // expo-out
    });
    lenis.on('scroll', ScrollTrigger.update);

    /* ---------- Render loop (single source of truth) ----------
       Composed rotation:
         scrollRot — driven by GSAP/ScrollTrigger timeline
         idle      — slow constant spin (so Section 1 isn't static)
         mouse     — parallax (additive offset)                          */
    const scrollRot = { x: 0, y: 0, z: 0 };
    const idle = { y: 0 };
    const clock = new THREE.Clock();

    const onTick = (time) => {
      lenis.raf(time * 1000);              // Lenis owns scroll position
      if (!running) return;
      const dt = clock.getDelta();
      idle.y += dt * 0.25;
      hero.rotation.x = scrollRot.x + mouseTarget.x;
      hero.rotation.y = scrollRot.y + idle.y + mouseTarget.y;
      hero.rotation.z = scrollRot.z;
      (composer ?? renderer).render(scene, camera);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);            // recommended with Lenis

    /* ---------- Scroll timeline ---------- */
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '.landing-main',
          start: 'top top',
          end:   'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });

      tl.addLabel('s1', 0).addLabel('s2', 1).addLabel('s3', 2);

      /* Section 1 → 2 : scale up, slide left, rotate */
      tl.to(hero.scale,    { x: 1.6, y: 1.6, z: 1.6, duration: 1, ease: 'power1.inOut' }, 's1')
        .to(hero.position, { x: -1.4,                duration: 1, ease: 'power1.inOut' }, 's1')
        .to(scrollRot,     { y: Math.PI * 1.5, x: Math.PI * 0.3, duration: 1, ease: 'none' }, 's1');

      /* Section 2 → 3 : recolour, soften, recenter, new axis */
      tl.to(material.color, { r: 0.42, g: 0.7, b: 1.0, duration: 1, ease: 'power1.inOut' }, 's2')
        .to(material,       { roughness: 0.4, metalness: 0.75, envMapIntensity: 1.0, duration: 1, ease: 'power1.inOut' }, 's2')
        .to(hero.position,  { x: 0,                            duration: 1, ease: 'power1.inOut' }, 's2')
        .to(scrollRot,      { z: Math.PI, x: Math.PI * 0.8,    duration: 1, ease: 'none' }, 's2');

      /* Section 3 → 4 : zoom into camera, fade out */
      tl.to(hero.position, { z: 4,             duration: 1, ease: 'power2.in' }, 's3')
        .to(hero.scale,    { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.in' }, 's3')
        .to(material,      { opacity: 0,       duration: 1, ease: 'power1.in' }, 's3');

      /* Headline reveal per section — clipped Y-shift on entry */
      root.querySelectorAll('.landing-section h1, .landing-section h2').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' },
          y: 40, opacity: 0, duration: 1.2, ease: 'power3.out',
        });
      });
      root.querySelectorAll('.landing-section p').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
          y: 24, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.1,
        });
      });

      /* Nav-dot active state */
      const dots = root.querySelectorAll('.landing-dots span');
      root.querySelectorAll('.landing-section').forEach((sec, i) => {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top center',
          end:   'bottom center',
          onToggle: ({ isActive }) => dots[i]?.classList.toggle('is-active', isActive),
        });
      });
    }, root);

    /* ---------- Cleanup ---------- */
    return () => {
      gsap.ticker.remove(onTick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('visibilitychange', onVisibility);
      cancelAnimationFrame(resizeFrame);
      lenis.destroy();
      ctx.revert();
      bloomPass?.dispose?.();
      pmrem.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      scene.environment = null;
      scene.clear();
    };
  }, []);

  return (
    <div className="landing-root" ref={rootRef}>
      <canvas className="landing-canvas" ref={canvasRef} aria-hidden="true" />
      <div className="landing-grain" aria-hidden="true" />

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark">SS</span>
          SSEC
        </div>
        <Link to="/login" className="landing-cta">Se connecter</Link>
      </header>

      <nav className="landing-dots" aria-hidden="true">
        <span /><span /><span /><span />
      </nav>

      <main className="landing-main">
        <section className="landing-section landing-section--left">
          <div className="landing-eyebrow">SSEC · 01</div>
          <h1>Le suivi de votre entreprise, <em>en mouvement</em>.</h1>
          <p>
            Une plateforme moderne pour piloter vos commandes, clients et
            équipes — en temps réel, depuis un seul espace.
          </p>
          <div className="actions">
            <Link to="/login" className="landing-btn-primary">
              Commencer
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="landing-section landing-section--right">
          <div className="landing-eyebrow">Fonctionnalités · 02</div>
          <h2>Conçu pour la précision.</h2>
          <p>
            Tableaux de bord par rôle, statistiques en direct, et alertes
            de stock — chaque détail est pensé pour faire gagner du temps
            aux équipes Direction, Employé et Admin&nbsp;IT.
          </p>
        </section>

        <section className="landing-section landing-section--center">
          <div className="landing-eyebrow">Sécurité · 03</div>
          <h2>Auth JWT, rôles cloisonnés.</h2>
          <p>
            Tokens signés, sessions courtes, accès strictement délimités
            par rôle&nbsp;: chaque action passe par un contrôle serveur,
            aucune surface inutile exposée côté client.
          </p>
        </section>

        <section className="landing-section landing-section--center">
          <div className="landing-eyebrow">Démarrer · 04</div>
          <h2>Prêts&nbsp;? Connectez-vous.</h2>
          <p>Comptes de démonstration disponibles depuis l'écran de connexion.</p>
          <div className="actions">
            <Link to="/login" className="landing-btn-primary">
              Accéder à l'application
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}