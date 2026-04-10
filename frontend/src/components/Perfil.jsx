import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

const AVATARES = {
  guerreiro: '⚔️',
  maga: '🧙',
  mago: '🧙',
  arqueira: '🏹',
  arqueiro: '🏹',
  paladina: '🛡️',
  paladino: '🛡️',
  ninja: '🥷',
  cavaleiro: '🐉',
  curandeiro: '💚',
  guardiao: '🛡️'
};

const Perfil = ({ usuario }) => {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      // Usando o ID que vem do componente pai ou do localStorage
      const response = await axios.get(`/api/perfil/${usuario.id}`);
      setPerfil(response.data);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  if (!perfil) return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
      <div className="animate-spin text-4xl text-yellow-500">🛡️</div>
    </div>
  );

  // CÁLCULOS DE PROGRESSO (Ajustado para 600 XP por nível como no seu Backend)
  const xpPorNivel = 600;
  const xpAtual = perfil.xp || 0;
  const nivelAtual = perfil.level || 1;
  const progressoXP = ((xpAtual % xpPorNivel) / xpPorNivel) * 100;
  const metasConcluidasArray = perfil.metas_concluidas || [];

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-4 pb-20">
      
      {/* HEADER */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/mapa')} 
          className="bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 transition-all font-bold"
        >
          ← Voltar ao Mapa
        </button>
        <div className="text-right">
          <p className="text-[10px] text-yellow-500 font-black tracking-[0.2em] uppercase leading-none">Status do Guardião</p>
          <p className="text-xs text-gray-500 mt-1">HCor • Segurança do Paciente</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD PRINCIPAL: AVATAR E NÍVEL */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl text-center shadow-2xl"
        >
          <div className="relative inline-block mb-4">
            <div className="text-7xl bg-black/40 w-32 h-32 flex items-center justify-center rounded-full border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
              {AVATARES[String(perfil.avatar).toLowerCase()] || '🛡️'}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-black w-10 h-10 flex items-center justify-center rounded-xl text-lg shadow-lg">
              {nivelAtual}
            </div>
          </div>
          
          <h1 className="text-2xl font-black tracking-tight leading-tight">{perfil.nome}</h1>
          <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mt-2">{perfil.setor}</p>

          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase">
              <span>Experiência (XP)</span>
              <span>{xpAtual} / {nivelAtual * xpPorNivel}</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressoXP}%` }}
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-600 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
              />
            </div>
          </div>
        </motion.div>

        {/* ESTATÍSTICAS TÉCNICAS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 space-y-6"
        >
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-6">Atributos de Combate</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Acertos Totais</p>
                <p className="text-2xl font-black text-white">{perfil.acertos || 0} <span className="text-xs text-green-500 font-normal">🎯</span></p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Batalhas Vencidas</p>
                <p className="text-2xl font-black text-white">{perfil.batalhas_vencidas || 0} <span className="text-xs text-red-500 font-normal">⚔️</span></p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Missões</p>
                <p className="text-2xl font-black text-white">{metasConcluidasArray.length} / 6 <span className="text-xs text-blue-500 font-normal">🛡️</span></p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Posição Ranking</p>
                <p className="text-2xl font-black text-white">
                  {perfil.ranking_posicao ? `#${perfil.ranking_posicao}` : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* ÁREA DE GIFTS / INSÍGNIAS */}
          <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-[0.2em] mb-6">Coleção de Insígnias</h3>
            <div className="flex flex-wrap gap-4">
              {metasConcluidasArray.length > 0 ? (
                metasConcluidasArray.map((metaId) => (
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    key={metaId}
                    className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-transparent border border-yellow-500/30 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                    title={`Meta ${metaId} Concluída`}
                  >
                    {metaId === 1 && '🆔'}
                    {metaId === 2 && '📢'}
                    {metaId === 3 && '💊'}
                    {metaId === 4 && '🔪'}
                    {metaId === 5 && '🧼'}
                    {metaId === 6 && '📉'}
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-600 italic text-sm">Nenhum gift conquistado ainda. Complete metas para ganhar!</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Perfil;