import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const RankingAdm = () => {
  const navigate = useNavigate()
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregarDadosAdm()
  }, [])

  const carregarDadosAdm = async () => {
    try {
      // Usamos a mesma rota, ou uma nova rota /api/ranking_adm se você quiser mais detalhes
      const response = await axios.get('/api/ranking_completo')
      setRanking(response.data)
    } catch (error) {
      console.error("Erro ao carregar dados de premiação:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtro para o ADM achar um jogador específico por nome ou setor
  const rankingFiltrado = ranking.filter(j => 
    j.nome.toLowerCase().includes(busca.toLowerCase()) || 
    j.setor.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho ADM */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border-l-8 border-purple-600">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Painel de Premiação (ADM)</h1>
              <p className="text-slate-500">Identificação de Guardiões para entrega de recompensas</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition"
              >
                🖨️ Imprimir Lista
              </button>
              <button 
                onClick={() => navigate('/mapa')} 
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold transition"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Buscar por nome real ou setor..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full md:w-96 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {/* Tabela de Identificação */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600">Posição</th>
                <th className="p-4 font-bold text-slate-600">Nome do Colaborador</th>
                <th className="p-4 font-bold text-slate-600">Setor</th>
                <th className="p-4 font-bold text-slate-600 text-center">Pontuação Total</th>
                <th className="p-4 font-bold text-slate-600 text-center">Status Batalha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center">Carregando dados...</td></tr>
              ) : (
                rankingFiltrado.map((jogador, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-purple-50 transition">
                    <td className="p-4">
                      <span className={`inline-block w-8 h-8 rounded-full text-center leading-8 font-bold ${
                        idx < 3 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-lg">{jogador.nome}</span>
                        <span className="text-xs text-slate-400 uppercase">ID: {jogador.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                        {jogador.setor}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-purple-700 text-xl">
                      {jogador.pontos}
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-xs">
                        <span className="text-green-600">Vitorias: {jogador.vitorias}</span>
                        <br/>
                        <span className="text-red-500">Derrotas: {jogador.derrotas}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          Apenas usuários com nível de acesso Administrador podem visualizar esta página.
        </div>
      </div>
    </div>
  )
}

export default RankingAdm