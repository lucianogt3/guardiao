import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import CustomModal from './CustomModal';
import acertoAudio from '../assets/acerto.mp3';
import erroAudio from '../assets/erro.mp3';
import cliqueAudio from '../assets/clique.mp3';
import conquistaAudio from '../assets/conquista.mp3';
import levelupAudio from '../assets/levelup.mp3';
import derrotaAudio from '../assets/derrota.mp3';
import timeupAudio from '../assets/timeup.mp3';

const Quiz = ({ usuario }) => {
  const { metaId } = useParams();
  const navigate = useNavigate();

  const [questoes, setQuestoes] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pontuacao, setPontuacao] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [respostaSelecionada, setRespostaSelecionada] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metaInfo, setMetaInfo] = useState(null);
  const [tempoRestante, setTempoRestante] = useState(15);
  const [timerAtivo, setTimerAtivo] = useState(true);
  const [concluido, setConcluido] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onClose: null
  });
  const [erroCarregamento, setErroCarregamento] = useState(false);

  const [efeitosAtivos, setEfeitosAtivos] = useState(true);
  const [volumeEfeitos, setVolumeEfeitos] = useState(0.7);

  const timerRef = useRef(null);
  const acertosRef = useRef(0);
  const redirectTimerRef = useRef(null);
  const efeitosAtivosRef = useRef(true);
  const volumeEfeitosRef = useRef(0.7);

  const acertoSoundRef = useRef(null);
  const erroSoundRef = useRef(null);
  const cliqueSoundRef = useRef(null);
  const conquistaSoundRef = useRef(null);
  const levelupSoundRef = useRef(null);
  const derrotaSoundRef = useRef(null);
  const timeupSoundRef = useRef(null);

  useEffect(() => {
    efeitosAtivosRef.current = efeitosAtivos;
  }, [efeitosAtivos]);

  useEffect(() => {
    volumeEfeitosRef.current = volumeEfeitos;
  }, [volumeEfeitos]);

  const tocarEfeito = (nome) => {
    if (!efeitosAtivosRef.current) return;
    
    let soundRef = null;
    let volume = volumeEfeitosRef.current;
    
    switch(nome) {
      case 'acerto':
        soundRef = acertoSoundRef.current;
        break;
      case 'erro':
        soundRef = erroSoundRef.current;
        break;
      case 'clique':
        soundRef = cliqueSoundRef.current;
        volume = Math.min(volume, 0.4);
        break;
      case 'conquista':
        soundRef = conquistaSoundRef.current;
        break;
      case 'levelup':
        soundRef = levelupSoundRef.current;
        break;
      case 'derrota':
        soundRef = derrotaSoundRef.current;
        break;
      case 'timeup':
        soundRef = timeupSoundRef.current;
        break;
      default:
        return;
    }
    
    if (soundRef) {
      try {
        soundRef.volume = volume;
        soundRef.currentTime = 0;
        soundRef.play().catch(error => {
          const playOnInteraction = () => {
            soundRef.play().catch(e => console.log('Som ainda bloqueado'));
            document.removeEventListener('click', playOnInteraction);
            document.removeEventListener('keydown', playOnInteraction);
          };
          document.addEventListener('click', playOnInteraction, { once: true });
          document.addEventListener('keydown', playOnInteraction, { once: true });
        });
      } catch (error) {
        console.log(`Erro ao tocar som ${nome}:`, error);
      }
    }
  };

  const mostrarModal = (title, message, type = 'info', onClose = null) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onClose: () => {
        setModal(prev => ({ ...prev, isOpen: false }));
        if (onClose) onClose();
      }
    });
  };

  useEffect(() => {
    acertoSoundRef.current = new Audio(acertoAudio);
    erroSoundRef.current = new Audio(erroAudio);
    cliqueSoundRef.current = new Audio(cliqueAudio);
    conquistaSoundRef.current = new Audio(conquistaAudio);
    levelupSoundRef.current = new Audio(levelupAudio);
    derrotaSoundRef.current = new Audio(derrotaAudio);
    timeupSoundRef.current = new Audio(timeupAudio);
    
    const sounds = [
      acertoSoundRef.current,
      erroSoundRef.current,
      cliqueSoundRef.current,
      conquistaSoundRef.current,
      levelupSoundRef.current,
      derrotaSoundRef.current,
      timeupSoundRef.current
    ];
    
    sounds.forEach(sound => {
      if (sound) {
        sound.load();
        sound.volume = volumeEfeitos;
      }
    });
    
    return () => {
      sounds.forEach(sound => {
        if (sound) {
          sound.pause();
          sound.currentTime = 0;
        }
      });
    };
  }, []);

  useEffect(() => {
    carregarQuiz();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [metaId]);

  useEffect(() => {
    if (!loading && !respostaSelecionada && timerAtivo && tempoRestante > 0 && questoes.length > 0) {
      timerRef.current = setTimeout(() => {
        setTempoRestante(prev => prev - 1);
      }, 1000);
    } else if (tempoRestante === 0 && !respostaSelecionada && !loading && questoes.length > 0) {
      handleResposta(null);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tempoRestante, loading, respostaSelecionada, timerAtivo, questoes.length]);

  const carregarQuiz = async () => {
    try {
      setLoading(true);
      const [questoesRes, metasRes] = await Promise.all([
        axios.get(`/api/questoes/${metaId}`),
        axios.get('/api/metas')
      ]);
      setQuestoes(questoesRes.data);
      const meta = metasRes.data.find(m => m.id == metaId);
      setMetaInfo(meta);
      setTempoRestante(15);
      setErroCarregamento(false);
      setAcertos(0);
      setPontuacao(0);
      setIndiceAtual(0);
      setRespostaSelecionada(null);
      setFeedback(null);
      setConcluido(false);
      acertosRef.current = 0;
    } catch (error) {
      console.error('Erro ao carregar quiz:', error);
      setErroCarregamento(true);
      if (error.response && error.response.status === 403) {
        mostrarModal('Meta já concluída', error.response.data.error || 'Você já completou esta meta!', 'error', () => navigate('/mapa'));
      } else if (error.response && error.response.status === 404) {
        mostrarModal('Meta não encontrada', 'Não foi possível encontrar as questões para esta meta.', 'error', () => navigate('/mapa'));
      } else {
        mostrarModal('Erro de Conexão', 'Erro ao carregar questões. Verifique sua conexão.', 'error', () => navigate('/mapa'));
      }
    } finally {
      setLoading(false);
    }
  };

  const finalizarMeta = async (totalAcertos) => {
    const totalQuestoes = questoes.length;
    const percentual = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;
    const aprovadoFlag = percentual >= 70;

    if (aprovadoFlag) {
      tocarEfeito('conquista');
      try {
        const response = await axios.post(`/api/completar-meta/${metaId}`, {
          usuario_id: usuario.id
        });
        if (response.data.success) {
          tocarEfeito('levelup');
          setConcluido(true);
          const metasAtualizadas = response.data.metas_concluidas || [];
          const xpGanho = response.data.xp_ganho ?? 0;
          const usuarioAtualizado = {
            ...usuario,
            metas_concluidas: metasAtualizadas,
            xp: (usuario?.xp || 0) + xpGanho
          };
          localStorage.setItem('guardiao_user', JSON.stringify(usuarioAtualizado));
          if (window.atualizarUsuario) {
            window.atualizarUsuario(usuarioAtualizado);
          }
          mostrarModal(
            response.data.ja_concluida ? '✅ META REFEITA!' : '🎉 PARABÉNS! 🎉',
            response.data.ja_concluida
              ? `Você acertou ${totalAcertos} de ${totalQuestoes} questões (${percentual.toFixed(0)}%)\n\nVocê já havia concluído esta meta antes, então não ganhou XP desta vez.`
              : `Você acertou ${totalAcertos} de ${totalQuestoes} questões (${percentual.toFixed(0)}%)\n\n+${xpGanho} XP conquistado!\n\nMeta ${metaInfo?.titulo} CONCLUÍDA!`,
            'success'
          );
          redirectTimerRef.current = setTimeout(() => navigate('/mapa'), 900);
        }
      } catch (error) {
        console.error('Erro ao completar meta:', error);
        setConcluido(true);
        mostrarModal('Meta Concluída!', `Você acertou ${totalAcertos} de ${totalQuestoes} questões (${percentual.toFixed(0)}%)\n\nMeta concluída com sucesso!`, 'success');
        redirectTimerRef.current = setTimeout(() => navigate('/mapa'), 900);
      }
    } else {
      tocarEfeito('derrota');
      mostrarModal('❌ REPROVADO ❌', `Você acertou ${totalAcertos} de ${totalQuestoes} questões (${percentual.toFixed(0)}%)\n\nNecessário 70% para avançar.\n\nEstude mais e tente novamente!`, 'error');
      redirectTimerRef.current = setTimeout(() => navigate('/mapa'), 1200);
    }
  };

  const handleResposta = async (opcao) => {
    if (respostaSelecionada !== null) return;
    setTimerAtivo(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (opcao === null) {
      tocarEfeito('timeup');
      setFeedback({ tipo: 'erro', mensagem: '⏰ Tempo esgotado! Você perdeu esta questão.' });
      setRespostaSelecionada('TEMPO');
      const isUltimaQuestaoTempo = indiceAtual + 1 >= questoes.length;
      const tempoEsperaTempo = isUltimaQuestaoTempo ? 250 : 900;
      setTimeout(() => {
        setRespostaSelecionada(null);
        setFeedback(null);
        setTimerAtivo(true);
        if (!isUltimaQuestaoTempo) {
          setIndiceAtual(indiceAtual + 1);
          setTempoRestante(15);
        } else {
          finalizarMeta(acertosRef.current);
        }
      }, tempoEsperaTempo);
      return;
    }
    setRespostaSelecionada(opcao);
    tocarEfeito('clique');
    try {
      const response = await axios.post('/api/responder', {
        questao_id: questoes[indiceAtual].id,
        resposta: opcao,
        meta_id: metaId
      });
      const correta = response.data.correta;
      const pontos = response.data.pontos_ganhos || (correta ? 10 : 0);
      const explicacao = response.data.explicacao || '';
      const respostaCorreta = response.data.resposta_correta;
      if (correta) {
        tocarEfeito('acerto');
        setPontuacao(prev => prev + pontos);
        const novosAcertos = acertosRef.current + 1;
        acertosRef.current = novosAcertos;
        setAcertos(novosAcertos);
        setFeedback({ tipo: 'acerto', mensagem: `✅ Correto! +${pontos} pontos` });
      } else {
        tocarEfeito('erro');
        setFeedback({ tipo: 'erro', mensagem: `❌ Errado! Resposta correta: ${respostaCorreta}. ${explicacao}` });
      }
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      setFeedback({ tipo: 'erro', mensagem: 'Erro ao enviar resposta. Tente novamente.' });
    }
    const isUltimaQuestao = indiceAtual + 1 >= questoes.length;
    if (isUltimaQuestao) {
      setTimeout(() => {
        setRespostaSelecionada(null);
        setFeedback(null);
        finalizarMeta(acertosRef.current);
      }, 250);
      return;
    }
    setTimeout(() => {
      setRespostaSelecionada(null);
      setFeedback(null);
      setTimerAtivo(true);
      setIndiceAtual(indiceAtual + 1);
      setTempoRestante(15);
    }, 1000);
  };

  const renderAudioControls = () => (
    <div className="bg-black/50 border border-purple-500/30 rounded-xl p-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm text-white mb-1">
            <span>🔊 Efeitos Sonoros</span>
            <button onClick={() => setEfeitosAtivos(!efeitosAtivos)} className={`text-xs px-3 py-1 rounded transition ${efeitosAtivos ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
              {efeitosAtivos ? '🔊 ON' : '🔇 OFF'}
            </button>
          </div>
          <input type="range" min="0" max="1" step="0.01" value={volumeEfeitos} onChange={(e) => setVolumeEfeitos(Number(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 accent-purple-500" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900">
        <div className="text-center"><div className="animate-spin text-6xl mb-4">⚔️</div><p className="text-white text-xl">Carregando batalha...</p></div>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-purple-900">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-white mb-4">Não foi possível carregar o quiz.</p>
            <button onClick={() => navigate('/mapa')} className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg text-white transition">Voltar ao Mapa</button>
          </div>
        </div>
        <CustomModal isOpen={modal.isOpen} onClose={() => { setModal(prev => ({ ...prev, isOpen: false })); navigate('/mapa'); }} title={modal.title} message={modal.message} type={modal.type} />
      </>
    );
  }

  if (concluido && !modal.isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-purple-900">
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-800 rounded-xl p-8 text-center shadow-2xl border border-yellow-500">
          <div className="text-7xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-3xl font-bold text-yellow-400 mb-3">Meta Concluída!</h2>
          <p className="text-white mb-2">Você ganhou XP e está mais perto de se tornar um Guardião Lendário!</p>
          <div className="mt-4 text-gray-400">Redirecionando para o mapa...</div>
        </motion.div>
      </div>
    );
  }

  if (questoes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-purple-900">
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <p className="text-white mb-4">Nenhuma questão encontrada para esta meta.</p>
          <button onClick={() => navigate('/mapa')} className="bg-yellow-600 px-6 py-2 rounded-lg text-white">Voltar ao Mapa</button>
        </div>
      </div>
    );
  }

  const questaoAtual = questoes[indiceAtual];
  const progresso = ((indiceAtual + 1) / questoes.length) * 100;

  return (
    <>
      <div className="min-h-screen p-4 flex flex-col bg-gradient-to-br from-gray-900 to-purple-900">
        {renderAudioControls()}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate('/mapa')} className="text-yellow-400 hover:text-yellow-300 transition">← Voltar</button>
          <div className="text-center">
            <div className="text-sm text-gray-400">Meta {metaInfo?.ordem}</div>
            <div className="font-bold text-white">{metaInfo?.titulo?.substring(0, 30)}</div>
          </div>
          <div className="text-yellow-400 font-bold">⭐ {pontuacao}</div>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Questão {indiceAtual + 1} de {questoes.length}</span>
            <span>Acertos: {acertos}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
            <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
          </div>
        </div>
        <div className="mb-4 text-center">
          <div className={`inline-block px-4 py-1 rounded-full ${tempoRestante <= 5 ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>⏱️ {tempoRestante}s</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 flex-1 flex flex-col shadow-xl border border-purple-500/30">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{metaInfo?.icone || '📚'}</div>
            <p className="text-xl font-medium text-white">{questaoAtual.pergunta}</p>
          </div>
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map((letra) => {
              const texto = questaoAtual[`opcao_${letra.toLowerCase()}`] || questaoAtual.opcoes?.[letra];
              if (!texto) return null;
              let bgClass = 'bg-gray-700 hover:bg-gray-600';
              if (respostaSelecionada === letra) {
                bgClass = feedback?.tipo === 'acerto' ? 'bg-green-600' : 'bg-red-600';
              } else if (respostaSelecionada && respostaSelecionada !== letra) {
                bgClass = 'bg-gray-700 opacity-50';
              }
              return (
                <button key={letra} onClick={() => handleResposta(letra)} disabled={respostaSelecionada !== null} className={`w-full text-left p-4 rounded-lg transition-all ${bgClass} border-2 border-transparent hover:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <span className="font-bold text-yellow-400 mr-3">{letra}</span>
                  <span className="text-white">{texto}</span>
                </button>
              );
            })}
          </div>
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-6 p-4 rounded-lg text-center ${feedback.tipo === 'acerto' ? 'bg-green-800/50 border border-green-500' : 'bg-red-800/50 border border-red-500'}`}>
                <p className="text-white">{feedback.mensagem}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <CustomModal isOpen={modal.isOpen} onClose={() => { setModal(prev => ({ ...prev, isOpen: false })); if (modal.onClose) modal.onClose(); }} title={modal.title} message={modal.message} type={modal.type} />
    </>
  );
};

export default Quiz;