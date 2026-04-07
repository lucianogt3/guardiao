// src/components/Mapa.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CustomModal from './CustomModal';
import menuMusica from '../assets/menu_musica.mp3';

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
  cavaleira: '🐉',
  healer: '💚',
  curandeiro: '💚',
  curandeira: '💚',
  guardiao: '🛡️',
  guardiã: '🛡️',
  valquiria: '🪽',
  valquíria: '🪽',
  feiticeira: '🔮',
  feiticeiro: '🔮',
  druida: '🌿',
  berserker: '🪓',
  samurai: '⚔️',
  monge: '🙏',
  assassina: '🗡️',
  assassino: '🗡️'
};

const Mapa = ({ usuario, onLogout }) => {
  const navigate = useNavigate();

  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredMeta, setHoveredMeta] = useState(null);
  const [metasConcluidas, setMetasConcluidas] = useState([]);

  const [musicaAtiva, setMusicaAtiva] = useState(true);
  const [efeitosAtivos, setEfeitosAtivos] = useState(true);
  const [volumeMusica, setVolumeMusica] = useState(0.25);
  const [volumeEfeitos, setVolumeEfeitos] = useState(0.7);
  const [audioCarregado, setAudioCarregado] = useState(false);

  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onClose: null
  });

  const audioRef = useRef(null);
  const efeitosAtivosRef = useRef(true);
  const volumeEfeitosRef = useRef(0.7);

  // DEBUG: Verificar usuário
  useEffect(() => {
    console.log('🔍 Mapa - Usuário recebido:', usuario);
    console.log('🔍 Nome do usuário:', usuario?.nome);
  }, [usuario]);

  useEffect(() => {
    efeitosAtivosRef.current = efeitosAtivos;
  }, [efeitosAtivos]);

  useEffect(() => {
    volumeEfeitosRef.current = volumeEfeitos;
    window.effectVolume = volumeEfeitos;
  }, [volumeEfeitos]);

  const avatarExibicao =
    AVATARES[String(usuario?.avatar || '').toLowerCase()] ||
    usuario?.avatar ||
    '🛡️';

  const mostrarModal = (title, message, type = 'info', onClose = null) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onClose: () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        if (onClose) onClose();
      }
    });
  };

  const tocarEfeito = (nome) => {
    if (!efeitosAtivosRef.current) return;
    if (typeof window.playSound === 'function') {
      window.effectVolume = volumeEfeitosRef.current;
      window.playSound(nome);
    }
  };

  const tocarMusica = async () => {
    if (!audioRef.current || !audioCarregado || !musicaAtiva) return false;
    try {
      audioRef.current.muted = false;
      audioRef.current.volume = volumeMusica;
      audioRef.current.loop = true;
      await audioRef.current.play();
      return true;
    } catch (error) {
      console.warn('Autoplay bloqueado no mapa:', error);
      return false;
    }
  };

  const pausarMusica = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  const carregarMetas = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/metas');
      setMetas(response.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
      setError('Não foi possível carregar a trilha.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!usuario || !usuario.id) {
      navigate('/');
      return;
    }

    const concluidas = usuario.metas_concluidas || [];
    setMetasConcluidas(concluidas);
    carregarMetas();
  }, [usuario, navigate]);

  useEffect(() => {
    const audio = new Audio(menuMusica);
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = volumeMusica;
    audio.muted = false;

    const onCanPlayThrough = () => {
      console.log('Áudio do mapa carregado com sucesso!');
      audioRef.current = audio;
      setAudioCarregado(true);
    };

    const onError = () => {
      console.error('Erro ao carregar áudio do mapa');
      setAudioCarregado(false);
    };

    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('error', onError);
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener('canplaythrough', onCanPlayThrough);
      audio.removeEventListener('error', onError);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volumeMusica;
    if (musicaAtiva) {
      tocarMusica();
    } else {
      pausarMusica();
    }
  }, [volumeMusica, musicaAtiva, audioCarregado]);

  useEffect(() => {
    if (!audioCarregado || !musicaAtiva) return;
    const liberarAudio = async () => {
      await tocarMusica();
    };
    tocarMusica();
    window.addEventListener('click', liberarAudio, { once: true });
    window.addEventListener('keydown', liberarAudio, { once: true });
    window.addEventListener('touchstart', liberarAudio, { once: true });
    return () => {
      window.removeEventListener('click', liberarAudio);
      window.removeEventListener('keydown', liberarAudio);
      window.removeEventListener('touchstart', liberarAudio);
    };
  }, [audioCarregado, musicaAtiva, volumeMusica]);

  const iniciarQuiz = (metaId) => {
    tocarEfeito('clique');
    navigate(`/quiz/${metaId}`);
  };

  const irParaBatalha = () => {
    tocarEfeito('clique');
    navigate('/batalha');
  };

  const isMetaDesbloqueada = (meta) => {
    if (!usuario) return false;
    if (meta.ordem === 1) return true;
    const metaAnterior = meta.ordem - 1;
    return metasConcluidas.includes(metaAnterior);
  };

  const isMetaConcluida = (meta) => {
    if (!usuario) return false;
    return metasConcluidas.includes(meta.id);
  };

  const getNomeMetaAnterior = (meta) => {
    const metaAnterior = metas.find((m) => m.ordem === meta.ordem - 1);
    return metaAnterior ? metaAnterior.titulo : 'anterior';
  };

  const handleCardClick = (meta) => {
    const desbloqueada = isMetaDesbloqueada(meta);
    const concluida = isMetaConcluida(meta);

    if (desbloqueada && !concluida) {
      tocarEfeito('clique');
      iniciarQuiz(meta.id);
    } else if (concluida) {
      tocarEfeito('clique');
      mostrarModal(
        '🏆 META CONCLUÍDA! 🏆',
        `Você já completou a missão "${meta.titulo}"!\n\nSiga para o próximo desafio!`,
        'success'
      );
    } else {
      tocarEfeito('erro');
      mostrarModal(
        '🔒 MISSÃO BLOQUEADA 🔒',
        `Complete a missão "${getNomeMetaAnterior(meta)}" primeiro para desbloquear "${meta.titulo}"!`,
        'error'
      );
    }
  };

  const renderAudioControls = () => (
    <div className="bg-black/50 border border-purple-500/30 rounded-xl p-3">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm text-white mb-1">
            <span>🎵 Música</span>
            <button onClick={() => setMusicaAtiva(!musicaAtiva)} className={`text-xs px-3 py-1 rounded ${musicaAtiva ? 'bg-purple-600' : 'bg-gray-700'}`}>
              {musicaAtiva ? 'ON' : 'OFF'}
            </button>
          </div>
          <input type="range" min="0" max="1" step="0.01" value={volumeMusica} onChange={(e) => setVolumeMusica(Number(e.target.value))} className="w-full h-2 rounded-lg bg-gray-700 accent-purple-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm text-white mb-1">
            <span>🔊 Efeitos</span>
            <button onClick={() => setEfeitosAtivos(!efeitosAtivos)} className={`text-xs px-3 py-1 rounded ${efeitosAtivos ? 'bg-purple-600' : 'bg-gray-700'}`}>
              {efeitosAtivos ? 'ON' : 'OFF'}
            </button>
          </div>
          <input type="range" min="0" max="1" step="0.01" value={volumeEfeitos} onChange={(e) => setVolumeEfeitos(Number(e.target.value))} className="w-full h-2 rounded-lg bg-gray-700 accent-purple-500" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900">
        <div className="text-center"><div className="animate-spin text-6xl mb-4">🗺️</div><p className="text-white text-xl">Carregando sua jornada...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900">
        <div className="bg-red-900/50 p-8 rounded-xl text-center">
          <p className="text-white mb-4">{error}</p>
          <button onClick={carregarMetas} className="bg-yellow-600 px-4 py-2 rounded">Tentar novamente</button>
        </div>
      </div>
    );
  }

  const progressoPercentual = (metasConcluidas.length / 6) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-purple-950">
      {/* Header */}
      <div className="border-b border-purple-500/30 bg-black/25 backdrop-blur-sm px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 p-[3px] shadow-lg shadow-yellow-500/20">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-4xl">
                  {avatarExibicao}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-purple-300 mb-1">Guardião em missão</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight drop-shadow">
                {usuario?.nome || 'Guardião Lendário'}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">Nível {usuario?.level || 1}</span>
                <span className="px-3 py-1 rounded-full bg-purple-500/15 text-purple-200 border border-purple-500/20">⭐ {usuario?.xp || 0} XP</span>
                <span className="px-3 py-1 rounded-full bg-sky-500/15 text-sky-200 border border-sky-500/20">🏥 {usuario?.setor || 'Setor não informado'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={irParaBatalha} className="bg-red-600 hover:bg-red-700 px-5 py-2.5 rounded-lg text-white flex items-center gap-2 transition font-semibold">⚔️ Battle</button>
            <button onClick={() => { tocarEfeito('clique'); navigate('/perfil'); }} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-white transition font-semibold">👤 Perfil</button>
            <button onClick={() => { tocarEfeito('clique'); navigate('/ranking'); }} className="bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-lg text-white transition font-semibold">🏆 Ranking</button>
            <button onClick={() => { tocarEfeito('clique'); onLogout(); }} className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-lg text-white transition font-semibold">🚪 Sair</button>
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="px-6 py-4 bg-black/30 border-b border-purple-500/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div><h2 className="text-lg md:text-xl font-bold text-yellow-400">Trilha do Guardião</h2><p className="text-sm text-gray-400">Complete as missões em ordem</p></div>
            <div className="w-full md:max-w-md">
              <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Progresso</span><span>{metasConcluidas.length} / 6</span></div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progressoPercentual}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Áudio */}
      <div className="px-6 py-3 border-b border-purple-500/20"><div className="max-w-6xl mx-auto">{renderAudioControls()}</div></div>

      {/* Cards */}
      <div className="py-12 px-4 overflow-x-auto">
        <div className="flex flex-wrap justify-center items-start gap-8 md:gap-16 min-w-[700px]">
          {metas.map((meta, index) => {
            const desbloqueada = isMetaDesbloqueada(meta);
            const concluida = isMetaConcluida(meta);
            return (
              <div key={meta.id} className="flex flex-col items-center">
                {index > 0 && <div className="hidden md:block w-16 md:w-20 h-0.5 border-t-2 border-dashed border-yellow-500/50 -mt-20 mb-10" />}
                <div onClick={() => handleCardClick(meta)} onMouseEnter={() => setHoveredMeta(meta.id)} onMouseLeave={() => setHoveredMeta(null)} className={`relative w-56 md:w-72 p-5 rounded-2xl text-center transition-all duration-300 cursor-pointer ${concluida ? 'bg-gradient-to-br from-green-800 to-green-950 border-2 border-green-400' : desbloqueada ? 'bg-gradient-to-br from-gray-800 to-gray-950 border-2 border-yellow-500/50 hover:scale-105' : 'bg-gradient-to-br from-gray-800 to-gray-950 border-2 border-gray-600 opacity-60'}`}>
                  {concluida && <div className="absolute -top-3 -right-3 bg-green-500 rounded-full p-2 shadow-lg"><span className="text-white text-xs font-bold">✓</span></div>}
                  <div className="text-6xl mb-3">{meta.icone || '📚'}</div>
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Missão {meta.ordem}</div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-2">{meta.titulo}</h3>
                  <p className="text-sm text-gray-300 mb-3 line-clamp-2 min-h-[40px]">{meta.descricao || 'Complete esta missão!'}</p>
                  <div className="flex justify-center items-center gap-2 mb-2"><span className="text-yellow-400">⭐</span><span className="text-white text-sm font-medium">100 XP</span></div>
                  <div className="mt-3 text-xs font-semibold">{concluida ? <span className="text-green-400">✅ CONCLUÍDA</span> : desbloqueada ? <span className="text-yellow-400 animate-pulse">✨ DISPONÍVEL</span> : <span className="text-gray-500">🔒 BLOQUEADA</span>}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-600 rounded"></div><span className="text-gray-300">Concluída</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-700 rounded border-2 border-yellow-500"></div><span className="text-gray-300">Disponível</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-700 rounded opacity-60 border border-gray-500"></div><span className="text-gray-300">Bloqueada</span></div>
        </div>
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">🎯 Complete as missões em ordem para desbloquear novos desafios!</p>
          {metasConcluidas.length > 0 && metasConcluidas.length < 6 && (<p className="text-yellow-500 text-sm mt-2 animate-pulse">⚡ Próxima missão: {metas.find(m => m.id === metasConcluidas.length + 1)?.titulo || 'Missão Final'}</p>)}
        </div>
      </div>

      <CustomModal isOpen={modal.isOpen} onClose={() => { if (modal.onClose) modal.onClose(); else setModal(prev => ({ ...prev, isOpen: false })); }} title={modal.title} message={modal.message} type={modal.type} />
    </div>
  );
};

export default Mapa;