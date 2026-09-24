import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, 
  MessageSquare, 
  Pill, 
  Scissors, 
  Waves, 
  ShieldAlert, 
  Lock, 
  CheckCircle2,
  Sword,
  Trophy,
  User,
  Dices,
  ShoppingBag,
  Settings,
  Layout,
  Star,
  Zap,
  ChevronRight,
  ShieldCheck,
  Calendar,
  LogOut,
  ArrowLeft,
  Menu,
  X as CloseIcon
} from 'lucide-react';
import { Meta, Usuario, Tema } from '../types';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';

interface MapaProps {
  usuario: Usuario;
  onSelectMeta: (meta: Meta) => void;
  onOpenArena: () => void;
  onOpenRanking: () => void;
  onOpenPerfil: () => void;
  onOpenRoleta: () => void;
  onOpenLoja: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

const ICON_MAP: Record<string, any> = {
  UserCheck,
  MessageSquare,
  Pill,
  Scissors,
  Waves,
  ShieldAlert,
  ShieldCheck,
  Star,
  Layout
};

export const Mapa: React.FC<MapaProps> = ({ 
  usuario, 
  onSelectMeta, 
  onOpenArena, 
  onOpenRanking, 
  onOpenPerfil,
  onOpenRoleta,
  onOpenLoja,
  onOpenAdmin,
  onLogout
}) => {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [temaAtivo, setTemaAtivo] = useState<Tema | null>(null);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [concluidas, setConcluidas] = useState<number[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [metaDiaria, setMetaDiaria] = useState<{ concluida: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'world' | 'theme'>('world');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const { playMusic, playSound } = useAudio();

  useEffect(() => {
    playMusic('menu');
    fetchInitialData();
  }, [usuario.id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [temasRes, concluidasRes, rankingRes, dailyRes] = await Promise.all([
        axios.get('/api/temas'),
        axios.get(`/api/metas-concluidas/${usuario.id}`),
        axios.get('/api/ranking'),
        axios.get(`/api/metas-diarias/${usuario.id}`)
      ]);
      
      setTemas(temasRes.data);
      setConcluidas(concluidasRes.data);
      setRanking(rankingRes.data.slice(0, 3));
      setMetaDiaria(dailyRes.data);
      
      if (temasRes.data.length > 0) {
        setTemaAtivo(temasRes.data[0]);
        fetchMetas(temasRes.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar dados', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetas = async (temaId: number) => {
    setMetas([]); // Limpa as trilhas anteriores para evitar confusão visual
    try {
      const res = await axios.get(`/api/metas/${temaId}`);
      setMetas(res.data);
    } catch (err) {
      console.error('Erro ao buscar metas', err);
    }
  };

  const handleCompletarDiaria = async () => {
    if (metaDiaria?.concluida) return;
    try {
      const res = await axios.post('/api/metas-diarias/completar', { userId: usuario.id });
      setMetaDiaria({ concluida: 1 });
      playSound('conquista');
      // Update user stats (handled by parent through some mechanism or just refresh)
    } catch (err) {
      playSound('erro');
    }
  };

  const isMetaLiberada = (meta: Meta) => {
    if (meta.ordem === 1) return true;
    const anterior = metas.find(m => m.ordem === meta.ordem - 1);
    return anterior ? concluidas.includes(anterior.id) : false;
  };

  const handleSelectTema = (tema: Tema) => {
    playSound('clique');
    setTemaAtivo(tema);
    fetchMetas(tema.id);
    setViewMode('theme');
  };

  const handleBackToWorld = () => {
    playSound('clique');
    setViewMode('world');
    setTemaAtivo(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark overflow-x-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-accent-gold/10 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            opacity: [0.05, 0.15, 0.05]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-bg-purple/20 rounded-full blur-[150px]"
        />
      </div>

      {/* HUD / Header */}
      <header className="h-20 bg-black/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 z-50 sticky top-0 overflow-hidden">
        {usuario.banner && (
          <img src={usuario.banner} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" alt="Banner" />
        )}
        <div className="flex items-center gap-3 md:gap-4 relative z-10">
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg"
          >
            {showMobileMenu ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
          <div className="relative">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl border-2 border-accent-gold bg-bg-dark flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <img src={usuario.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-accent-gold rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-black text-black border-2 border-bg-dark">
              {usuario.level}
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm md:text-lg font-black text-white leading-tight uppercase italic tracking-tighter truncate max-w-[120px] md:max-w-none">
              {usuario.nome}
            </div>
            <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-accent-gold font-bold">
              {usuario.cargo_nome}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex gap-10">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-text-muted uppercase tracking-widest font-black mb-1">Experiência</span>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-accent-gold" />
              <span className="text-lg font-black text-white">{usuario.xp.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-text-muted uppercase tracking-widest font-black mb-1">Moedas</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white">🪙 {usuario.moedas}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="lg:hidden flex items-center gap-2 mr-2">
            <span className="text-xs font-black text-accent-gold">🪙 {usuario.moedas}</span>
          </div>
          {usuario.is_admin === 1 && (
            <button 
              onClick={onOpenAdmin}
              className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-accent-gold border border-white/5"
              title="Painel Administrativo"
            >
              <Settings size={18} className="md:w-5 md:h-5" />
            </button>
          )}
          <button 
            onClick={onOpenPerfil}
            className="p-2 md:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white border border-white/5"
            title="Meu Perfil"
          >
            <User size={18} className="md:w-5 md:h-5" />
          </button>
          <button 
            onClick={onLogout}
            className="p-2 md:p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all text-red-500 border border-red-500/20"
            title="Sair do Jogo"
          >
            <LogOut size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[280px_1fr_300px] gap-6 p-4 md:p-6 overflow-hidden">
        {/* Sidebar Navigation - Desktop */}
        <nav className={cn(
          "lg:flex flex-col gap-4 transition-all duration-300",
          showMobileMenu ? "fixed inset-0 z-40 bg-bg-dark p-6 pt-24" : "hidden"
        )}>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2 mb-3">Navegação</p>
            <button 
              onClick={() => { setViewMode('world'); setShowMobileMenu(false); }}
              className={cn(
                "w-full sleek-card p-4 border-l-4 flex items-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all",
                viewMode === 'world' ? "border-accent-gold bg-accent-gold/5 text-accent-gold" : "border-transparent hover:bg-white/5 text-text-muted"
              )}
            >
              <Layout size={18} /> Mapa do Mundo
            </button>
            <button onClick={() => { onOpenArena(); setShowMobileMenu(false); }} className="w-full sleek-card p-4 border-l-4 border-transparent hover:bg-white/5 flex items-center gap-3 font-black text-[11px] uppercase tracking-widest text-text-muted hover:text-white transition-all">
              <Sword size={18} /> Arena Batalha
            </button>
            <button onClick={() => { onOpenRoleta(); setShowMobileMenu(false); }} className="w-full sleek-card p-4 border-l-4 border-transparent hover:bg-white/5 flex items-center gap-3 font-black text-[11px] uppercase tracking-widest text-text-muted hover:text-white transition-all">
              <Dices size={18} /> Roleta da Sorte
            </button>
            <button onClick={() => { onOpenLoja(); setShowMobileMenu(false); }} className="w-full sleek-card p-4 border-l-4 border-transparent hover:bg-white/5 flex items-center gap-3 font-black text-[11px] uppercase tracking-widest text-text-muted hover:text-white transition-all">
              <ShoppingBag size={18} /> Loja de Avatares
            </button>
            <button onClick={() => { onOpenRanking(); setShowMobileMenu(false); }} className="w-full sleek-card p-4 border-l-4 border-transparent hover:bg-white/5 flex items-center gap-3 font-black text-[11px] uppercase tracking-widest text-text-muted hover:text-white transition-all">
              <Trophy size={18} /> Ranking Geral
            </button>
          </div>

          <div className="mt-auto sleek-card p-5 bg-gradient-to-br from-accent-gold/10 to-transparent border-accent-gold/20">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-accent-gold" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Meta Diária</span>
            </div>
            <p className="text-[10px] text-text-muted mb-4 leading-relaxed">Complete qualquer desafio hoje para ganhar bônus!</p>
            <button 
              onClick={handleCompletarDiaria}
              disabled={metaDiaria?.concluida === 1}
              className={cn(
                "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                metaDiaria?.concluida === 1 
                  ? "bg-success/20 text-success border border-success/30" 
                  : "bg-accent-gold text-black hover:bg-accent-orange"
              )}
            >
              {metaDiaria?.concluida === 1 ? "Concluída +50 XP / +20 🪙" : "Resgatar Recompensa"}
            </button>
          </div>
        </nav>

        {/* Central Map Section */}
        <main className="flex flex-col gap-6 overflow-y-auto no-scrollbar">
          <div className="flex-1 sleek-card p-6 md:p-10 flex flex-col items-center relative bg-black/20 min-h-[500px]">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : viewMode === 'world' ? (
              /* World Map View */
              <div className="w-full space-y-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic mb-3">Mapa dos Reinos</h2>
                  <p className="text-text-muted text-xs md:text-sm font-bold uppercase tracking-widest max-w-md mx-auto">
                    Escolha um protocolo para iniciar sua jornada de conhecimento
                  </p>
                </div>

                {temas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-accent-gold/20">
                      <Layout size={40} />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic mb-2">Nenhum Reino Encontrado</h3>
                    <p className="text-text-muted text-sm max-w-xs mx-auto">O mestre ainda não criou os protocolos de segurança.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {temas.map((tema) => (
                      <motion.button
                        key={tema.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectTema(tema)}
                        className="sleek-card min-h-[180px] text-left group relative overflow-hidden border-2 border-white/5 hover:border-accent-gold/40 transition-all"
                      >
                        {tema.capa ? (
                          <img src={tema.capa} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all" alt={tema.nome} />
                        ) : (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent-gold/10 transition-all" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/40 to-transparent" />
                        
                        <div className="flex items-start gap-4 relative z-10 p-6">
                          <div className="p-4 bg-accent-gold/10 rounded-2xl text-accent-gold group-hover:bg-accent-gold group-hover:text-black transition-all backdrop-blur-md border border-white/10">
                            <Layout size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-1 drop-shadow-lg">{tema.nome}</h3>
                            <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-4 font-bold">{tema.descricao}</p>
                            <div className="flex items-center gap-2 text-[10px] font-black text-accent-gold uppercase tracking-widest">
                              Explorar Reino <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Theme Track View */
              <div className="w-full flex flex-col h-full">
                <button 
                  onClick={handleBackToWorld}
                  className="self-start flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest hover:text-white transition-all mb-8"
                >
                  <ArrowLeft size={16} /> Voltar ao Mapa
                </button>

                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic mb-2">
                    {temaAtivo?.nome}
                  </h2>
                  <p className="text-text-muted text-xs font-bold uppercase tracking-widest max-w-md mx-auto">
                    {temaAtivo?.descricao}
                  </p>
                  
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <div className="w-32 md:w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${metas.length > 0 ? (concluidas.length / metas.length) * 100 : 0}%` }}
                        className="h-full bg-gradient-to-r from-accent-gold to-accent-orange"
                      />
                    </div>
                    <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">
                      {concluidas.length}/{metas.length} Concluídas
                    </span>
                  </div>
                </div>

                {metas.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <p className="text-text-muted text-sm italic">Nenhuma trilha cadastrada para este reino.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 md:gap-x-16 md:gap-y-20 relative px-4">
                    {metas.map((meta, index) => {
                      const Icon = ICON_MAP[meta.icone] || UserCheck;
                      const liberada = isMetaLiberada(meta);
                      const concluida = concluidas.includes(meta.id);
                      const isCurrent = liberada && !concluida && (index === 0 || concluidas.includes(metas[index-1].id));

                      return (
                        <div key={meta.id} className="flex flex-col items-center gap-4 text-center relative group">
                          <motion.button
                            whileHover={liberada ? { scale: 1.1, rotate: 2 } : {}}
                            whileTap={{ scale: 0.95 }}
                            disabled={!liberada}
                            onClick={() => { playSound('clique'); onSelectMeta(meta); }}
                            className={cn(
                              "w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center text-2xl md:text-3xl border-4 transition-all relative z-10",
                              liberada 
                                ? concluida 
                                  ? "bg-success/20 border-success text-success shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                                  : isCurrent
                                    ? "bg-accent-gold text-black border-accent-gold shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                                    : "bg-white/5 border-white/10 text-white hover:border-accent-gold/50"
                                : "bg-black/40 border-white/5 text-white/10"
                            )}
                          >
                            {concluida ? <CheckCircle2 size={40} /> : liberada ? <Icon size={40} /> : <Lock size={40} />}
                            
                            {isCurrent && (
                              <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent-orange rounded-full flex items-center justify-center animate-bounce border-2 border-bg-dark">
                                <Zap size={16} className="text-white" />
                              </div>
                            )}
                          </motion.button>
                          
                          <div className="space-y-1">
                            <div className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              liberada ? "text-white" : "text-text-muted"
                            )}>
                              {meta.titulo}
                            </div>
                            <div className="text-[8px] font-bold text-text-muted uppercase tracking-widest">
                              Nível {meta.ordem}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Right Stats Panel */}
        <aside className="flex flex-col gap-6 lg:overflow-y-auto no-scrollbar pb-10 lg:pb-0">
          <div className="sleek-card p-6 bg-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-widest flex items-center gap-2">
                <Trophy size={14} /> Top Guardiões
              </h3>
              <button onClick={onOpenRanking} className="text-[8px] font-black text-text-muted uppercase hover:text-white transition-all">Ver Tudo</button>
            </div>
            <div className="space-y-4">
              {ranking.length > 0 ? ranking.map((player, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border",
                    i === 0 ? "bg-accent-gold/20 border-accent-gold text-accent-gold" : "bg-white/5 border-white/5 text-text-muted"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{player.nome}</p>
                    <p className="text-[8px] text-text-muted uppercase font-bold">{player.hospital_nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-accent-gold">{player.xp}</p>
                    <p className="text-[8px] text-text-muted uppercase font-bold">XP</p>
                  </div>
                </div>
              )) : (
                <p className="text-[10px] text-text-muted italic text-center py-4">Nenhum guardião no ranking ainda.</p>
              )}
            </div>
          </div>

          <div className="sleek-card p-6 bg-gradient-to-br from-purple-900/40 to-transparent border-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Sword size={18} className="text-purple-400" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Arena PvP</h3>
            </div>
            <p className="text-[10px] text-text-muted mb-6 leading-relaxed">Desafie outros guardiões em tempo real e prove seu conhecimento!</p>
            <button onClick={onOpenArena} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2">
              Entrar na Batalha
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="sleek-card p-6 bg-white/5 border-dashed border-2 border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Dices size={18} className="text-accent-gold" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Sorte Diária</h3>
            </div>
            <div className="flex items-center justify-center py-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 rounded-full border-4 border-dashed border-accent-gold/30 flex items-center justify-center text-3xl"
              >
                🎁
              </motion.div>
            </div>
            <button onClick={onOpenRoleta} className="w-full py-3 bg-white/5 hover:bg-white/10 text-accent-gold rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-accent-gold/20">
              Girar Roleta
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

