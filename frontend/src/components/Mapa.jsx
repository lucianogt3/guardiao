import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import CustomModal from './CustomModal';
import menuMusica from '../assets/menu_musica.mp3';

const AVATARES = { 
  guerreiro: '⚔️', maga: '🧙', mago: '🧙', arqueira: '🏹', arqueiro: '🏹', 
  paladina: '🛡️', paladino: '🛡️', ninja: '🥷', cavaleiro: '🐉', cavaleira: '🐉', 
  healer: '💚', curandeiro: '💚', curandeira: '💚', guardiao: '🛡️', guardiã: '🛡️' 
};

const Mapa = ({ usuario, onLogout }) => {
  const navigate = useNavigate();
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metasConcluidas, setMetasConcluidas] = useState([]);
  const [musicaAtiva, setMusicaAtiva] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onClose: null });
  
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(menuMusica);
    audio.loop = true;
    audio.volume = 0.2;
    audioRef.current = audio;
    const playAudio = () => musicaAtiva && audio.play().catch(() => {});
    window.addEventListener('click', playAudio, { once: true });
    return () => { audio.pause(); window.removeEventListener('click', playAudio); };
  }, [musicaAtiva]);

  useEffect(() => {
    if (!usuario) return navigate('/');
    setMetasConcluidas(usuario.metas_concluidas || []);
    carregarMetas();
  }, [usuario, navigate]);

  const carregarMetas = async () => {
    try {
      const response = await axios.get('/api/metas');
      setMetas(response.data.sort((a, b) => a.ordem - b.ordem));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const isMetaDesbloqueada = (meta) => metasConcluidas.includes(meta.ordem - 1) || meta.ordem === 1;
  const isMetaConcluida = (meta) => metasConcluidas.includes(meta.id);

  if (loading) return <div className="min-h-screen bg-[#f3e5ab] flex items-center justify-center text-[#8b5a2b] font-bold">📜 CARREGANDO TRILHA...</div>;

  return (
    <div className="min-h-screen bg-[#fdf5e6] text-[#3d2616] font-serif relative overflow-x-hidden">
      
      {/* TEXTURA DE FUNDO CLARA */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/papyros.png')]"></div>
      
      {/* ELEMENTOS DO MAPA (SOL E BÚSSOLA) */}
      <div className="fixed inset-0 z-1 pointer-events-none opacity-10">
        <div className="absolute top-[10%] right-10 text-[80px]">☀️</div>
        <div className="absolute top-[40%] left-[-40px] text-[180px] -rotate-12 grayscale">🧭</div>
      </div>

      {/* HEADER TÁTICO */}
      <header className="relative z-30 bg-[#3d2616] border-b-4 border-[#25160b] p-3 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => navigate('/perfil')}
              className="w-12 h-12 rounded-full border-2 border-yellow-600 bg-[#f3e5ab] flex items-center justify-center text-2xl shadow-lg cursor-pointer hover:scale-105"
            >
              {AVATARES[usuario?.avatar?.toLowerCase()] || '🛡️'}
            </div>
            <div className="hidden xs:block">
              <h1 className="text-white text-sm font-black uppercase leading-none">{usuario?.nome}</h1>
              <p className="text-yellow-500 text-[9px] font-bold uppercase tracking-widest">{usuario?.setor}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={() => navigate('/ranking')} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg">🏆 Ranking</button>
             <button onClick={() => setMusicaAtiva(!musicaAtiva)} className="bg-white/10 text-white w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                {musicaAtiva ? '🔊' : '🔇'}
             </button>
             <button onClick={onLogout} className="text-red-400 hover:text-red-300 text-[10px] font-black uppercase ml-1">Sair</button>
          </div>
        </div>
      </header>

      {/* PAINEL DE STATUS */}
      <section className="relative z-10 max-w-md mx-auto mt-4 px-4">
        <div className="bg-[#f3e5ab] border-2 border-[#3d2616] p-3 rounded-xl shadow-md">
          <div className="flex justify-between items-center mb-1 px-1">
             <span className="text-[10px] font-black text-[#3d2616] uppercase tracking-tighter">Missões Completas</span>
             <span className="text-xs font-black text-[#3d2616]">{metasConcluidas.length} / 6</span>
          </div>
          <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }} 
               animate={{ width: `${(metasConcluidas.length / 6) * 100}%` }}
               className="h-full bg-[#3d2616]"
             />
          </div>
        </div>
      </section>

      {/* CAMINHO SINUOSO COM PEGADAS */}
      <main className="relative z-10 max-w-lg mx-auto py-12 px-6 pb-48">
        <div className="flex flex-col items-center">
          
          {metas.map((meta, index) => {
            const unlocked = isMetaDesbloqueada(meta);
            const done = isMetaConcluida(meta);
            const isLeft = index % 2 === 0;

            return (
              <React.Fragment key={meta.id}>
                {index !== 0 && (
                  <div className={`flex flex-col items-center py-4 space-y-2 ${isLeft ? 'translate-x-12 -rotate-12' : '-translate-x-12 rotate-12'}`}>
                    <div className={`w-2 h-2 rounded-full ${done ? 'bg-[#3d2616]' : 'bg-[#3d2616]/20'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${done ? 'bg-[#3d2616]' : 'bg-[#3d2616]/20'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${done ? 'bg-[#3d2616]' : 'bg-[#3d2616]/20'}`}></div>
                    {unlocked && !done && (
                        <div className="text-lg opacity-40 animate-pulse">👣</div>
                    )}
                  </div>
                )}

                <motion.div
                  whileTap={unlocked ? { scale: 0.95 } : {}}
                  onClick={() => unlocked && !done && navigate(`/quiz/${meta.id}`)}
                  className={`relative w-64 p-4 rounded-2xl border-2 transition-all duration-300 ${isLeft ? 'self-start' : 'self-end'} ${
                    done 
                    ? 'bg-[#3d2616] text-[#f3e5ab] border-[#25160b]' 
                    : unlocked 
                    ? 'bg-[#f3e5ab] border-[#3d2616] shadow-xl' 
                    : 'bg-white/20 border-gray-300 grayscale opacity-40'
                  }`}
                  style={{ borderRadius: '20px 50px 20px 50px / 50px 20px 50px 20px' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl filter sepia contrast-125">
                      {done ? '📜' : meta.icone}
                    </div>
                    <div className="flex-1">
                      <span className="block text-[8px] font-black text-[#8b5a2b] uppercase">Missão {meta.ordem}</span>
                      <h3 className="font-bold text-[11px] uppercase leading-tight tracking-tight">{meta.titulo}</h3>
                    </div>
                    {unlocked && !done && (
                        <div className="absolute -top-3 -right-3 text-4xl text-red-700 font-black rotate-12 drop-shadow-md">X</div>
                    )}
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </div>
      </main>

      {/* BOTÃO ARENA CENTRALIZADO */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/batalha')}
          className="w-full bg-[#a01a1a] border-b-4 border-[#600a0a] p-4 rounded-2xl shadow-2xl flex items-center justify-between px-8"
        >
          <span className="text-xl">⚔️</span>
          <div className="text-center">
            <span className="block font-black text-white text-sm uppercase italic leading-none">Arena de Duelos</span>
            <span className="block text-[8px] text-red-200 font-bold uppercase tracking-[0.2em] mt-1">Combate Técnico</span>
          </div>
          <span className="text-xl">⚔️</span>
        </motion.button>
      </div>

      <CustomModal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} {...modal} />
    </div>
  );
};

export default Mapa;