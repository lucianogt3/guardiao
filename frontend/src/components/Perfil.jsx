import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const Perfil = ({ usuario }) => {
  const navigate = useNavigate()
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    carregarPerfil()
  }, [])

  const carregarPerfil = async () => {
    try {
      const response = await axios.get(`/api/perfil/${usuario.id}`)
      setPerfil(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  if (!perfil) return <div className="text-center py-20">Carregando...</div>

  return (
    <div className="min-h-screen p-4">
      <button onClick={() => navigate('/mapa')} className="text-yellow-400 mb-4">← Voltar</button>
      <div className="card-medieval text-center">
        <div className="text-7xl mb-4">
          {usuario.avatar === 'guerreiro' && '⚔️'}
          {usuario.avatar === 'mago' && '🔮'}
          {usuario.avatar === 'arqueiro' && '🏹'}
        </div>
        <h1 className="text-3xl font-bold">{perfil.nome}</h1>
        <p className="text-gray-400">{perfil.setor}</p>

        <div className="mt-6 space-y-3 text-left">
          <div className="flex justify-between p-2 bg-gray-700 rounded">
            <span>🏅 Nível</span>
            <span className="font-bold">{perfil.level}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-700 rounded">
            <span>✨ XP Total</span>
            <span className="font-bold">{perfil.xp}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-700 rounded">
            <span>✅ Acertos</span>
            <span className="font-bold">{perfil.acertos}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-700 rounded">
            <span>⚔️ Batalhas Vencidas</span>
            <span className="font-bold">{perfil.batalhas_vencidas}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-700 rounded">
            <span>🛡️ Metas Completas</span>
            <span className="font-bold">{perfil.metas_concluidas.length}/6</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Perfil