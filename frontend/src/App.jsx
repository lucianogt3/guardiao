import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Login from './components/Login'
import Cadastro from './components/Cadastro'
import Mapa from './components/Mapa'
import Quiz from './components/Quiz'
import Batalha from './components/Batalha'
import Ranking from './components/Ranking'
import Perfil from './components/Perfil'
import AudioController from './components/AudioController'
import axios from 'axios'

axios.defaults.withCredentials = true

function AppContent() {
  const [usuario, setUsuario] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const savedUser = localStorage.getItem('guardiao_user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setUsuario(user)
      navigate('/mapa')
    }
  }, [])

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

  return (
    <div className="min-h-screen">
      <AudioController />
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/mapa" element={<Mapa usuario={usuario} onLogout={handleLogout} />} />
        <Route path="/quiz/:metaId" element={<Quiz usuario={usuario} />} />
        <Route path="/batalha" element={<Batalha usuario={usuario} />} />
        <Route path="/ranking" element={<Ranking usuario={usuario} />} />
        <Route path="/perfil" element={<Perfil usuario={usuario} />} />
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