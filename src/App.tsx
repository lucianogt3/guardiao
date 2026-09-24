/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AudioProvider, useAudio } from './components/AudioController';
import { Login } from './components/Login';
import { Cadastro } from './components/Cadastro';
import { Mapa } from './components/Mapa';
import { Quiz } from './components/Quiz';
import { Batalha } from './components/Batalha';
import { Ranking } from './components/Ranking';
import { Perfil } from './components/Perfil';
import { Roleta } from './components/Roleta';
import { Loja } from './components/Loja';
import { AdminPanel } from './components/AdminPanel';
import { Usuario, Meta } from './types';

function GameContent() {
  const [user, setUser] = useState<Usuario | null>(null);
  const [view, setView] = useState<'login' | 'cadastro' | 'mapa'>('login');
  const [activeMeta, setActiveMeta] = useState<Meta | null>(null);
  const [showArena, setShowArena] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showPerfil, setShowPerfil] = useState(false);
  const [showRoleta, setShowRoleta] = useState(false);
  const [showLoja, setShowLoja] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const { playMusic } = useAudio();

  useEffect(() => {
    const savedUser = localStorage.getItem('guardiao_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('mapa');
    }
  }, []);

  const handleLogin = (userData: Usuario) => {
    setUser(userData);
    localStorage.setItem('guardiao_user', JSON.stringify(userData));
    setView('mapa');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('guardiao_user');
    setView('login');
    setShowArena(false);
    setShowRanking(false);
    setShowPerfil(false);
    setShowRoleta(false);
    setShowLoja(false);
    setShowAdmin(false);
  };

  if (view === 'login') {
    return <Login onLogin={handleLogin} onSwitchToCadastro={() => setView('cadastro')} />;
  }

  if (view === 'cadastro') {
    return <Cadastro onCadastro={handleLogin} onBack={() => setView('login')} />;
  }

  if (view === 'mapa' && user) {
    return (
      <>
        <Mapa 
          usuario={user} 
          onSelectMeta={setActiveMeta}
          onOpenArena={() => setShowArena(true)}
          onOpenRanking={() => setShowRanking(true)}
          onOpenPerfil={() => setShowPerfil(true)}
          onOpenRoleta={() => setShowRoleta(true)}
          onOpenLoja={() => setShowLoja(true)}
          onOpenAdmin={() => setShowAdmin(true)}
          onLogout={handleLogout}
        />

        {activeMeta && (
          <Quiz 
            usuario={user} 
            meta={activeMeta} 
            onComplete={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('guardiao_user', JSON.stringify(updatedUser));
              setActiveMeta(null);
            }}
            onCancel={() => setActiveMeta(null)}
          />
        )}

        {showArena && (
          <Batalha 
            usuario={user} 
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('guardiao_user', JSON.stringify(updatedUser));
            }}
            onClose={() => {
              setShowArena(false);
              playMusic('menu');
            }} 
          />
        )}

        {showRanking && (
          <Ranking onClose={() => setShowRanking(false)} />
        )}

        {showPerfil && (
          <Perfil usuario={user} onClose={() => setShowPerfil(false)} />
        )}

        {showRoleta && (
          <Roleta 
            usuario={user} 
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('guardiao_user', JSON.stringify(updatedUser));
            }}
            onClose={() => setShowRoleta(false)} 
          />
        )}

        {showLoja && (
          <Loja 
            user={user} 
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('guardiao_user', JSON.stringify(updatedUser));
            }}
            onClose={() => setShowLoja(false)} 
          />
        )}

        {showAdmin && (
          <AdminPanel onClose={() => setShowAdmin(false)} />
        )}
      </>
    );
  }

  return null;
}

export default function App() {
  return (
    <AudioProvider>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black">
        <GameContent />
      </div>
    </AudioProvider>
  );
}

