import React, { useEffect, useRef, useState } from 'react'

const AudioController = () => {
  const [somAtivado, setSomAtivado] = useState(false)
  const [muted, setMuted] = useState(false)
  const audioContextRef = useRef(null)

  // Função para gerar beep simples (fallback quando não há arquivos)
  const beep = (frequencia = 440, duracao = 0.2, tipo = 'sine') => {
    if (!somAtivado || muted) return
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = frequencia
      oscillator.type = tipo
      gainNode.gain.value = 0.3
      
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duracao)
      oscillator.stop(ctx.currentTime + duracao)
    } catch (e) {
      console.log('Erro ao gerar beep:', e)
    }
  }

  // Registrar funções globais
  useEffect(() => {
    window.playSound = (nome) => {
      if (!somAtivado || muted) return
      
      // Mapeamento de sons para frequências
      switch(nome) {
        case 'acerto':
        case 'conquista':
        case 'levelup':
        case 'vitoria':
          beep(880, 0.3, 'sine')
          break
        case 'erro':
        case 'derrota':
        case 'timeup':
          beep(220, 0.5, 'sawtooth')
          break
        case 'clique':
          beep(660, 0.1, 'sine')
          break
        case 'espada':
          beep(330, 0.2, 'square')
          break
        default:
          beep(440, 0.2, 'sine')
      }
    }

    window.setAudioMode = (modo) => {
      console.log('Modo de áudio:', modo)
    }

    return () => {
      delete window.playSound
      delete window.setAudioMode
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [somAtivado, muted])

  const ativarSom = () => {
    setSomAtivado(true)
    setMuted(false)
    // Toca um clique de teste
    setTimeout(() => {
      window.playSound?.('clique')
    }, 100)
  }

  const toggleMute = () => {
    if (!somAtivado) {
      ativarSom()
    } else {
      setMuted(!muted)
      window.playSound?.('clique')
    }
  }

  if (!somAtivado) {
    return (
      <button
        onClick={ativarSom}
        className="fixed bottom-4 right-4 z-50 bg-yellow-600 text-black font-bold rounded-full px-4 py-2 shadow-lg hover:scale-105 transition animate-pulse"
      >
        🔊 ATIVAR SOM
      </button>
    )
  }

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-70 rounded-full p-3 shadow-lg hover:scale-110 transition"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

export default AudioController