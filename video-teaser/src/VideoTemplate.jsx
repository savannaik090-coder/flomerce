import { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCENE_DURATIONS = [3500, 4000, 4500, 4000, 4500];
const TOTAL_SCENES = SCENE_DURATIONS.length;

const logoUrl = `${import.meta.env.BASE_URL}assets/fluxe-logo.png`;
const techBgUrl = `${import.meta.env.BASE_URL}assets/tech-bg.png`;
const linesBgUrl = `${import.meta.env.BASE_URL}assets/glowing-lines.png`;

const ease = [0.16, 1, 0.3, 1];

export default function VideoTemplate() {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScene((prev) => (prev + 1) % TOTAL_SCENES);
    }, SCENE_DURATIONS[currentScene]);
    return () => clearTimeout(timer);
  }, [currentScene]);

  const s = currentScene;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white">
      <motion.div className="absolute inset-0 z-0"
        animate={{ scale: [1, 1.06, 1], rotate: [0, 0.4, -0.4, 0] }}
        transition={{ duration: 25, ease: "linear", repeat: Infinity }}>
        <img src={techBgUrl} alt="" className="w-full h-full object-cover opacity-20" />
      </motion.div>

      <motion.div className="absolute inset-0 z-0 mix-blend-screen"
        animate={{ opacity: s === 0 ? 0.08 : s === 4 ? 0.3 : 0.12, scale: s % 2 === 0 ? 1 : 1.02 }}
        transition={{ duration: 2, ease: "easeInOut" }}>
        <img src={linesBgUrl} alt="" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div className="absolute w-[50vw] h-[50vw] rounded-full blur-[180px] z-0"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.35), transparent 70%)' }}
        animate={{
          x: ['-5vw', '25vw', '55vw', '15vw', '35vw'][s],
          y: ['15vh', '-15vh', '25vh', '45vh', '5vh'][s],
          scale: [1.2, 0.8, 1.3, 1, 1.6][s],
        }}
        transition={{ duration: 1.6, ease }} />

      <motion.div className="absolute h-[2px] z-[5]"
        style={{ background: 'linear-gradient(90deg, transparent, #2563eb, transparent)' }}
        animate={{
          left: ['20%', '5%', '40%', '60%', '10%'][s],
          width: ['60%', '90%', '30%', '50%', '80%'][s],
          top: ['50%', '15%', '85%', '35%', '65%'][s],
          opacity: [0.3, 0.6, 0.2, 0.5, 0.4][s],
        }}
        transition={{ duration: 1, ease }} />

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="sync">
          {s === 0 && <Scene0 key="s0" />}
          {s === 1 && <Scene1 key="s1" />}
          {s === 2 && <Scene2 key="s2" />}
          {s === 3 && <Scene3 key="s3" />}
          {s === 4 && <Scene4 key="s4" />}
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
    </div>
  );
}

const Scene0 = forwardRef(function Scene0(_, ref) {
  return (
    <motion.div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease }}>
      <motion.div className="absolute" style={{ width: '30vw', height: '2px', background: 'linear-gradient(90deg, transparent, #2563eb, transparent)', top: '42%' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease, delay: 0.2 }} />
      <motion.div className="relative" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease, delay: 0.4 }}>
        <motion.div className="absolute -inset-20 blur-3xl opacity-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.6), transparent)' }}
          animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
        <img src={logoUrl} alt="Fluxe" className="w-[22vw] h-auto relative z-10" style={{ filter: 'brightness(0) invert(1)' }} />
      </motion.div>
      <motion.p className="mt-6 text-[1.2vw] tracking-[0.3em] uppercase text-white/40 font-medium"
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.2 }}>
        Automated Website Platform
      </motion.p>
    </motion.div>
  );
});

const Scene1 = forwardRef(function Scene1(_, ref) {
  return (
    <motion.div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center px-[10vw]"
      initial={{ opacity: 0, x: '5vw' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: '-5vh' }}
      transition={{ duration: 0.8, ease }}>
      <motion.h1 className="text-[6vw] font-display font-extrabold tracking-tight leading-[1.05] text-center"
        initial={{ opacity: 0, y: '3vh' }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.2 }}>
        {'Launch Your Website'.split('').map((c, i) => (
          <motion.span key={i} style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 40, rotateX: -30 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.4, ease, delay: 0.2 + i * 0.025 }}>
            {c === ' ' ? '\u00A0' : c}
          </motion.span>
        ))}
        <br />
        <span className="text-brand-accent">
          {'in minutes.'.split('').map((c, i) => (
            <motion.span key={i} style={{ display: 'inline-block' }}
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.7 + i * 0.03 }}>
              {c === ' ' ? '\u00A0' : c}
            </motion.span>
          ))}
        </span>
      </motion.h1>
      <motion.p className="mt-[3vh] text-[1.4vw] text-white/50 max-w-[50vw] text-center leading-relaxed"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.3 }}>
        A fully automated platform that builds, manages, and scales websites without manual work.
      </motion.p>
    </motion.div>
  );
});

const Scene2 = forwardRef(function Scene2(_, ref) {
  const steps = ["Choose Category", "Select Template", "Generate Store"];
  return (
    <motion.div ref={ref} className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8, ease }}>
      <div className="flex items-center gap-[4vw] px-[8vw]">
        <div className="w-[40%]">
          <motion.h2 className="text-[3.5vw] font-display font-extrabold mb-[3vh] leading-tight"
            initial={{ opacity: 0, x: '-3vw' }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}>
            Instant<br />Creation.
          </motion.h2>
          <div className="space-y-[2vh]">
            {steps.map((text, i) => (
              <motion.div key={text} className="flex items-center gap-[1vw] p-[1.2vw] rounded-xl"
                style={{ background: 'rgba(23,23,23,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, x: '-2vw' }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.2, duration: 0.5, ease }}>
                <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-brand-accent flex items-center justify-center font-bold text-[1.1vw]">{i + 1}</div>
                <span className="text-[1.3vw] font-medium">{text}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="w-[50%] relative">
          <motion.div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #171717, #000)', border: '1px solid rgba(255,255,255,0.1)' }}
            initial={{ opacity: 0, y: '5vh' }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 1 }}>
            <div className="h-[4vh] border-b border-white/10 flex items-center px-[1vw] gap-[0.4vw] bg-white/5">
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#ff5f57]" />
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#febc2e]" />
              <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-[#28c840]" />
              <div className="ml-[2vw] bg-white/10 text-white/40 text-[0.7vw] px-[1vw] py-[0.3vh] rounded-full flex items-center">
                <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-green-500 mr-[0.4vw]" />
                my-shop.fluxe.in
              </div>
            </div>
            <div className="p-[2vw]">
              <motion.div className="h-[1.5vw] w-[30%] bg-white/15 rounded mb-[1.5vh]"
                animate={{ width: ['30%', '45%', '30%'] }} transition={{ repeat: Infinity, duration: 3 }} />
              <div className="h-[0.6vw] w-full bg-white/5 rounded mb-[0.5vh]" />
              <div className="h-[0.6vw] w-[85%] bg-white/5 rounded mb-[2vh]" />
              <div className="grid grid-cols-2 gap-[1vw]">
                <motion.div className="h-[10vh] rounded-xl bg-brand-accent/20 border border-brand-accent/30"
                  initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.5 }} />
                <motion.div className="h-[10vh] rounded-xl bg-white/5 border border-white/10"
                  initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.6, duration: 0.5 }} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});

const Scene3 = forwardRef(function Scene3(_, ref) {
  const features = ["Jewellery & Fashion", "Product Catalogues", "Multiple Websites"];
  return (
    <motion.div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: '8vh' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease }}>
      <motion.div className="text-center mb-[4vh]"
        initial={{ opacity: 0, y: '2vh' }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}>
        <h2 className="text-[4vw] font-display font-extrabold mb-[1vh]">E-Commerce Ready</h2>
        <p className="text-[1.2vw] text-white/40 tracking-wider">Custom Subdomains &bull; Beautiful Storefronts</p>
      </motion.div>
      <div className="flex gap-[3vw] px-[8vw] w-full max-w-[80vw]">
        <motion.div className="flex-1 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #171717, #0a0a0a)', border: '1px solid rgba(255,255,255,0.08)' }}
          initial={{ opacity: 0, x: '-4vw' }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.4 }}>
          <div className="h-[4vh] bg-black/50 border-b border-white/10 flex items-center justify-center px-[1vw]">
            <div className="bg-white/10 text-white/40 text-[0.7vw] px-[1.5vw] py-[0.3vh] rounded-full flex items-center">
              <span className="w-[0.4vw] h-[0.4vw] rounded-full bg-green-500 mr-[0.4vw]" />
              brilliance.fluxe.in
            </div>
          </div>
          <div className="p-[1.5vw]">
            <div className="flex justify-between items-center mb-[2vh]">
              <div className="w-[5vw] h-[1vw] bg-white/20 rounded" />
              <div className="flex gap-[0.8vw]">
                <div className="w-[3vw] h-[0.6vw] bg-white/10 rounded" />
                <div className="w-[3vw] h-[0.6vw] bg-white/10 rounded" />
              </div>
            </div>
            <motion.div className="w-full h-[12vh] bg-gradient-to-br from-brand-accent/20 to-brand-accent/5 rounded-xl mb-[1.5vh]"
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="grid grid-cols-3 gap-[0.8vw]">
              {[1,2,3].map(i => (
                <motion.div key={i} className="h-[8vh] bg-white/5 rounded-lg"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.12, duration: 0.4 }} />
              ))}
            </div>
          </div>
        </motion.div>
        <div className="flex-1 flex flex-col justify-center gap-[2vh]">
          {features.map((text, i) => (
            <motion.div key={text} className="p-[1.5vw] rounded-xl"
              style={{ background: 'rgba(23,23,23,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(37,99,235,0.2)' }}
              initial={{ opacity: 0, x: '3vw' }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.15, duration: 0.5, ease }}>
              <h3 className="text-[1.3vw] font-semibold text-white">{text}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

const Scene4 = forwardRef(function Scene4(_, ref) {
  return (
    <motion.div ref={ref} className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 1, ease }}>
      <motion.div initial={{ y: '4vh', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }} className="mb-[3vh]">
        <img src={logoUrl} alt="Fluxe" className="w-[12vw] h-auto" style={{ filter: 'brightness(0) invert(1)' }} />
      </motion.div>
      <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease, delay: 0.7 }}>
        <h1 className="text-[8vw] font-display font-extrabold tracking-tighter leading-none"
          style={{ background: 'linear-gradient(135deg, #ffffff 0%, #2563eb 50%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          COMING SOON
        </h1>
      </motion.div>
      <motion.div className="mt-[4vh] flex gap-[1.5vw]"
        initial={{ opacity: 0, y: '2vh' }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.6 }}>
        {[{ name: 'Basic', accent: false }, { name: 'Premium', accent: true }, { name: 'Pro', accent: false }].map((plan, i) => (
          <motion.div key={plan.name} className="px-[2vw] py-[1vh] rounded-full"
            style={{
              background: plan.accent ? 'rgba(37,99,235,0.15)' : 'rgba(23,23,23,0.5)',
              backdropFilter: 'blur(12px)',
              border: plan.accent ? '1px solid rgba(37,99,235,0.4)' : '1px solid rgba(255,255,255,0.1)',
            }}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6 + i * 0.12, duration: 0.4, ease }}>
            <span className={`text-[1vw] font-medium tracking-wider uppercase ${plan.accent ? 'text-brand-accent' : 'text-white/50'}`}>
              {plan.name}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
});
