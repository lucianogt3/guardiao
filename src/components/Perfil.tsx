import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Star, Sword, CheckCircle2, X, Coins } from 'lucide-react';
import { Usuario, Meta } from '../types';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';

interface PerfilProps {
  usuario: Usuario;
  onClose: () => void;
}

export const Perfil: React.FC<PerfilProps> = ({ usuario, onClose }) => {
  const [data, setData] = useState<{ user: Usuario; metas: Meta[]; avatares: any[] } | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const { playSound } = useAudio();

  const fetchPerfil = async () => {
    const res = await axios.get(`/api/perfil/${usuario.id}`);
    setData(res.data);
  };

  useEffect(() => {
    fetchPerfil();
  }, [usuario.id]);

  if (!data) return null;

  const { user, metas, avatares } = data;

  const handleUpdateAvatar = async (url: string) => {
    try {
      await axios.post('/api/usuario/update-avatar', { userId: user.id, avatarUrl: url });
      playSound('conquista');
      fetchPerfil();
      setShowAvatarSelector(false);
      window.location.reload(); // Refresh to update HUD
    } catch (err) {
      playSound('erro');
    }
  };

  const handleUpdateBanner = async (url: string) => {
    try {
      await axios.post('/api/usuario/update-banner', { userId: user.id, bannerUrl: url });
      playSound('conquista');
      fetchPerfil();
      window.location.reload();
    } catch (err) {
      playSound('erro');
    }
  };
  const xpNextLevel = 500;
  const progress = ((user.xp % xpNextLevel) / xpNextLevel) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl sleek-card overflow-hidden shadow-2xl"
      >
        <div className="relative h-32 bg-gradient-to-r from-bg-purple to-bg-dark overflow-hidden group/banner">
          {user.banner ? (
            <img src={user.banner} className="w-full h-full object-cover opacity-50" alt="Banner" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-bg-purple to-bg-dark" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button 
              onClick={() => {
                const url = prompt('Cole a URL da imagem para o banner:', user.banner || '');
                if (url !== null) handleUpdateBanner(url);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/10"
            >
              Alterar Banner
            </button>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all z-10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 group">
            <div className="w-32 h-32 rounded-full border-4 border-bg-dark shadow-xl mx-auto overflow-hidden bg-bg-dark relative">
              <img 
                src={user.avatar} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setShowAvatarSelector(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest"
              >
                Trocar Avatar
              </button>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-accent-gold text-black px-4 py-1 rounded-full font-black text-xs border-2 border-bg-dark shadow-lg">
              NÍVEL {user.level}
            </div>
          </div>

          <AnimatePresence>
            {showAvatarSelector && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-widest">Seus Avatares</h3>
                  <button onClick={() => setShowAvatarSelector(false)} className="text-text-muted hover:text-white"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {avatares.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => handleUpdateAvatar(av.url)}
                      className={cn(
                        "aspect-square rounded-xl overflow-hidden border-2 transition-all",
                        user.avatar === av.url ? "border-accent-gold scale-110" : "border-transparent hover:border-white/20"
                      )}
                    >
                      <img src={av.url} className="w-full h-full object-cover" alt={av.nome} />
                    </button>
                  ))}
                  {avatares.length === 0 && (
                    <p className="col-span-full text-center text-[10px] text-text-muted italic py-2">Você ainda não comprou avatares na loja.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{user.nome}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <p className="text-accent-gold font-black uppercase tracking-widest text-[10px]">{user.cargo_nome}</p>
              <span className="text-white/20">•</span>
              <p className="text-white/60 font-bold uppercase tracking-widest text-[10px]">{user.hospital_nome}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
              <Star className="text-accent-gold mx-auto mb-2" size={20} />
              <p className="text-[8px] text-text-muted uppercase font-black tracking-widest">XP Total</p>
              <p className="text-lg font-bold text-white">{user.xp}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
              <Coins className="text-yellow-500 mx-auto mb-2" size={20} />
              <p className="text-[8px] text-text-muted uppercase font-black tracking-widest">Moedas</p>
              <p className="text-lg font-bold text-white">{user.moedas}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
              <Sword className="text-red-500 mx-auto mb-2" size={20} />
              <p className="text-[8px] text-text-muted uppercase font-black tracking-widest">Vitórias</p>
              <p className="text-lg font-bold text-white">{user.vitorias}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
              <Shield className="text-success mx-auto mb-2" size={20} />
              <p className="text-[8px] text-text-muted uppercase font-black tracking-widest">Metas</p>
              <p className="text-lg font-bold text-white">{metas.length}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                <span className="text-text-muted">Progresso do Nível</span>
                <span className="text-accent-gold">{user.xp % 500} / 500 XP</span>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-accent-gold to-accent-orange shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Metas Concluídas</h3>
              <div className="grid grid-cols-2 gap-3">
                {metas.map((meta) => (
                  <div key={meta.id} className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl">
                    <CheckCircle2 className="text-success" size={16} />
                    <span className="text-xs font-bold text-white truncate">{meta.titulo}</span>
                  </div>
                ))}
                {metas.length === 0 && (
                  <p className="col-span-2 text-center text-sm text-text-muted italic py-4">Nenhuma meta concluída ainda...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
