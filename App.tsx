
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZennEnvironment } from './components/ZennEnvironment';
import { ZennMode, MotionData, ZennState } from './types';
import { zennAI } from './services/geminiService';
import { Heart, Wind, Target, MessageCircle, Info } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<ZennState>({
    mode: ZennMode.ANXIETY,
    lastUpdate: Date.now(),
    isThinking: false,
    message: "I am here. Move with me."
  });

  const [motion, setMotion] = useState<MotionData>({
    speed: 0,
    erraticness: 0,
    symmetry: 1,
    position: { x: 0, y: 0 },
    openness: 1,
    tremor: 0,
    pressure: 0
  });

  const [showInfo, setShowInfo] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const posHistory = useRef<{x: number, y: number, t: number}[]>([]);
  const velocities = useRef<number[]>([]);
  const chatHistory = useRef<string[]>([]);
  const isPointerDown = useRef(false);

  const handlePointerDown = () => { isPointerDown.current = true; };
  const handlePointerUp = () => { isPointerDown.current = false; };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    const now = Date.now();
    
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // 1. Kinetic Analysis
    velocities.current.push(dist);
    if (velocities.current.length > 30) velocities.current.shift();
    
    const avgSpeed = velocities.current.reduce((a, b) => a + b, 0) / velocities.current.length;
    
    // 2. Tremor Analysis (High-frequency directional changes)
    posHistory.current.push({ x, y, t: now });
    if (posHistory.current.length > 15) posHistory.current.shift();
    
    let tremorScore = 0;
    if (posHistory.current.length > 5) {
      let totalJitter = 0;
      for (let i = 2; i < posHistory.current.length; i++) {
        const p1 = posHistory.current[i-2];
        const p2 = posHistory.current[i-1];
        const p3 = posHistory.current[i];
        
        // Calculate angle between vectors to find "jaggedness"
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        if (mag1 > 0.001 && mag2 > 0.001) {
          const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
          if (cosTheta < 0.5) totalJitter += (1 - cosTheta); 
        }
      }
      tremorScore = Math.min(totalJitter * 0.5, 1);
    }

    // 3. Nuance Mapping
    // Pressure is derived from speed + click state
    const pressure = Math.min((avgSpeed * 50) + (isPointerDown.current ? 0.4 : 0), 1);
    // Openness is linked to click state (clenched vs open) and movement breadth
    const openness = Math.min(Math.max((isPointerDown.current ? 0.3 : 0.8) + (avgSpeed * 2), 0), 1);

    setMotion(prev => ({
      position: { x, y },
      speed: Math.min(dist * 25, 1),
      erraticness: tremorScore, // In this model, erraticness is tremor
      tremor: tremorScore,
      pressure: pressure,
      openness: openness,
      symmetry: 1.0
    }));

    lastPos.current = { x, y };
  }, []);

  useEffect(() => {
    const aiGuidance = setInterval(async () => {
      if (state.isThinking) return;
      setState(prev => ({ ...prev, isThinking: true }));
      const response = await zennAI.analyzeMotionAndRespond(state.mode, motion, chatHistory.current);
      if (response) {
        setState(prev => ({ ...prev, message: response, isThinking: false }));
        chatHistory.current.push(response);
        if (chatHistory.current.length > 5) chatHistory.current.shift();
      } else {
        setState(prev => ({ ...prev, isThinking: false }));
      }
    }, 15000);
    return () => clearInterval(aiGuidance);
  }, [state.mode, motion, state.isThinking]);

  const setMode = (newMode: ZennMode) => {
    setState(prev => ({ ...prev, mode: newMode, message: getInitialMessage(newMode) }));
  };

  const getInitialMessage = (mode: ZennMode) => {
    switch (mode) {
      case ZennMode.ANXIETY: return "Slow your breath as you move.";
      case ZennMode.EXPRESSION: return "Let the energy flow outward.";
      case ZennMode.GROUNDING: return "Focus on the weight of your hand.";
      case ZennMode.REFLECTION: return "Notice the shifts in your movement.";
      default: return "I am here.";
    }
  };

  return (
    <div 
      className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center select-none cursor-crosshair"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <ZennEnvironment mode={state.mode} motion={motion} />

      <div className="absolute top-8 left-8 z-10 flex flex-col gap-2">
        <h1 className="text-2xl font-light tracking-widest text-white/80">MYZENN CORE</h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${state.isThinking ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500/50'}`} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {state.isThinking ? 'Reading Energy...' : 'Mirror Active'}
          </span>
        </div>
      </div>

      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-8 right-8 z-10 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      >
        <Info size={18} className="text-white/40" />
      </button>

      {showInfo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <div className="max-w-md bg-zinc-900/50 border border-white/10 p-10 rounded-[2rem] text-center">
            <h2 className="text-2xl font-light mb-6 tracking-tight">System Guidance</h2>
            <div className="space-y-4 text-zinc-400 text-sm leading-relaxed mb-8">
              <p><strong className="text-white/80 font-medium">Pressure:</strong> Move faster or hold the screen to increase weight.</p>
              <p><strong className="text-white/80 font-medium">Openness:</strong> Let your movements be wide and loose to relax the Core.</p>
              <p><strong className="text-white/80 font-medium">Tremor:</strong> The Core detects jitter—try to find a singular, smooth path.</p>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="px-10 py-4 bg-white text-black rounded-full font-medium hover:scale-105 transition-transform"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-1/2 -translate-y-1/2 w-full px-12 pointer-events-none flex flex-col items-center">
        <div className="max-w-xl text-center">
          <p className="text-xl md:text-3xl font-extralight tracking-tight text-white/80 transition-opacity duration-1000">
            {state.message}
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 z-10 flex gap-4 bg-white/5 backdrop-blur-3xl p-2 rounded-full border border-white/10">
        <ModeButton active={state.mode === ZennMode.ANXIETY} onClick={() => setMode(ZennMode.ANXIETY)} icon={<Wind size={18} />} label="Calm" />
        <ModeButton active={state.mode === ZennMode.EXPRESSION} onClick={() => setMode(ZennMode.EXPRESSION)} icon={<Heart size={18} />} label="Release" />
        <ModeButton active={state.mode === ZennMode.GROUNDING} onClick={() => setMode(ZennMode.GROUNDING)} icon={<Target size={18} />} label="Ground" />
        <ModeButton active={state.mode === ZennMode.REFLECTION} onClick={() => setMode(ZennMode.REFLECTION)} icon={<MessageCircle size={18} />} label="Reflect" />
      </div>

      <div className="absolute bottom-6 w-full px-10 flex justify-between items-center opacity-30 pointer-events-none text-[9px] tracking-[0.3em] uppercase">
        <div className="flex gap-6">
          <span>Tension: {Math.round((1-motion.openness) * 100)}%</span>
          <span>Tremor: {Math.round(motion.tremor * 100)}%</span>
          <span>Pressure: {Math.round(motion.pressure * 100)}%</span>
        </div>
        <div>
          {state.mode.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
};

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ModeButton: React.FC<ModeButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`
      flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-500
      ${active ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white/80'}
    `}
  >
    {icon}
    <span className="text-xs font-medium tracking-wide hidden sm:inline">{label}</span>
  </button>
);

export default App;
