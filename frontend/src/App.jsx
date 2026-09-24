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

  // Função para atualizar dados do usuário via API (busca do backend)
  const atualizarUsuario = async () => {
    if (!usuario?.id) return;
    try {
      const response = await axios.get(`/api/perfil/${usuario.id}`, {
        withCredentials: true
      });
      const dadosAtualizados = response.data;
      setUsuario(prev => ({ ...prev, ...dadosAtualizados }));
      localStorage.setItem('guardiao_user', JSON.stringify({ ...usuario, ...dadosAtualizados }));
      return dadosAtualizados;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  };

  // Função para atualizar XP após ganhar na roleta
  const atualizarXp = (valorGanho) => {
    if (usuario) {
      const novoXp = (usuario.xp || 0) + valorGanho;
      setUsuario(prev => ({ ...prev, xp: novoXp }));
      localStorage.setItem('guardiao_user', JSON.stringify({ ...usuario, xp: novoXp }));
    }
  };

  if (!usuario) {
    return (
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen">
      <AudioController />
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/cadastro" element={<Cadastro />} />
        
        {/* Rota do Mapa - AGORA COM atualizarUsuario */}
        <Route 
          path="/mapa" 
          element={<Mapa usuario={usuario} onLogout={handleLogout} atualizarUsuario={atualizarUsuario} />} 
        />
        
        {/* Rota da Roleta - COM atualizarXp */}
        <Route 
          path="/roleta" 
          element={<RoletaDiaria usuario={usuario} onPremioRecebido={atualizarXp} />} 
        />

        {/* Rota do Quiz - AGORA COM atualizarUsuario */}
        <Route 
          path="/quiz/:metaId" 
          element={<Quiz usuario={usuario} atualizarUsuario={atualizarUsuario} />} 
        />
        
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