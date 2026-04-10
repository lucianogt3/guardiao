import React, { useEffect, useRef, useState } from 'react';

const AudioController = () => {
  const [somAtivado, setSomAtivado] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioContextRef = useRef(null);

  // Função para gerar beep simples (motor de áudio)
  const beep = (frequencia = 440, duracao = 0.2, tipo = 'sine') => {
    if (!somAtivado || muted) return;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      
      // Retomar o contexto se o navegador suspender
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequencia;
      oscillator.type = tipo;
      gainNode.gain.value = 0.1; // Volume mais baixo para não assustar
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duracao);
      oscillator.stop(ctx.currentTime + duracao);
    } catch (e) {
      console.log('Erro ao gerar som:', e);
    }
  };

  // Registrar funções globais para serem usadas em qualquer parte do app
  useEffect(() => {
    window.playSound = (nome) => {
      // Mapeamento de sons para frequências
      switch(nome) {
        case 'acerto':
        case 'conquista':
        case 'levelup':
          beep(880, 0.3, 'sine'); // Som agudo (sucesso)
          break;
        case 'erro':
        case 'derrota':
        case 'timeup':
          beep(220, 0.5, 'sawtooth'); // Som grave (falha)
          break;
        case 'clique':
          beep(660, 0.1, 'sine'); // Clique curto
          break;
        case 'espada':
          beep(330, 0.2, 'square'); // Som de metal
          break;
        default:
          beep(440, 0.2, 'sine');
      }
    };

    // Função para mudar o volume ou silenciar via código
    window.setAudioMuted = (valor) => {
      setMuted(valor);
    };

    return () => {
      delete window.playSound;
      delete window.setAudioMuted;
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [somAtivado, muted]);

  // Ativa o motor de áudio no primeiro clique do usuário (exigência do navegador)
  useEffect(() => {
    const ativar = () => {
      setSomAtivado(true);
      console.log("⚔️ Motor de áudio dos Guardiões ativado!");
    };

    window.addEventListener('click', ativar, { once: true });
    window.addEventListener('touchstart', ativar, { once: true });

    return () => {
      window.removeEventListener('click', ativar);
      window.removeEventListener('touchstart', ativar);
    };
  }, []);

  // RETORNO VAZIO: O componente funciona no fundo sem sujar a tela
  return null;
};

export default AudioController;