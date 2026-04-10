import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Quiz = ({ usuario, atualizarUsuario }) => {
  const { metaId } = useParams();
  const navigate = useNavigate();
  const [questoes, setQuestoes] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respondido, setRespondido] = useState(false);
  const [escolha, setEscolha] = useState(null);
  const [acertos, setAcertos] = useState(0);
  const [finalizado, setFinalizado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarQuestoes();
  }, [metaId]);

  const carregarQuestoes = async () => {
    try {
      const res = await axios.get(`/api/questoes/${metaId}`);
      const sorteadas = res.data.sort(() => Math.random() - 0.5);
      setQuestoes(sorteadas);
      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate('/mapa');
    }
  };

  const handleResposta = (letra) => {
    if (respondido) return;
    setEscolha(letra);
    setRespondido(true);
    
    const correta = questoes[indiceAtual].resposta_correta;
    if (letra === correta) {
      setAcertos(prev => prev + 1);
      window.playSound?.('acerto');
    } else {
      window.playSound?.('erro');
    }
  };

  const proximaQuestao = () => {
    if (indiceAtual + 1 < questoes.length) {
      setIndiceAtual(prev => prev + 1);
      setRespondido(false);
      setEscolha(null);
    } else {
      finalizarQuiz();
    }
  };

  const finalizarQuiz = async () => {
    try {
      if (acertos >= questoes.length * 0.7) {
        await axios.post(`/api/completar_meta/${usuario.id}/${metaId}`);
        atualizarUsuario();
      }
      setFinalizado(true);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="min-h-screen bg-[#fdf5e6] flex items-center justify-center text-[#3d2616] font-black italic">📜 PREPARANDO DESAFIO...</div>;

  if (finalizado) {
    return (
      <div className="min-h-screen bg-[#1a0f05] flex items-center justify-center p-6 text-center">
        <div className="bg-[#f3e5ab] p-8 rounded-3xl border-4 border-[#3d2616] max-w-sm w-full shadow-2xl">
          <h2 className="text-2xl font-black mb-4 uppercase text-[#3d2616]">Missão Finalizada!</h2>
          <p className="text-5xl mb-6">{acertos >= questoes.length * 0.7 ? '🏆' : '💀'}</p>
          <div className="space-y-2 mb-8">
            <p className="font-black text-3xl text-[#3d2616]">{acertos} / {questoes.length}</p>
            <p className="text-xs uppercase font-bold text-[#8b5a2b]">Acertos Totais</p>
          </div>
          <button 
            onClick={() => navigate('/mapa')}
            className="w-full bg-[#3d2616] text-[#f3e5ab] py-4 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-transform"
          >
            Retornar ao Mapa
          </button>
        </div>
      </div>
    );
  }

  const questao = questoes[indiceAtual];

  return (
    <div className="min-h-screen bg-[#fdf5e6] p-4 font-serif text-[#3d2616]">
      <div className="max-w-xl mx-auto">
        
        {/* PROGRESSO */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] font-black uppercase text-[#8b5a2b]">Desafio Atual</p>
            <h3 className="text-xl font-black">Questão {indiceAtual + 1}</h3>
          </div>
          <span className="text-sm font-black opacity-60">{indiceAtual + 1} / {questoes.length}</span>
        </div>

        <div className="h-2.5 bg-black/5 rounded-full mb-8 overflow-hidden border border-black/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((indiceAtual + 1) / questoes.length) * 100}%` }}
            className="h-full bg-[#3d2616]"
          />
        </div>

        {/* PERGUNTA */}
        <div className="bg-white/50 p-6 rounded-3xl border-2 border-[#3d2616]/10 mb-8 shadow-sm">
          <h2 className="text-lg font-black leading-tight">{questao.pergunta}</h2>
        </div>

        {/* OPÇÕES DE RESPOSTA */}
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((letra) => {
            const textoOpcao = questao[`opcao_${letra.toLowerCase()}`];
            const isCorreta = letra === questao.resposta_correta;
            const isEscolhida = letra === escolha;

            // CORES DE VISIBILIDADE CORRIGIDAS
            let estilo = "bg-white text-[#3d2616] border-[#3d2616]/10 shadow-sm";
            
            if (respondido) {
              if (isCorreta) {
                estilo = "bg-green-600 text-white border-green-700 shadow-md scale-[1.02] z-10"; // CORREÇÃO: Fundo verde escuro, texto branco
              } else if (isEscolhida) {
                estilo = "bg-red-600 text-white border-red-700 opacity-90"; // CORREÇÃO: Fundo vermelho, texto branco
              } else {
                estilo = "bg-white text-[#3d2616] opacity-30 border-transparent";
              }
            }

            return (
              <button
                key={letra}
                onClick={() => handleResposta(letra)}
                disabled={respondido}
                className={`w-full p-5 rounded-2xl text-left font-bold transition-all duration-300 flex items-center gap-4 border-2 ${estilo}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${respondido && (isCorreta || isEscolhida) ? 'bg-white/20' : 'bg-black/5'}`}>
                  {letra}
                </span>
                <span className="text-sm md:text-base leading-snug">{textoOpcao}</span>
              </button>
            );
          })}
        </div>

        {/* FEEDBACK E EXPLICAÇÃO */}
        <AnimatePresence>
          {respondido && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-[#3d2616] text-[#f3e5ab] rounded-[2rem] shadow-2xl relative border-t-4 border-yellow-600"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{escolha === questao.resposta_correta ? '✅' : '❌'}</span>
                <h4 className="text-xs font-black uppercase tracking-[0.2em]">
                  {escolha === questao.resposta_correta ? 'Resposta Correta' : 'Resposta Incorreta'}
                </h4>
              </div>
              
              <p className="text-sm leading-relaxed font-medium opacity-90 italic mb-6">
                {questao.explicacao || "O conhecimento é o alicerce da segurança. Continue focado, Guardião!"}
              </p>
              
              <button 
                onClick={proximaQuestao}
                className="w-full bg-[#f3e5ab] text-[#3d2616] py-4 rounded-xl font-black uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                {indiceAtual + 1 < questoes.length ? 'Próximo Desafio ➔' : 'Ver Meu Destino'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Quiz;