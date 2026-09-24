import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, User, X } from 'lucide-react';
import { Usuario } from '../types';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';

interface RankingProps {
  onClose: () => void;
}

export const Ranking: React.FC<RankingProps> = ({ onClose }) => {
  const [ranking, setRanking] = useState<any[]>([]);
  const { playSound } = useAudio();

  useEffect(() => {
    const fetchRanking = async () => {
      const res = await axios.get('/api/ranking');
      setRanking(res.data);
    };
    fetchRanking();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl sleek-card overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-accent-gold/5">
          <h2 className="text-2xl font-black text-accent-gold uppercase tracking-tighter italic flex items-center gap-3">
            <Trophy size={32} />
            Hall da Fama
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {ranking.map((player, index) => {
              const isTop3 = index < 3;
              const colors = ['text-accent-gold', 'text-gray-300', 'text-orange-400'];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                    isTop3 
                      ? "bg-accent-gold/10 border-accent-gold/50 shadow-lg shadow-accent-gold/5" 
                      : "bg-black/20 border-white/5"
                  )}
                >
                  <div className="w-10 text-center font-black text-2xl italic">
                    {isTop3 ? (
                      <Medal className={colors[index]} size={32} />
                    ) : (
                      <span className="text-text-muted">#{index + 1}</span>
                    )}
                  </div>

                  <div className={cn(
                    "w-12 h-12 rounded-full border-2 overflow-hidden",
                    isTop3 ? "border-accent-gold" : "border-white/10"
                  )}>
                    <img 
                      src={player.avatar} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold text-white leading-none tracking-tight">{player.nome}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">{player.hospital_nome || 'Sem Unidade'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-accent-gold font-black italic">
                      <Star size={14} fill="currentColor" />
                      {player.xp} XP
                    </div>
                    <div className="text-[10px] text-text-muted font-black uppercase tracking-widest">LVL {player.level}</div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 ml-8 border-l border-white/5 pl-8">
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Vitórias</p>
                      <p className="text-success font-bold">{player.vitorias}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Derrotas</p>
                      <p className="text-red-500 font-bold">{player.derrotas}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
