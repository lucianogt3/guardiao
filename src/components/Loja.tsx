import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, Star, Zap, Trophy, X, ChevronRight, Sparkles, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from './AudioController';
import { AvatarLoja, Usuario } from '../types';
import { cn } from '@/src/lib/utils';

interface LojaProps {
  user: Usuario;
  onUpdateUser: (user: Usuario) => void;
  onClose: () => void;
}

export const Loja: React.FC<LojaProps> = ({ user, onUpdateUser, onClose }) => {
  const [avatares, setAvatares] = useState<AvatarLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const { playSound } = useAudio();

  useEffect(() => {
    fetchAvatares();
  }, []);

  const fetchAvatares = async () => {
    try {
      const res = await axios.get(`/api/loja/${user.id}`);
      setAvatares(res.data);
    } catch (err) {
      console.error('Erro ao buscar avatares', err);
    }
  };

  const handleComprar = async (avatar: AvatarLoja) => {
    if (user.moedas < avatar.preco_moedas) {
      playSound('erro');
      return;
    }

    setBuyingId(avatar.id);
    try {
      const res = await axios.post('/api/loja/comprar', { userId: user.id, avatarId: avatar.id });
      onUpdateUser(res.data.user);
      playSound('conquista');
      fetchAvatares();
    } catch (err) {
      playSound('erro');
    } finally {
      setBuyingId(null);
    }
  };

  const getRaridadeColor = (raridade: string) => {
    switch (raridade) {
      case 'comum': return 'text-slate-400 border-slate-400/20 bg-slate-400/5';
      case 'raro': return 'text-blue-400 border-blue-400/20 bg-blue-400/5';
      case 'epico': return 'text-purple-400 border-purple-400/20 bg-purple-400/5';
      case 'lendario': return 'text-accent-gold border-accent-gold/20 bg-accent-gold/5';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl h-[80vh] sleek-card flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-gold/20 rounded-lg text-accent-gold">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Mercado de Avatares</h2>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Troque suas moedas por aparências lendárias</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Seu Saldo</p>
              <div className="flex items-center gap-2 text-accent-gold font-black">
                <Coins size={16} />
                <span>{user.moedas.toLocaleString()} Moedas</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-text-muted">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {avatares.map((avatar) => (
              <motion.div
                key={avatar.id}
                whileHover={{ y: -5 }}
                className={cn(
                  "sleek-card p-4 bg-white/5 border-2 transition-all flex flex-col",
                  avatar.comprado ? 'border-green-500/20 opacity-80' : 'border-white/5 hover:border-accent-gold/30'
                )}
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/40 mb-4 group">
                  <img src={avatar.url} alt={avatar.nome} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className={cn(
                    "absolute top-3 right-3 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                    getRaridadeColor(avatar.raridade)
                  )}>
                    {avatar.raridade}
                  </div>
                  {avatar.raridade === 'lendario' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <Sparkles className="absolute top-2 left-2 text-accent-gold animate-pulse" size={16} />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">{avatar.nome}</h3>
                  <div className="flex items-center gap-2 text-accent-gold font-bold text-xs mb-4">
                    <Coins size={14} />
                    <span>{avatar.preco_moedas.toLocaleString()} Moedas</span>
                  </div>
                </div>

                {avatar.comprado ? (
                  <div className="w-full py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-[10px] font-black uppercase tracking-widest text-center">
                    Já Adquirido
                  </div>
                ) : (
                  <button
                    onClick={() => handleComprar(avatar)}
                    disabled={buyingId === avatar.id || user.moedas < avatar.preco_moedas}
                    className={cn(
                      "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      user.moedas >= avatar.preco_moedas 
                        ? 'bg-accent-gold text-black hover:bg-accent-orange' 
                        : 'bg-white/5 text-text-muted cursor-not-allowed'
                    )}
                  >
                    {buyingId === avatar.id ? (
                      'Processando...'
                    ) : (
                      <>
                        Comprar Avatar
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="flex items-center gap-2 text-text-muted">
            <Coins size={16} className="text-accent-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Moedas: Ganhe girando a roleta ou completando metas diárias</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Zap size={16} className="text-accent-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest">XP: Ganhe respondendo o Quiz para subir de nível e no ranking</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
