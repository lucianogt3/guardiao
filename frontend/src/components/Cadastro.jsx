import React, { useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const Cadastro = () => {
  const navigate = useNavigate()

  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')
  const [setor, setSetor] = useState('')
  const [avatar, setAvatar] = useState('guerreiro')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const setores = [
    { value: '', label: '-- Selecione seu setor --' },
    { value: 'Pronto Socorro', label: 'Pronto Socorro' },
    { value: 'Posto 1', label: 'Posto 1' },
    { value: 'Posto 2', label: 'Posto 2' },
    { value: 'Posto 3', label: 'Posto 3' },
    { value: 'Centro Cirúrgico (CC)', label: 'Centro Cirúrgico (CC)' },
    { value: 'Hemodinâmica', label: 'Hemodinâmica' },
    { value: 'Centro Clínico', label: 'Centro Clínico' },
    { value: 'Exames', label: 'Exames' },
    { value: 'Hotelaria', label: 'Hotelaria' },
    { value: 'Higienização', label: 'Higienização' },
    { value: 'Nutrição', label: 'Nutrição' },
    { value: 'Engenharia Clínica', label: 'Engenharia Clínica' },
    { value: 'Engenharia Predial', label: 'Engenharia Predial' },
    { value: 'Diretoria', label: 'Diretoria' },
    { value: 'TI', label: 'TI' },
    { value: 'UTI 1', label: 'UTI 1' },
    { value: 'UTI 2', label: 'UTI 2' },
    { value: 'Farmácia', label: 'Farmácia' },
    { value: 'Radiologia', label: 'Radiologia' },
    { value: 'Laboratório', label: 'Laboratório' },
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Gestão de Riscos', label: 'Gestão de Riscos' },
    { value: 'Qualidade', label: 'Qualidade' },
    { value: 'Ensino e Pesquisa', label: 'Ensino e Pesquisa' },
    { value: 'Administrativo', label: 'Administrativo' },
    { value: 'Recepção', label: 'Recepção' },
    { value: 'Outros', label: 'Outros' }
  ]

  const avatares = [
    { id: 'guerreiro', nome: 'Guerreiro(a)', icone: '⚔️', cor: 'from-red-600 to-orange-600' },
    { id: 'mago', nome: 'Mago(a)', icone: '🔮', cor: 'from-blue-600 to-purple-600' },
    { id: 'arqueiro', nome: 'Arqueiro(a)', icone: '🏹', cor: 'from-green-600 to-emerald-600' },
    { id: 'valquiria', nome: 'Valquíria', icone: '🛡️', cor: 'from-pink-600 to-rose-600' },
    { id: 'feiticeira', nome: 'Feiticeiro(a)', icone: '✨', cor: 'from-purple-600 to-fuchsia-600' },
    { id: 'paladino', nome: 'Paladino(a)', icone: '🛡️', cor: 'from-yellow-500 to-amber-600' },
    { id: 'ninja', nome: 'Ninja', icone: '🗡️', cor: 'from-gray-700 to-black' },
    { id: 'cavaleiro', nome: 'Cavaleiro(a)', icone: '🐉', cor: 'from-indigo-600 to-blue-700' },
    { id: 'curandeiro', nome: 'Curandeiro(a)', icone: '💚', cor: 'from-green-500 to-lime-600' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    window.playSound?.('clique')

    if (!matricula.trim()) {
      setErro('Digite sua matrícula')
      return
    }

    if (!setor) {
      setErro('Selecione seu setor')
      return
    }

    setLoading(true)
    setErro('')
    setSucesso('')

    try {
      const nomeEnviar = nome.trim() ? nome.trim() : null

      const response = await axios.post('/api/cadastro', {
        matricula: matricula.trim(),
        nome: nomeEnviar,
        setor,
        avatar
      })

      if (response.data.usuario) {
        localStorage.setItem('guardiao_user', JSON.stringify(response.data.usuario))
        setSucesso('Cadastro realizado! Redirecionando...')
        setTimeout(() => navigate('/mapa'), 1500)
      } else {
        setSucesso('Cadastro realizado! Agora faça login.')
        setTimeout(() => navigate('/'), 2000)
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setErro('Matrícula já cadastrada. Faça login.')
      } else {
        setErro(error.response?.data?.error || 'Erro no cadastro.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 to-purple-900">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-yellow-500/30"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">📜 CADASTRO</h1>
          <p className="text-gray-300">Junte-se aos Guardiões da Segurança</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Matrícula *
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              placeholder="Ex: 12345"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Seu nome (opcional)
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              placeholder="Como quer ser chamado?"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se não preencher, o sistema usará "Jogador"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Setor *
            </label>
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              required
            >
              {setores.map((s) => (
                <option key={s.value} value={s.value} disabled={s.value === ''}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Escolha seu avatar
            </label>

            <div className="flex flex-wrap gap-3 justify-center">
              {avatares.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => {
                    setAvatar(av.id)
                    window.playSound?.('clique')
                  }}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                    avatar === av.id
                      ? `bg-gradient-to-br ${av.cor} scale-105 shadow-lg ring-2 ring-yellow-400`
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span className="text-2xl">{av.icone}</span>
                  <span className="text-xs mt-1 text-white">{av.nome}</span>
                </button>
              ))}
            </div>
          </div>

          {erro && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-2 text-center">
              <p className="text-red-300 text-sm">{erro}</p>
            </div>
          )}

          {sucesso && (
            <div className="bg-green-900/50 border border-green-500 rounded-lg p-2 text-center">
              <p className="text-green-300 text-sm">{sucesso}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? '⚔️ Cadastrando...' : '📝 CADASTRAR'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Já tem cadastro?{' '}
          <button
            onClick={() => {
              window.playSound?.('clique')
              navigate('/')
            }}
            className="text-yellow-400 hover:text-yellow-300 underline transition"
          >
            Faça login
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default Cadastro