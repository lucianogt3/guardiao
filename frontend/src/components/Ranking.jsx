// src/components/Ranking.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import CustomModal from './CustomModal'
import epicMusica from '../assets/epic.mp3'

const Ranking = ({ usuario, onLogout }) => {
  const navigate = useNavigate()
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [musicaAtiva, setMusicaAtiva] = useState(true)
  const [volumeMusica, setVolumeMusica] = useState(0.25)
  const [audioCarregado, setAudioCarregado] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onClose: null })

  const audioRef = useRef(null)

  const mostrarModal = (title, message, type = 'info', onClose = null) => {
    setModal({ isOpen: true, title, message, type, onClose: () => { setModal(prev => ({ ...prev, isOpen: false })); if (onClose) onClose(); } })
  }

  const tocarMusica = async () => {
    if (!audioRef.current || !audioCarregado || !musicaAtiva) return false
    try {
      audioRef.current.muted = false
      audioRef.current.volume = volumeMusica
      audioRef.current.loop = true
      await audioRef.current.play()
      return true
    } catch (error) { return false }
  }

  const pausarMusica = () => { if (audioRef.current) audioRef.current.pause() }

  useEffect(() => { carregarRanking() }, [])

  useEffect(() => {
    const audio = new Audio(epicMusica)
    audio.preload = 'auto'
    audio.loop = true
    audio.volume = volumeMusica
    const onCanPlay = () => { audioRef.current = audio; setAudioCarregado(true) }
    const onError = () => { setAudioCarregado(false) }
    audio.addEventListener('canplaythrough', onCanPlay)
    audio.addEventListener('error', onError)
    audio.load()
    return () => { audio.pause(); audio.removeEventListener('canplaythrough', onCanPlay); audio.removeEventListener('error', onError) }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volumeMusica
    if (musicaAtiva) tocarMusica()
    else pausarMusica()
  }, [volumeMusica, musicaAtiva, audioCarregado])

  const carregarRanking = async () => {
    try {
      const response = await axios.get('/api/ranking_completo')
      setRanking(response.data)
    } catch (error) {
      console.error(error)
      mostrarModal('Erro', 'Não foi possível carregar o ranking.', 'error')
    } finally { setLoading(false) }
  }

  const getAvatarIcon = (avatar) => {
    const avatares = { guerreiro: '⚔️', mago: '🔮', maga: '🧙', arqueiro: '🏹', arqueira: '🏹', valquiria: '🛡️', feiticeira: '🔮', paladino: '🛡️', ninja: '🥷', cavaleiro: '🐉', healer: '💚', guardiao: '🛡️', druida: '🌿', berserker: '🪓', samurai: '⚔️', monge: '🙏', assassino: '🗡️' }
    return avatares[avatar] || '🛡️'
  }

  const renderAudioControls = () => (
    <div className="bg-black/50 border border-purple-500/30 rounded-xl p-3">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm text-white mb-1"><span>🎵 Música Épica</span><button onClick={() => setMusicaAtiva(!musicaAtiva)} className={`text-xs px-3 py-1 rounded ${musicaAtiva ? 'bg-purple-600' : 'bg-gray-700'}`}>{musicaAtiva ? 'ON' : 'OFF'}</button></div>
          <input type="range" min="0" max="1" step="0.01" value={volumeMusica} onChange={(e) => setVolumeMusica(Number(e.target.value))} className="w-full h-2 rounded-lg bg-gray-700 accent-purple-500" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-purple-950">
      <div className="border-b border-purple-500/30 bg-black/25 backdrop-blur-sm px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative"><div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 p-[3px] shadow-lg"><div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-3xl">🏆</div></div></div>
            <div><p className="text-xs uppercase tracking-[0.25em] text-purple-300 mb-1">Arena dos Campeões</p><h1 className="text-2xl md:text-3xl font-extrabold text-white">Hall da Fama</h1></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/mapa')} className="bg-yellow-600 hover:bg-yellow-700 px-5 py-2.5 rounded-lg text-white transition font-semibold flex items-center gap-2">🗺️ Voltar</button>
            <button onClick={onLogout} className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-lg text-white transition font-semibold">🚪 Sair</button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-purple-500/20"><div className="max-w-6xl mx-auto">{renderAudioControls()}</div></div>

      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-20"><div className="animate-spin text-6xl mb-4">🏆</div><p className="text-white text-xl">Carregando o Hall da Fama...</p></div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-purple-500/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-purple-500/30 bg-black/50"><th className="text-left py-4 px-6 text-purple-300">#</th><th className="text-left py-4 px-6 text-purple-300">Herói</th><th className="text-left py-4 px-6 text-purple-300">Setor</th><th className="text-center py-4 px-6 text-purple-300">Pontos</th><th className="text-center py-4 px-6 text-purple-300">V/D</th><th className="text-center py-4 px-6 text-purple-300">KD</th></tr></thead>
                  <tbody>
                    {ranking.map((jogador, idx) => (
                      <tr key={idx} className={`border-b border-gray-700/50 transition-colors ${jogador.nome === usuario?.nome ? 'bg-yellow-600/20' : 'hover:bg-white/5'}`}>
                        <td className="py-3 px-6 text-white">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}º`}</td>
                        <td className="py-3 px-6"><div className="flex items-center gap-3"><span className="text-2xl">{getAvatarIcon(jogador.avatar)}</span><span className="font-bold text-white">{jogador.nome || 'Guardião'}</span>{jogador.nome === usuario?.nome && <span className="text-xs bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full">Você</span>}</div></td>
                        <td className="py-3 px-6 text-gray-300">{jogador.setor || '-'}</td>
                        <td className="py-3 px-6 text-center"><span className="font-bold text-yellow-400 text-lg">{jogador.pontos || 0}</span></td>
                        <td className="py-3 px-6 text-center"><span className="text-green-400">{jogador.vitorias || 0}</span><span className="text-gray-500"> / </span><span className="text-red-400">{jogador.derrotas || 0}</span></td>
                        <td className="py-3 px-6 text-center"><span className={`px-3 py-1 rounded-full text-sm font-bold ${jogador.kd >= 1 ? 'bg-green-800/50 text-green-400' : 'bg-red-800/50 text-red-400'}`}>{jogador.kd || 0}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-600/20 rounded border border-yellow-500"></div><span className="text-gray-300">Sua posição</span></div>
            <div className="flex items-center gap-2"><span className="text-2xl">🥇🥈🥉</span><span className="text-gray-300">Top 3</span></div>
          </div>
        </div>
      </div>

      <CustomModal isOpen={modal.isOpen} onClose={() => { if (modal.onClose) modal.onClose(); else setModal(prev => ({ ...prev, isOpen: false })); }} title={modal.title} message={modal.message} type={modal.type} />
    </div>
  )
}

export default Ranking