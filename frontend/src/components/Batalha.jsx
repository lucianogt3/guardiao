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

  // Estados
  const [status, setStatus] = useState('procurando')
  const [contagem, setContagem] = useState(0)
  const [oponente, setOponente] = useState(null)
  const [hp, setHp] = useState({ eu: 100, oponente: 100 })
  const [perguntaAtual, setPerguntaAtual] = useState(null)
  const [tempo, setTempo] = useState(15)
  const [respondeu, setRespondeu] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [salaId, setSalaId] = useState(null)
  const [jogadoresOnline, setJogadoresOnline] = useState([])
  const [rodadaAtual, setRodadaAtual] = useState(0)
  const [totalRodadas, setTotalRodadas] = useState(0)
  const [desafioPendente, setDesafioPendente] = useState(null)
  const [conectado, setConectado] = useState(false)
  const [respostaFeedback, setRespostaFeedback] = useState(null)
  const [danoMsg, setDanoMsg] = useState(null)

  // Refs
  const socketRef = useRef(null)
  const timerRef = useRef(null)
  const respondeuRef = useRef(false)
  const musicaRef = useRef(null)

  // Sons
  const sons = useRef({
    acerto: new Audio(acertoAudio),
    erro: new Audio(erroAudio),
    clique: new Audio(cliqueAudio),
    vitoria: new Audio(vitoriaAudio),
    derrota: new Audio(derrotaAudio),
    timeup: new Audio(timeupAudio)
  })

  const tocarEfeito = (nome) => {
    const sound = sons.current[nome]
    if (sound) {
      sound.volume = 0.5
      sound.currentTime = 0
      sound.play().catch(() => {})
    }
  }

  // Socket.IO
  useEffect(() => {
    if (!usuario?.id) return

    const URL_SERVIDOR = window.location.hostname === 'localhost' 
      ? 'http://localhost:5030' 
      : 'https://guardiao.nursetec.com.br'

    // CONEXÃO CORRIGIDA: Inicia por polling para estabilizar no Windows/Nginx
    const socket = io(URL_SERVIDOR, {
      transports: ['polling', 'websocket'],
      secure: true,
      reconnection: true,
      reconnectionAttempts: 10,
      path: '/socket.io/'
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Conectado ao Hall de Duelos')
      setConectado(true)
      socket.emit('registrar_usuario_online', { usuario_id: usuario.id })
    })

    socket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor')
      setConectado(false)
    })

    // ATUALIZAÇÃO AUTOMÁTICA DA LISTA
    socket.on('lista_online', (lista) => {
      console.log('👥 Lista completa recebida do servidor:', lista)
      console.log('👤 Usuário atual ID:', usuario.id)
      
      // Filtra o próprio usuário da lista
      const outrosJogadores = lista.filter(j => j.id !== usuario.id)
      console.log('👥 Outros jogadores online:', outrosJogadores)
      
      setJogadoresOnline(outrosJogadores)
    })

    // Evento específico para quando a lista atualiza
    socket.on('atualizar_lista', (lista) => {
      console.log('🔄 Atualização de lista recebida:', lista)
      const outrosJogadores = lista.filter(j => j.id !== usuario.id)
      setJogadoresOnline(outrosJogadores)
    })

    socket.on('receber_desafio', (data) => {
      tocarEfeito('clique')
      console.log('📨 Desafio recebido de:', data.desafiante_nome)
      setDesafioPendente({
        id: data.desafio_id,
        desafianteId: data.desafiante_id,
        desafianteNome: data.desafiante_nome,
        desafianteAvatar: data.desafiante_avatar
      })
      setStatus('desafio_recebido')
    })

    socket.on('batalha_iniciada', (data) => {
      tocarEfeito('clique')
      console.log('⚔️ Batalha iniciada! Sala:', data.sala_id)
      setOponente(data.oponente)
      setSalaId(data.sala_id)
      setTotalRodadas(data.total_rodadas)
      setHp({ eu: data.seu_hp || 100, oponente: data.hp_oponente || 100 })
      setStatus('batalhando')
      setContagem(3)
    })

    // CORREÇÃO: Evento para nova pergunta (era 'nova_pergunta' no servidor)
    socket.on('nova_pergunta', (data) => {
      console.log('📝 Nova pergunta recebida:', data)
      
      // Formata a questão para o formato esperado pelo frontend
      const questaoFormatada = {
        pergunta: data.pergunta,
        opcoes: data.opcoes,
        id: data.id
      }
      
      setPerguntaAtual(questaoFormatada)
      setTempo(data.tempo || 15)
      setRodadaAtual(data.rodada || 1)
      setTotalRodadas(data.total || totalRodadas)
      setRespondeu(false)
      respondeuRef.current = false
      setRespostaFeedback(null)
      setDanoMsg(null)

      // Inicia o timer
      if (timerRef.current) clearInterval(timerRef.current)
      let t = data.tempo || 15
      timerRef.current = setInterval(() => {
        t -= 1
        setTempo(t)
        if (t <= 0) {
          clearInterval(timerRef.current)
          if (!respondeuRef.current) {
            tocarEfeito('timeup')
            // Auto-resposta com timeout
            handleTempoEsgotado()
          }
        }
      }, 1000)
    })

    // Função para quando o tempo acabar
    const handleTempoEsgotado = () => {
      if (respondeuRef.current || !salaId) return
      console.log('⏰ Tempo esgotado!')
      setRespondeu(true)
      respondeuRef.current = true
      
      socketRef.current.emit('responder_pergunta', {
        sala_id: salaId,
        usuario_id: usuario.id,
        resposta: null,
        tempo_resposta: 15000,
        tempo_restante: 0
      })
    }

    socket.on('resultado_rodada', (data) => {
      console.log('🎯 Resultado da rodada:', data)
      clearInterval(timerRef.current)
      
      // Atualiza HP baseado nos dados recebidos
      if (data.hp_atual !== undefined && data.hp_oponente !== undefined) {
        setHp({ eu: data.hp_atual, oponente: data.hp_oponente })
      }
      
      if (data.acertou) {
        tocarEfeito('acerto')
        setDanoMsg({ quem: 'oponente', valor: data.dano_causado || 15 })
        setRespostaFeedback({ tipo: 'acerto', msg: `CRÍTICO! -${data.dano_causado || 15} HP` })
        
        // Remove a mensagem após 2 segundos
        setTimeout(() => setDanoMsg(null), 2000)
        setTimeout(() => setRespostaFeedback(null), 3000)
      } else if (data.acertou === false) {
        tocarEfeito('erro')
        setRespostaFeedback({ tipo: 'erro', msg: `VOCÊ ERROU!` })
        setTimeout(() => setRespostaFeedback(null), 2000)
      } else if (data.dano_causado && data.dano_causado > 0) {
        // Se tomou dano
        tocarEfeito('erro')
        setDanoMsg({ quem: 'eu', valor: data.dano_causado })
        setRespostaFeedback({ tipo: 'erro', msg: `DANO SOFRIDO! -${data.dano_causado} HP` })
        setTimeout(() => setDanoMsg(null), 2000)
        setTimeout(() => setRespostaFeedback(null), 3000)
      }
    })

    socket.on('fim_batalha', (data) => {
      console.log('🏁 Batalha finalizada:', data)
      const venceu = data.vencedor_id === usuario.id
      tocarEfeito(venceu ? 'vitoria' : 'derrota')
      
      setResultado({ 
        venceu, 
        vencedor: data.vencedor_nome,
        meusAcertos: data.acertos_final?.[usuario.id] || 0,
        meuHp: data.hp_final?.[usuario.id] || 0
      })
      setStatus('finalizado')
      
      // Limpa o timer
      if (timerRef.current) clearInterval(timerRef.current)
    })

    socket.on('desafio_recusado', () => {
      console.log('❌ Desafio recusado')
      setDesafioPendente(null)
      setStatus('procurando')
    })

    socket.on('desafio_aceito', (data) => {
      console.log('✅ Desafio aceito! Iniciando batalha...')
      // A batalha será iniciada pelo servidor
    })

    socket.on('erro', (data) => {
      console.error('❌ Erro do servidor:', data)
      alert(data.mensagem || 'Ocorreu um erro!')
    })

    // Ping periódico para manter conexão
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping')
      }
    }, 30000)

    return () => {
      clearInterval(pingInterval)
      if (timerRef.current) clearInterval(timerRef.current)
      socket.disconnect()
    }
  }, [usuario])

  // Função para lidar com tempo esgotado (referência)
  const handleTempoEsgotado = () => {
    if (respondeuRef.current || !salaId) return
    console.log('⏰ Tempo esgotado!')
    setRespondeu(true)
    respondeuRef.current = true
    
    socketRef.current?.emit('responder_pergunta', {
      sala_id: salaId,
      usuario_id: usuario.id,
      resposta: null,
      tempo_resposta: 15000,
      tempo_restante: 0
    })
  }

  // Lógica de Contagem Regressiva
  useEffect(() => {
    if (contagem > 0) {
      const t = setTimeout(() => setContagem(contagem - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [contagem])

  const aceitarDesafio = () => {
    if (!socketRef.current || !desafioPendente) return
    console.log('✅ Aceitando desafio:', desafioPendente.id)
    tocarEfeito('clique')
    socketRef.current.emit('aceitar_desafio', {
      desafio_id: desafioPendente.id,
      desafiado_id: usuario.id
    })
    setDesafioPendente(null)
    setStatus('batalhando')
    setContagem(3)
  }

  const recusarDesafio = () => {
    if (!socketRef.current || !desafioPendente) return
    console.log('❌ Recusando desafio')
    tocarEfeito('clique')
    socketRef.current.emit('recusar_desafio', {
      desafio_id: desafioPendente.id
    })
    setDesafioPendente(null)
    setStatus('procurando')
  }

  const buscarOponente = () => {
    if (!socketRef.current) return
    console.log('🔍 Buscando oponente...')
    tocarEfeito('clique')
    socketRef.current.emit('buscar_oponente', { usuario_id: usuario.id })
    setStatus('procurando')
  }

  const enviarDesafio = (jogadorId) => {
    if (!socketRef.current) return
    console.log('📨 Enviando desafio para:', jogadorId)
    tocarEfeito('clique')
    socketRef.current.emit('enviar_desafio', { 
      desafiante_id: usuario.id, 
      desafiado_id: jogadorId 
    })
  }

  const responder = (letra) => {
    if (respondeuRef.current || !salaId || !perguntaAtual) {
      console.log('❌ Não pode responder:', { respondeu: respondeuRef.current, salaId, perguntaAtual })
      return
    }
    
    console.log('📤 Respondendo:', letra)
    setRespondeu(true)
    respondeuRef.current = true
    tocarEfeito('clique')

    if (timerRef.current) clearInterval(timerRef.current)

    socketRef.current.emit('responder_pergunta', {
      sala_id: salaId,
      usuario_id: usuario.id,
      resposta: letra,
      tempo_resposta: (15 - tempo) * 1000,
      tempo_restante: tempo
    })
  }

  const getAvatar = (avatar) => {
    const avatares = { guerreiro: '⚔️', mago: '🔮', arqueiro: '🏹', paladino: '🛡️', ninja: '🥷' }
    return avatares[avatar?.toLowerCase()] || '🛡️'
  }

  // --- RENDERS ---

  if (status === 'desafio_recebido' && desafioPendente) return (
    <div className="min-h-screen bg-black/90 flex items-center justify-center p-6 z-50">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-[#1a1a24] border-4 border-yellow-500 rounded-[2rem] p-8 text-center max-w-sm w-full shadow-2xl">
            <div className="text-6xl mb-4 animate-bounce">⚔️</div>
            <h2 className="text-2xl font-black text-white uppercase mb-2">Desafio de Duelo!</h2>
            <div className="bg-white/5 p-4 rounded-2xl mb-6">
                <span className="text-4xl block mb-2">{getAvatar(desafioPendente.desafianteAvatar)}</span>
                <p className="text-yellow-500 font-black uppercase">{desafioPendente.desafianteNome}</p>
                <p className="text-gray-400 text-xs">está te desafiando para uma batalha!</p>
            </div>
            <div className="flex gap-4">
                <button onClick={aceitarDesafio} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black uppercase hover:bg-green-500 transition-all">Aceitar</button>
                <button onClick={recusarDesafio} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase hover:bg-red-500 transition-all">Recusar</button>
            </div>
        </motion.div>
    </div>
  )

  if (status === 'procurando') return (
    <div className="min-h-screen bg-[#0f0f15] text-[#d4b483] font-serif p-4 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-6xl mb-2">⚔️</div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Arena de Duelos</h1>
          <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-2">
            {conectado ? '🟢 Conectado ao Hall' : '🔴 Tentando Conexão...'}
          </p>
        </div>

        <div className="bg-[#1a1a24] border-2 border-purple-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Guardiões Online</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">{jogadoresOnline.length} heróis</span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {jogadoresOnline.length > 0 ? (
              jogadoresOnline.map(j => (
                <motion.div 
                  key={j.id} 
                  layout 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getAvatar(j.avatar)}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{j.nome}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-tighter">{j.setor || 'Herói'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => enviarDesafio(j.id)}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    DESAFIAR
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10">
                <div className="text-4xl mb-2 opacity-30">👥</div>
                <p className="text-gray-500 text-sm italic">Nenhum guardião online no momento...</p>
                <p className="text-gray-600 text-xs mt-2">Tente buscar automaticamente ou aguarde</p>
              </div>
            )}
          </div>

          <button 
            onClick={buscarOponente}
            className="w-full mt-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95"
          >
            Busca Automática
          </button>
        </div>
        
        <button 
          onClick={() => navigate('/mapa')} 
          className="w-full mt-6 text-gray-500 text-[10px] font-black uppercase hover:text-white transition-all"
        >
          Sair da Arena
        </button>
      </motion.div>
    </div>
  )

  if (status === 'batalhando') return (
    <div className="min-h-screen bg-[#050508] text-white font-serif overflow-hidden relative">
      {/* Header Arena */}
      <div className="relative z-20 p-4 grid grid-cols-3 items-center bg-gradient-to-b from-black/90 to-transparent">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getAvatar(usuario.avatar)}</span>
            <span className="font-black text-[10px] uppercase truncate">{usuario.nome}</span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full border border-white/10 overflow-hidden">
            <motion.div 
              animate={{ width: `${hp.eu}%` }} 
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
            />
          </div>
          <div className="text-right text-[10px] text-gray-500">{hp.eu}%</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-black italic text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">VS</div>
          <div className="text-[10px] text-gray-500 font-bold uppercase">{rodadaAtual} / {totalRodadas}</div>
        </div>
        
        <div className="space-y-2 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-black text-[10px] uppercase truncate">{oponente?.nome}</span>
            <span className="text-2xl">{getAvatar(oponente?.avatar)}</span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full border border-white/10 overflow-hidden">
            <motion.div 
              animate={{ width: `${hp.oponente}%` }} 
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-l from-red-600 to-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
            />
          </div>
          <div className="text-left text-[10px] text-gray-500">{hp.oponente}%</div>
        </div>
      </div>

      <main className="relative z-10 max-w-xl mx-auto p-4 flex flex-col h-[80vh] justify-center">
        {contagem > 0 ? (
           <motion.div 
             key={contagem} 
             initial={{ scale: 3, opacity: 0 }} 
             animate={{ scale: 1, opacity: 1 }} 
             exit={{ scale: 0, opacity: 0 }}
             className="text-center text-9xl font-black text-yellow-500 italic"
           >
              {contagem}
           </motion.div>
        ) : (
          <>
            <div className="text-center mb-6">
              <span className={`px-6 py-2 rounded-full border-2 font-black ${tempo <= 5 ? 'border-red-600 text-red-500 animate-pulse' : 'border-white/20 text-white'}`}>
                {tempo}s
              </span>
            </div>

            <AnimatePresence>
                {danoMsg && (
                    <motion.div 
                      initial={{ y: 0, opacity: 0, scale: 0.5 }} 
                      animate={{ y: -100, opacity: 1, scale: 1.5 }} 
                      exit={{ opacity: 0 }}
                      className={`fixed top-1/2 left-1/2 -translate-x-1/2 font-black text-5xl z-50 ${danoMsg.quem === 'eu' ? 'text-red-500' : 'text-yellow-500'}`}
                    >
                        -{danoMsg.valor} HP
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-[#1a1a24] border-2 border-white/10 rounded-3xl p-6 shadow-2xl mb-8">
              <p className="text-lg text-center font-bold">{perguntaAtual?.pergunta || 'Carregando pergunta...'}</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {perguntaAtual?.opcoes && ['A', 'B', 'C', 'D'].map(letra => (
                <button
                  key={letra}
                  onClick={() => responder(letra)}
                  disabled={respondeu}
                  className={`p-5 rounded-2xl text-left font-black transition-all border-2 ${
                    respondeu 
                      ? 'opacity-30 border-transparent bg-white/5 cursor-not-allowed' 
                      : 'bg-white/5 border-white/10 hover:border-purple-500 hover:bg-white/10 active:scale-98'
                  }`}
                >
                  <span className="text-purple-500 mr-4 font-bold">{letra}</span>
                  {perguntaAtual.opcoes[letra]}
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {respostaFeedback && (
          <motion.div 
            initial={{ y: 100 }} 
            animate={{ y: 0 }} 
            exit={{ y: 100 }}
            className={`fixed bottom-0 left-0 right-0 p-6 text-center font-black uppercase tracking-widest text-white ${
              respostaFeedback.tipo === 'acerto' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {respostaFeedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  if (status === 'finalizado') return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1a24] border-4 border-purple-500 rounded-[3rem] p-10 text-center max-w-sm w-full"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-8xl mb-6"
        >
          {resultado?.venceu ? '🏆' : '💀'}
        </motion.div>
        <h1 className="text-4xl font-black uppercase italic mb-4">{resultado?.venceu ? 'Vitória!' : 'Derrota!'}</h1>
        <p className="text-gray-400 mb-2">Acertos: {resultado?.meusAcertos || 0}</p>
        <p className="text-gray-400 mb-8">HP Restante: {resultado?.meuHp || 0}%</p>
        <button 
          onClick={() => navigate('/mapa')} 
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all"
        >
          Retornar ao Mapa
        </button>
      </motion.div>
    </div>
  )

  return null
}

export default Batalha