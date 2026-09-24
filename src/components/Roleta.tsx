import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, Star, Coins, Trophy, X, AlertCircle } from 'lucide-react';
import { Usuario } from '../types';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';

interface RoletaProps {
  usuario: Usuario;
  onUpdateUser: (user: Usuario) => void;
  onClose: () => void;
}

const PREMIOS = [
  { nome: 'XP Extra', valor: 50, cor: 'bg-green-500', icon: Star },
  { nome: 'Moedas', valor: 50, cor: 'bg-yellow-500', icon: Coins },
  { nome: 'XP Extra', valor: 100, cor: 'bg-blue-500', icon: Star },
  { nome: 'Jackpot', valor: 500, cor: 'bg-orange-500', icon: Trophy },
  { nome: 'Tente Novamente', valor: 0, cor: 'bg-gray-500', icon: X },
  { nome: 'XP Extra', valor: 50, cor: 'bg-emerald-500', icon: Star },
  { nome: 'Moedas', valor: 50, cor: 'bg-amber-500', icon: Coins },
  { nome: 'XP Extra', valor: 100, cor: 'bg-indigo-500', icon: Star },
];

export const Roleta: React.FC<RoletaProps> = ({ usuario, onUpdateUser, onClose }) => {
  const [girando, setGirando] = useState(false);
  const [girosRestantes, setGirosRestantes] = useState(0);
  const [resultado, setResultado] = useState<any>(null);
  const [angulo, setAngulo] = useState(0);
  const [error, setError] = useState('');
  const { playSound } = useAudio();

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await axios.get(`/api/roleta/status/${usuario.id}`);
      setGirosRestantes(res.data.giros_restantes);
    };
    fetchStatus();
  }, [usuario.id]);

  const girar = async () => {
    if (girando || girosRestantes === 0) return;
    if (usuario.moedas < 10) {
      setError('Moedas insuficientes para girar! (Custo: 10 moedas)');
      playSound('erro');
      return;
    }

    setError('');
    setGirando(true);
    playSound('clique');

    const spins = 5;
    const randomAngle = Math.floor(Math.random() * 360);
    const totalAngle = angulo + (spins * 360) + randomAngle;
    setAngulo(totalAngle);

    setTimeout(async () => {
      try {
        const res = await axios.post('/api/roleta/girar', { userId: usuario.id });
        setResultado(res.data);
        setGirosRestantes(prev => prev - 1);
        onUpdateUser(res.data.user);
        if (res.data.valor > 0) playSound('conquista');
        else playSound('derrota');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao girar');
      } finally {
        setGirando(false);
      }
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg sleek-card p-8 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-white transition-all"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-accent-gold uppercase italic tracking-tighter flex items-center justify-center gap-3">
            <Dices size={32} />
            Roleta da Sorte
          </h2>
          <div className="flex justify-center gap-4 mt-4">
            <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">
              <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Giros Hoje</p>
              <p className="text-xl font-bold text-white">{girosRestantes} / 3</p>
            </div>
            <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/5">
              <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Suas Moedas</p>
              <div className="flex items-center gap-2 text-xl font-bold text-accent-gold">
                <Coins size={18} />
                <span>{usuario.moedas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Roulette Wheel */}
        <div className="relative w-80 h-80 mx-auto mb-12">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-accent-gold drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
          </div>

          <div className="absolute inset-0 rounded-full border-[12px] border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-0" />

          <motion.div
            animate={{ rotate: angulo }}
            transition={{ duration: 3, ease: [0.45, 0.05, 0.55, 0.95] }}
            className="w-full h-full rounded-full border-4 border-accent-gold/30 relative overflow-hidden z-10 bg-bg-dark"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {PREMIOS.map((premio, i) => {
                const angle = 360 / PREMIOS.length;
                const startAngle = i * angle;
                const endAngle = (i + 1) * angle;
                
                // Calculate SVG path for the slice
                const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                
                return (
                  <g key={i}>
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                        fill={premio.cor.replace('bg-', '').replace('-500', '')}
                        className="opacity-80 hover:opacity-100 transition-opacity"
                        style={{ 
                          fill: premio.cor.includes('green') ? '#22c55e' : 
                                premio.cor.includes('yellow') ? '#eab308' : 
                                premio.cor.includes('orange') ? '#f97316' : 
                                premio.cor.includes('blue') ? '#3b82f6' :
                                premio.cor.includes('emerald') ? '#10b981' :
                                premio.cor.includes('amber') ? '#f59e0b' :
                                premio.cor.includes('indigo') ? '#6366f1' :
                                '#64748b' 
                        }}
                      />
                    <g transform={`rotate(${startAngle + angle / 2} 50 50)`}>
                      <text
                        x="75"
                        y="50"
                        fill="white"
                        fontSize="4"
                        fontWeight="bold"
                        textAnchor="middle"
                        transform="rotate(90 75 50)"
                        className="uppercase tracking-tighter"
                      >
                        {premio.valor > 0 ? premio.valor : ''}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
            
            {/* Center Hub */}
            <div className="absolute inset-0 m-auto w-20 h-20 bg-bg-dark rounded-full border-4 border-accent-gold shadow-[inset_0_0_20px_rgba(251,191,36,0.3)] z-20 flex items-center justify-center overflow-hidden">
              <motion.div 
                animate={{ 
                  scale: girando ? [1, 1.2, 1] : 1,
                  rotate: girando ? [0, 10, -10, 0] : 0
                }}
                transition={{ duration: 0.5, repeat: girando ? Infinity : 0 }}
                className="text-4xl"
              >
                🐯
              </motion.div>
            </div>
          </motion.div>

          {/* Tigrinho Mascot */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute -bottom-10 -right-10 z-50 flex flex-col items-center"
          >
            <div className="bg-accent-gold text-black text-[8px] font-black px-2 py-0.5 rounded-full mb-1 shadow-lg animate-bounce">
              SOLTA O TIGRE!
            </div>
            <div className="text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
              🐯
            </div>
          </motion.div>
        </div>

        <div className="mb-6 p-4 bg-accent-gold/5 border border-accent-gold/20 rounded-2xl">
          <h4 className="text-[10px] font-black text-accent-gold uppercase tracking-widest mb-2 flex items-center gap-2">
            <AlertCircle size={14} /> Como ganhar moedas?
          </h4>
          <ul className="text-[10px] text-text-muted space-y-1 list-disc list-inside font-bold">
            <li>Complete Trilhas de Conhecimento (+50 moedas)</li>
            <li>Vença Batalhas na Arena (+30 moedas)</li>
            <li>Resgate sua Meta Diária (+20 moedas)</li>
          </ul>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-500 text-sm font-bold">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <button
          disabled={girando || girosRestantes === 0}
          onClick={girar}
          className="w-full sleek-btn py-4 disabled:opacity-50"
        >
          {girando ? 'Girando...' : girosRestantes > 0 ? 'Girar Roleta' : 'Volte Amanhã'}
        </button>

        <AnimatePresence>
          {resultado && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <div className="sleek-card p-12 text-center max-w-sm w-full">
                <div className="text-6xl mb-6">
                  {resultado.valor > 100 ? '🏆' : resultado.valor > 0 ? '🎁' : '💀'}
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic mb-2 tracking-tighter">{resultado.premio}</h3>
                <p className="text-text-muted mb-8">{resultado.mensagem}</p>
                <button
                  onClick={() => setResultado(null)}
                  className="w-full sleek-btn"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
