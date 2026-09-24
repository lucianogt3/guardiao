import React, { useState } from 'react';
import axios from 'axios';
import { Shield, Lock, User, AlertCircle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAudio } from './AudioController';

interface LoginProps {
  onLogin: (user: any) => void;
  onSwitchToCadastro: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToCadastro }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { playSound } = useAudio();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    playSound('clique');
    
    try {
      const res = await axios.post('/api/login', { email, senha });
      onLogin(res.data);
      playSound('conquista');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao entrar. Verifique suas credenciais.');
      playSound('erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-bg-purple via-bg-dark to-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md sleek-card p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-accent-gold/10 border-2 border-accent-gold/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
            <Shield size={40} className="text-accent-gold" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">Guardiões</h1>
          <p className="text-text-muted font-bold uppercase tracking-widest text-[10px]">Enfermagem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">E-mail Institucional</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sleek-input"
                placeholder="seu.email@exemplo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={18} />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="sleek-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full sleek-btn py-4 group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? 'Validando...' : 'Entrar na Arena'}
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-text-muted text-xs mb-4">Ainda não é um Guardião?</p>
          <button
            onClick={() => { playSound('clique'); onSwitchToCadastro(); }}
            className="text-accent-gold font-black uppercase tracking-widest text-[10px] hover:text-accent-orange transition-colors"
          >
            Criar Nova Conta
          </button>
        </div>
      </motion.div>
    </div>
  );
};

