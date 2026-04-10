import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import axios from 'axios'

// Componentes Originais
import Login from './components/Login'
import Cadastro from './components/Cadastro'
import Mapa from './components/Mapa'
import Quiz from './components/Quiz'
import Batalha from './components/Batalha'
import Ranking from './components/Ranking'
import Perfil from './components/Perfil'
import AudioController from './components/AudioController'
import RankingAdm from './components/RankingAdm'

// Novo Componente da Roleta
import RoletaDiaria from './components/RoletaDiaria'

axios.defaults.withCredentials = true

function AppContent() {
  const [usuario, setUsuario] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const savedUser = localStorage.getItem('guardiao_user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setUsuario(user)
      // Se estiver na raiz, redireciona para o mapa
      if (window.location.pathname === '/') {
        navigate('/mapa')
      }
    }
  }, [navigate])

  const handleLogin = (userData) => {
    setUsuario(userData)
    localStorage.setItem('guardiao_user', JSON.stringify(userData))
    navigate('/mapa')
  }

  const handleLogout = () => {
    setUsuario(null)
    localStorage.removeItem('guardiao_user')
    navigate('/')
  }

  // Função para atualizar XP e dados após ganhar na roleta ou quiz
  const atualizarDadosUsuario = (novosDados) => {
    setUsuario(prev => {
      const atualizado = { ...prev, ...novosDados };
      localStorage.setItem('guardiao_user', JSON.stringify(atualizado));
      return atualizado;
    });
  }

  return (
    <div className="min-h-screen">
      <AudioController />
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/cadastro" element={<Cadastro />} />
        
        {/* Rota do Mapa */}
        <Route path="/mapa" element={<Mapa usuario={usuario} onLogout={handleLogout} />} />
        
        {/* Nova Rota da Roleta */}
        <Route 
          path="/roleta" 
          element={<RoletaDiaria usuario={usuario} onPremioRecebido={atualizarDadosUsuario} />} 
        />

        <Route path="/quiz/:metaId" element={<Quiz usuario={usuario} />} />
        <Route path="/batalha" element={<Batalha usuario={usuario} />} />
        <Route path="/ranking" element={<Ranking usuario={usuario} />} />
        <Route path="/perfil" element={<Perfil usuario={usuario} />} />
        <Route path="/painel-secreto-adm" element={<RankingAdm />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  )
}

export default App