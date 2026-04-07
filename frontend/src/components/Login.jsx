import React, { useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const Login = ({ onLogin }) => {
  const navigate = useNavigate()
  const [matricula, setMatricula] = useState('')
  const [setor, setSetor] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const setores = [
    { value: '', label: '-- Selecione seu setor --' },
    { value: 'UTI 1', label: 'UTI 1' },
    { value: 'UTI 2', label: 'UTI 2' },
    { value: 'Posto 1', label: 'Posto 1' },
    { value: 'Posto 2', label: 'Posto 2' },
    { value: 'Posto 3', label: 'Posto 3' },
    { value: 'Hemodinâmica', label: 'Hemodinâmica' },
    { value: 'Centro Cirúrgico (CC)', label: 'Centro Cirúrgico (CC)' },
    { value: 'Hotelaria', label: 'Hotelaria' },
    { value: 'Recepção', label: 'Recepção' },
    { value: 'Exames', label: 'Exames' },
    { value: 'Centro Clínico', label: 'Centro Clínico' },
    { value: 'Administrativo', label: 'Administrativo' },
    { value: 'Enfermarias', label: 'Enfermarias' },
    { value: 'Farmácia', label: 'Farmácia' },
    { value: 'Radiologia', label: 'Radiologia' },
    { value: 'Laboratório', label: 'Laboratório' },
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Gestão de Riscos', label: 'Gestão de Riscos' },
    { value: 'Qualidade', label: 'Qualidade' },
    { value: 'Ensino e Pesquisa', label: 'Ensino e Pesquisa' },
    { value: 'Outros', label: 'Outros' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()

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

    try {
      const response = await axios.post('/api/login', {
        matricula: matricula.trim(),
        setor
      })

      if (response.data && response.data.id) {
        window.playSound?.('clique')
        onLogin(response.data)
      } else {
        setErro('Resposta inválida do servidor.')
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          setErro('Matrícula não cadastrada. Clique em "Cadastrar-se" abaixo.')
        } else if (error.response.status === 401) {
          setErro('Setor incorreto. Tente novamente.')
        } else {
          setErro(error.response.data?.error || 'Erro ao entrar.')
        }
      } else {
        setErro('Erro de conexão com o servidor.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-medieval w-full max-w-xl"
      >
        <div className="text-center mb-8 pt-10">
          <h1 className="inline-block pt-3 pb-2 text-4xl md:text-5xl font-bold tracking-wide leading-[1.3] bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            GUARDIÕES
          </h1>

          <p className="text-2xl md:text-3xl font-semibold text-yellow-300 mt-1">
            da Segurança
          </p>

          <div className="flex flex-col items-center gap-4 my-6">
            <div className="text-6xl">🛡️⚔️</div>

            <div className="flex flex-col items-center justify-center gap-2 px-5 py-4 rounded-xl bg-black/20 border border-yellow-500/20">
              <div className="text-4xl">🏥</div>

              <div className="text-center">
                <p className="text-white font-semibold leading-tight">
                  Hospital do Coração
                </p>
                <p className="text-yellow-300 text-sm font-medium">
                  HCOR
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Matrícula
            </label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              placeholder="Ex: 12345"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Setor (sua senha) *
            </label>
            <select
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              required
            >
              {setores.map((s) => (
                <option key={s.value} value={s.value} disabled={s.value === ''}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-2">
              Use o mesmo setor que você cadastrou.
            </p>
          </div>

          {erro && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-red-300 text-sm text-center">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg font-bold"
          >
            {loading ? '⚔️ Carregando...' : '🚪 ENTRAR NA MISSÃO'}
          </button>
        </form>

        <div className="text-center mt-7">
          <p className="text-gray-400 text-sm">
            Não tem cadastro?{' '}
            <button
              onClick={() => navigate('/cadastro')}
              className="text-yellow-400 underline hover:text-yellow-300"
            >
              Cadastrar-se
            </button>
          </p>
        </div>

        <p className="text-center text-gray-400 text-sm mt-5 leading-relaxed">
          Ao entrar, você concorda em proteger os pacientes
          <br />
          e honrar o código dos Guardiões.
        </p>
      </motion.div>
    </div>
  )
}

export default Login