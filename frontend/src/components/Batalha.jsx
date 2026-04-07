// src/components/Batalha.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'

import battleMusica from '../assets/battle.mp3'
import acertoAudio from '../assets/acerto.mp3'
import erroAudio from '../assets/erro.mp3'
import cliqueAudio from '../assets/clique.mp3'
import vitoriaAudio from '../assets/conquista.mp3'
import derrotaAudio from '../assets/derrota.mp3'
import timeupAudio from '../assets/timeup.mp3'

const Batalha = ({ usuario }) => {
  const navigate = useNavigate()

  const [status, setStatus] = useState('procurando')
  const [contagem, setContagem] = useState(0)
  const [oponente, setOponente] = useState(null)
  const [hp, setHp] = useState({ eu: 100, oponente: 100 })
  const [hpAnterior, setHpAnterior] = useState({ eu: 100, oponente: 100 })
  const [acertos, setAcertos] = useState({ eu: 0, oponente: 0 })
  const [perguntaAtual, setPerguntaAtual] = useState(null)
  const [tempo, setTempo] = useState(15)
  const [respondeu, setRespondeu] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [salaId, setSalaId] = useState(null)
  const [jogadoresOnline, setJogadoresOnline] = useState([])
  const [totalRodadas, setTotalRodadas] = useState(0)
  const [rodadaAtual, setRodadaAtual] = useState(0)
  const [desafioPendente, setDesafioPendente] = useState(null)
  const [conectado, setConectado] = useState(false)
  const [respostaFeedback, setRespostaFeedback] = useState(null)
  const [danoMsg, setDanoMsg] = useState(null)
  const [comboMsg, setComboMsg] = useState(null)
  const [bloqueado, setBloqueado] = useState(false)
  const [mostrarConfirmacaoSaida, setMostrarConfirmacaoSaida] = useState(false)
  const [aguardandoResposta, setAguardandoResposta] = useState(false)

  const [musicaAtiva, setMusicaAtiva] = useState(true)
  const [volumeMusica, setVolumeMusica] = useState(0.25)
  const [volumeEfeitos, setVolumeEfeitos] = useState(0.7)
  const [audioCarregado, setAudioCarregado] = useState(false)

  const socketRef = useRef(null)
  const timerRef = useRef(null)
  const respondeuRef = useRef(false)
  const musicaRef = useRef(null)

  // Sons
  const acertoSoundRef = useRef(null)
  const erroSoundRef = useRef(null)
  const cliqueSoundRef = useRef(null)
  const vitoriaSoundRef = useRef(null)
  const derrotaSoundRef = useRef(null)
  const timeupSoundRef = useRef(null)

  const tocarEfeito = (nome) => {
    let soundRef = null
    switch(nome) {
      case 'acerto': soundRef = acertoSoundRef.current; break
      case 'erro': soundRef = erroSoundRef.current; break
      case 'clique': soundRef = cliqueSoundRef.current; break
      case 'vitoria': soundRef = vitoriaSoundRef.current; break
      case 'derrota': soundRef = derrotaSoundRef.current; break
      case 'timeup': soundRef = timeupSoundRef.current; break
      default: return
    }
    if (soundRef) {
      try {
        soundRef.volume = volumeEfeitos
        soundRef.currentTime = 0
        soundRef.play().catch(() => {})
      } catch(e) {}
    }
  }

  // Carregar sons
  useEffect(() => {
    acertoSoundRef.current = new Audio(acertoAudio)
    erroSoundRef.current = new Audio(erroAudio)
    cliqueSoundRef.current = new Audio(cliqueAudio)
    vitoriaSoundRef.current = new Audio(vitoriaAudio)
    derrotaSoundRef.current = new Audio(derrotaAudio)
    timeupSoundRef.current = new Audio(timeupAudio)
    
    const sounds = [acertoSoundRef.current, erroSoundRef.current, cliqueSoundRef.current, vitoriaSoundRef.current, derrotaSoundRef.current, timeupSoundRef.current]
    sounds.forEach(sound => { if(sound) { sound.load(); sound.volume = volumeEfeitos } })
  }, [])

  // Música
  useEffect(() => {
    const musica = new Audio(battleMusica)
    musica.loop = true
    musica.volume = volumeMusica
    musicaRef.current = musica
    setAudioCarregado(true)
    return () => { musica.pause() }
  }, [])

  useEffect(() => {
    if (musicaRef.current) {
      musicaRef.current.volume = volumeMusica
      if (musicaAtiva && status === 'batalhando') {
        musicaRef.current.play().catch(() => {})
      } else {
        musicaRef.current.pause()
      }
    }
  }, [musicaAtiva, volumeMusica, status])

  // Socket.IO
  useEffect(() => {
    if (!usuario || !usuario.id) {
      navigate('/')
      return
    }

    console.log('🔌 Conectando ao servidor...')
    
    const newSocket = io('http://localhost:5030', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socketRef.current = newSocket

    newSocket.on('connect', () => {
  console.log('✅ Conectado ao servidor')
  setConectado(true)
  newSocket.emit('registrar_usuario_online', { usuario_id: usuario.id })   // ← corrigido
  newSocket.emit('get_online_players')
})

    newSocket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor')
      setConectado(false)
    })

    newSocket.on('lista_online', (lista) => {
      const outros = (lista || []).filter(j => j.id !== usuario.id)
      setJogadoresOnline(outros)
      console.log('👥 Jogadores online:', outros.length)
    })

    // Receber desafio
    newSocket.on('receber_desafio', (data) => {
      console.log('📨 Desafio recebido de:', data.desafiante_nome)
      tocarEfeito('clique')
      setDesafioPendente({
        id: data.desafio_id,
        desafianteId: data.desafiante_id,
        desafianteNome: data.desafiante_nome,
        desafianteAvatar: data.desafiante_avatar
      })
      setStatus('desafio_recebido')
    })

    newSocket.on('desafio_enviado', (data) => {
      console.log('✅ Desafio enviado para:', data.desafiado_nome)
      const msg = document.createElement('div')
      msg.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg z-50'
      msg.textContent = `Desafio enviado para ${data.desafiado_nome}!`
      document.body.appendChild(msg)
      setTimeout(() => msg.remove(), 3000)
    })

    newSocket.on('desafio_aceito', () => {
      console.log('⚔️ Desafio aceito!')
    })

    newSocket.on('desafio_recusado', (data) => {
      console.log('❌ Desafio recusado:', data.mensagem)
      setDesafioPendente(null)
      setStatus('procurando')
      const msg = document.createElement('div')
      msg.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg z-50'
      msg.textContent = data.mensagem || 'O jogador recusou seu desafio'
      document.body.appendChild(msg)
      setTimeout(() => msg.remove(), 3000)
    })

    // Batalha iniciada
    newSocket.on('batalha_iniciada', (data) => {
      console.log('⚔️ BATALHA INICIADA!', data)
      tocarEfeito('clique')
      setOponente(data.oponente)
      setHp({ eu: data.seu_hp, oponente: data.hp_oponente })
      setHpAnterior({ eu: data.seu_hp, oponente: data.hp_oponente })
      setAcertos({ eu: 0, oponente: 0 })
      setSalaId(data.sala_id)
      setTotalRodadas(data.total_rodadas)
      setRodadaAtual(0)
      setDesafioPendente(null)
      setStatus('batalhando')
      setAguardandoResposta(false)
      
      setContagem(3)
      const interval = setInterval(() => {
        setContagem(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

    // Nova pergunta
    newSocket.on('nova_pergunta', (data) => {
      console.log('📝 Nova pergunta:', data.rodada, '/', data.total)
      setPerguntaAtual(data)
      setTempo(data.tempo || 15)
      setRodadaAtual(data.rodada)
      setRespondeu(false)
      setAguardandoResposta(true)
      respondeuRef.current = false
      setRespostaFeedback(null)
      setDanoMsg(null)
      setBloqueado(false)

      if (timerRef.current) clearInterval(timerRef.current)
      let tempoRestante = data.tempo || 15
      timerRef.current = setInterval(() => {
        tempoRestante -= 1
        setTempo(tempoRestante)
        if (tempoRestante <= 0) {
          clearInterval(timerRef.current)
          if (!respondeuRef.current) {
            tocarEfeito('timeup')
            setRespostaFeedback({ tipo: 'timeout', mensagem: '⏰ Tempo esgotado!' })
            setAguardandoResposta(false)
            setTimeout(() => setRespostaFeedback(null), 2000)
          }
        }
      }, 1000)
    })

    // Resultado da rodada
    newSocket.on('resultado_rodada', (data) => {
      console.log('🎯 Resultado:', data)
      clearInterval(timerRef.current)
      setAguardandoResposta(false)
      
      setHpAnterior(hp)
      setHp({ eu: data.hp_jogador1, oponente: data.hp_jogador2 })
      
      if (data.acertou === usuario.id) {
        tocarEfeito('acerto')
        setAcertos(prev => ({ ...prev, eu: prev.eu + 1 }))
        setRespostaFeedback({ tipo: 'acerto', mensagem: `✅ Correto! Causou ${data.dano} de dano!` })
        setDanoMsg({ quem: 'oponente', dano: data.dano })
        if (data.combo_ativado) {
          setComboMsg(data.mensagem_combo || '⚡ COMBO!')
          setTimeout(() => setComboMsg(null), 2000)
        }
      } else if (data.acertou !== null && data.acertou !== usuario.id) {
        tocarEfeito('erro')
        setAcertos(prev => ({ ...prev, oponente: prev.oponente + 1 }))
        setRespostaFeedback({ tipo: 'erro', mensagem: `❌ Errado! Sofreu ${data.dano} de dano!` })
        setDanoMsg({ quem: 'voce', dano: data.dano })
        if (data.bloqueado) {
          setBloqueado(true)
          setTimeout(() => setBloqueado(false), 1500)
        }
      }
      
      setTimeout(() => {
        setRespostaFeedback(null)
        setDanoMsg(null)
      }, 2000)
    })

    // Fim da batalha
    newSocket.on('fim_batalha', (data) => {
      console.log('🏁 FIM DA BATALHA! Vencedor:', data.vencedor_nome)
      clearInterval(timerRef.current)
      
      const venceu = data.vencedor_id === usuario.id
      if (venceu) tocarEfeito('vitoria')
      else tocarEfeito('derrota')
      
      setResultado({
        venceu: venceu,
        vencedor: data.vencedor_nome,
        hpFinal: data.hp_final,
        acertosFinal: data.acertos_final
      })
      setStatus('finalizado')
      
      setTimeout(() => navigate('/mapa'), 5000)
    })

    newSocket.on('erro', (data) => {
      console.error('Erro:', data)
    })

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [usuario, navigate])

  const enviarDesafio = (jogador) => {
    if (!socketRef.current) return
    tocarEfeito('clique')
    console.log('📨 Enviando desafio para:', jogador.nome)
    socketRef.current.emit('enviar_desafio', {
      desafiante_id: usuario.id,
      desafiado_id: jogador.id
    })
  }

  const aceitarDesafio = () => {
    if (!socketRef.current || !desafioPendente) return
    tocarEfeito('clique')
    console.log('✅ Aceitando desafio de:', desafioPendente.desafianteNome)
    socketRef.current.emit('aceitar_desafio', {
      desafio_id: desafioPendente.id,
      desafiado_id: usuario.id
    })
    setDesafioPendente(null)
    setStatus('procurando')
  }

  const recusarDesafio = () => {
    if (!socketRef.current || !desafioPendente) return
    tocarEfeito('clique')
    console.log('❌ Recusando desafio de:', desafioPendente.desafianteNome)
    socketRef.current.emit('recusar_desafio', {
      desafio_id: desafioPendente.id,
      desafiado_id: usuario.id
    })
    setDesafioPendente(null)
    setStatus('procurando')
  }

  const buscarOponente = () => {
    if (!socketRef.current) return
    tocarEfeito('clique')
    console.log('🔍 Buscando oponente aleatório...')
    socketRef.current.emit('buscar_oponente', { usuario_id: usuario.id })
  }

  const responder = (resposta) => {
    if (respondeuRef.current || !perguntaAtual || !socketRef.current || !salaId || !aguardandoResposta) return
    
    tocarEfeito('clique')
    console.log('📝 Respondendo:', resposta)
    respondeuRef.current = true
    setRespondeu(true)
    setAguardandoResposta(false)
    
    socketRef.current.emit('responder_batalha', {
      sala_id: salaId,
      usuario_id: usuario.id,
      resposta: resposta,
      tempo: tempo
    })
  }

  const desistir = () => {
    setMostrarConfirmacaoSaida(false)
    navigate('/mapa')
  }

  const getAvatarIcon = (avatar) => {
    const avatares = {
      guerreiro: '⚔️', mago: '🔮', maga: '🧙', arqueiro: '🏹', arqueira: '🏹',
      valquiria: '🛡️', paladino: '🛡️', ninja: '🥷', cavaleiro: '🐉', healer: '💚',
      guardiao: '🛡️', druida: '🌿', berserker: '🪓', samurai: '⚔️', monge: '🙏'
    }
    return avatares[avatar?.toLowerCase()] || '⚔️'
  }

  // Tela de contagem regressiva
  if (contagem > 0 && status === 'batalhando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-red-900">
        <div className="text-center">
          <div className="text-9xl font-bold text-yellow-500 animate-pulse">{contagem}</div>
          <p className="text-2xl text-white mt-4">Preparar...</p>
        </div>
      </div>
    )
  }

  // Tela de desafio recebido
  if (status === 'desafio_recebido' && desafioPendente) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-red-900">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border-2 border-yellow-500"
        >
          <div className="text-6xl mb-4 animate-bounce">⚔️</div>
          <h2 className="text-2xl font-bold mb-2 text-yellow-400">Desafio Recebido!</h2>
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <span className="text-3xl mr-2">{getAvatarIcon(desafioPendente.desafianteAvatar)}</span>
            <span className="text-xl font-bold text-yellow-400">{desafioPendente.desafianteNome}</span>
            <p className="text-gray-300 mt-2">desafia você para um duelo!</p>
          </div>
          <div className="flex gap-4">
            <button onClick={aceitarDesafio} className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold text-lg transition">⚔️ ACEITAR</button>
            <button onClick={recusarDesafio} className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-bold text-lg transition">❌ RECUSAR</button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Tela de procura
  if (status === 'procurando') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-red-900">
        <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border-2 border-purple-500">
          <div className="text-6xl mb-4 animate-pulse">⚔️</div>
          <h2 className="text-2xl font-bold mb-2 text-yellow-400">Arena de Duelos</h2>
          <p className="text-gray-400 mb-4">Desafie outros guardiões ou entre no matchmaking!</p>

          <div className="mb-4 text-sm">
            {conectado ? <span className="text-green-400">✅ Conectado ao servidor</span> : <span className="text-red-400">⚠️ Conectando...</span>}
          </div>

          <div className="mt-4 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold mb-3 text-purple-300">👥 Heróis Online ({jogadoresOnline.length})</h3>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {jogadoresOnline.length === 0 && (
                <p className="text-gray-500 text-center py-4">{conectado ? 'Nenhum herói online' : 'Aguardando conexão...'}</p>
              )}
              {jogadoresOnline.map((j, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAvatarIcon(j.avatar)}</span>
                    <div>
                      <p className="font-bold text-white">{j.nome}</p>
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Online
                      </div>
                    </div>
                  </div>
                  <button onClick={() => enviarDesafio(j)} className="bg-yellow-600 hover:bg-yellow-700 py-2 px-4 rounded-lg text-sm font-bold transition">⚔️ Desafiar</button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-gray-500 text-sm">─ ou ─</div>

          <button onClick={buscarOponente} className="w-full mt-3 bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-bold transition">🎲 Matchmaking Aleatório</button>
          <button onClick={() => navigate('/mapa')} className="w-full mt-3 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg transition">Cancelar</button>
        </div>
      </div>
    )
  }

  // Tela de resultado
  if (status === 'finalizado' && resultado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-red-900">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-gray-800 rounded-2xl p-8 text-center max-w-md w-full border-2 border-yellow-500">
          <div className="text-7xl mb-4">{resultado.venceu ? '🏆' : '💀'}</div>
          <h2 className="text-3xl font-bold mb-2 text-yellow-400">{resultado.venceu ? 'VITÓRIA!' : 'DERROTA!'}</h2>
          <p className="text-white mb-4">{resultado.venceu ? 'Você venceu o duelo!' : 'Você foi derrotado!'}</p>
          <div className="text-gray-400 text-sm">
            <p>Seus acertos: {resultado.acertosFinal?.[usuario.id] || 0}</p>
            <p>Seu HP final: {resultado.hpFinal?.[usuario.id] || 0}</p>
          </div>
          <p className="text-gray-500 mt-4">Redirecionando para o mapa...</p>
        </motion.div>
      </div>
    )
  }

  // Tela da batalha ativa
  return (
    <div className="min-h-screen p-4 flex flex-col bg-gradient-to-b from-gray-900 to-red-900">
      {/* Botão desistir */}
      <div className="absolute top-4 left-4 z-50">
        <button onClick={() => setMostrarConfirmacaoSaida(true)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-bold">🚪 Desistir</button>
      </div>

      {/* Controles de música */}
      <div className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-lg flex gap-2">
        <button onClick={() => setMusicaAtiva(!musicaAtiva)} className="text-white text-sm px-2 py-1 rounded bg-purple-600">
          {musicaAtiva ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Combo message */}
      <AnimatePresence>
        {comboMsg && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-red-600 border-4 border-yellow-400 rounded-2xl p-6 text-center">
            <span className="text-3xl font-bold text-yellow-300">{comboMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bloqueado */}
      <AnimatePresence>
        {bloqueado && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-45">
            <div className="bg-red-600 border-4 border-yellow-400 rounded-2xl p-8 text-center">
              <span className="text-4xl font-bold text-white">🔒 VOCÊ FOI BLOQUEADO! 🔒</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HP do jogador */}
      <div className="mb-4 mt-16">
        <div className="flex justify-between text-white mb-1"><span>🗡️ VOCÊ</span><span>{hp.eu} HP</span></div>
        <div className="w-full bg-red-800 rounded-full h-6 overflow-hidden">
          <motion.div 
            initial={{ width: `${hpAnterior.eu}%` }}
            animate={{ width: `${hp.eu}%` }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-green-500 to-green-400 h-6 rounded-full transition-all"
          />
        </div>
      </div>

      {/* HP do oponente */}
      <div className="mb-6">
        <div className="flex justify-between text-white mb-1"><span>🛡️ {oponente?.nome || 'Oponente'}</span><span>{hp.oponente} HP</span></div>
        <div className="w-full bg-red-800 rounded-full h-6 overflow-hidden">
          <motion.div 
            initial={{ width: `${hpAnterior.oponente}%` }}
            animate={{ width: `${hp.oponente}%` }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-r from-red-500 to-red-400 h-6 rounded-full transition-all"
          />
        </div>
      </div>

      {/* Placar */}
      <div className="flex justify-center gap-8 mb-4 text-sm">
        <span className="text-green-400">✓ {acertos.eu}</span>
        <span className="text-gray-500">|</span>
        <span className="text-red-400">{acertos.oponente} ✓</span>
      </div>

      {/* Rodada */}
      <div className="text-center mb-2 text-sm text-gray-400">Rodada {rodadaAtual} de {totalRodadas}</div>

      {/* Timer */}
      <div className="text-center mb-4">
        <div className={`inline-block px-4 py-2 rounded-full ${tempo <= 5 ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>⏱️ {tempo}s</div>
      </div>

      {/* Mensagem de dano */}
      <AnimatePresence>
        {danoMsg && (
          <motion.div initial={{ x: danoMsg.quem === 'voce' ? -100 : 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: danoMsg.quem === 'voce' ? -100 : 100, opacity: 0 }}
            className={`fixed top-1/3 left-1/2 transform -translate-x-1/2 z-40 text-2xl font-bold px-6 py-3 rounded-full border-2 ${danoMsg.quem === 'voce' ? 'text-red-400 bg-black/80 border-red-500' : 'text-green-400 bg-black/80 border-green-500'}`}>
            {danoMsg.quem === 'voce' ? `💔 VOCÊ SOFREU -${danoMsg.dano} HP!` : `⚔️ OPONENTE SOFREU -${danoMsg.dano} HP!`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {respostaFeedback && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-40 px-6 py-3 rounded-full text-lg font-bold ${respostaFeedback.tipo === 'acerto' ? 'bg-green-600' : 'bg-red-600'}`}>
            {respostaFeedback.mensagem}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pergunta */}
      {perguntaAtual && aguardandoResposta ? (
        <div className="bg-gray-800 rounded-2xl p-6 flex-1 border-2 border-purple-500">
          <p className="text-xl text-white text-center mb-6">{perguntaAtual.pergunta}</p>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(perguntaAtual.opcoes || {}).map(([letra, texto]) => texto && (
              <button key={letra} onClick={() => responder(letra)} disabled={respondeu}
                className={`p-4 rounded-xl text-left transition-all ${respondeu ? 'bg-gray-800 cursor-not-allowed opacity-60' : 'bg-gray-700 hover:bg-gray-600 hover:scale-102'} border-2 border-transparent hover:border-yellow-500`}>
                <span className="font-bold mr-3 text-yellow-400 text-lg">{letra}</span>
                <span className="text-white">{texto}</span>
              </button>
            ))}
          </div>
        </div>
      ) : perguntaAtual && !aguardandoResposta ? (
        <div className="bg-gray-800 rounded-2xl p-6 flex-1 flex items-center justify-center border-2 border-purple-500">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-spin">⏳</div>
            <p className="text-gray-300">Aguardando resultado...</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-6 flex-1 flex items-center justify-center border-2 border-purple-500">
          <div className="text-center">
            <div className="text-5xl mb-3 animate-pulse">⚔️</div>
            <p className="text-gray-300">Aguardando próxima rodada...</p>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {mostrarConfirmacaoSaida && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 text-center max-w-sm w-full border-2 border-yellow-500">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">Desistir da Batalha?</h2>
            <p className="text-white mb-4">Você perderá esta batalha por W.O.!</p>
            <div className="flex gap-4">
              <button onClick={() => setMostrarConfirmacaoSaida(false)} className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg">Cancelar</button>
              <button onClick={desistir} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg">Desistir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Batalha