import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, User, Lock, Briefcase, ArrowLeft, Mail, Building2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';
import { Cargo, Hospital } from '../types';

interface CadastroProps {
  onCadastro: (user: any) => void;
  onBack: () => void;
}

const AVATARES = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Anya',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Maya',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Max',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Kael',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Lyra',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Orion',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sienna',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nova',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Zelda',
];

export const Cadastro: React.FC<CadastroProps> = ({ onCadastro, onBack }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargoId, setCargoId] = useState<number | ''>('');
  const [hospitalId, setHospitalId] = useState<number | ''>('');
  const [avatar, setAvatar] = useState(AVATARES[0]);
  
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { playSound } = useAudio();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, hRes] = await Promise.all([
          axios.get('/api/cargos'),
          axios.get('/api/hospitais')
        ]);
        setCargos(cRes.data);
        setHospitais(hRes.data);
      } catch (err) {
        console.error('Erro ao carregar dados mestres', err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    playSound('clique');

    try {
      const res = await axios.post('/api/cadastro', { 
        nome, email, senha, avatar, 
        cargo_id: cargoId, hospital_id: hospitalId 
      });
      onCadastro(res.data);
      playSound('conquista');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar. Verifique os dados.');
      playSound('erro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-bg-purple via-bg-dark to-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl sleek-card p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => { playSound('clique'); onBack(); }} className="p-2 hover:bg-white/10 rounded-xl transition-all text-accent-gold">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                Novo <span className="text-accent-gold">Guardião</span>
              </h1>
              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Guardiões da Enfermagem</p>
            </div>
          </div>
          <Shield size={32} className="text-accent-gold/20" />
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Coluna 1: Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-widest border-b border-white/5 pb-2">Identidade</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={16} />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="sleek-input text-sm"
                  placeholder="Seu nome"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sleek-input text-sm"
                  placeholder="seu.email@exemplo.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={16} />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="sleek-input text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Coluna 2: Dados Profissionais */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-widest border-b border-white/5 pb-2">Atuação</h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Unidade</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={16} />
                <select
                  required
                  value={hospitalId}
                  onChange={(e) => setHospitalId(Number(e.target.value))}
                  className="sleek-input text-sm appearance-none"
                >
                  <option value="" disabled className="bg-bg-dark">Selecione a unidade</option>
                  {hospitais.map(h => (
                    <option key={h.id} value={h.id} className="bg-bg-dark">{h.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1">Cargo / Função</label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-gold" size={16} />
                <select
                  required
                  value={cargoId}
                  onChange={(e) => setCargoId(Number(e.target.value))}
                  className="sleek-input text-sm appearance-none"
                >
                  <option value="" disabled className="bg-bg-dark">Selecione seu cargo</option>
                  {cargos.map(c => (
                    <option key={c.id} value={c.id} className="bg-bg-dark">{c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Coluna 3: Avatar e Finalização */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-accent-gold uppercase tracking-widest border-b border-white/5 pb-2">Avatar</h3>
            
            <div className="grid grid-cols-3 gap-2">
              {AVATARES.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => { playSound('clique'); setAvatar(url); }}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105",
                    avatar === url ? 'border-accent-gold bg-accent-gold/20 shadow-lg shadow-accent-gold/20' : 'border-white/5 bg-black/20 grayscale hover:grayscale-0'
                  )}
                >
                  <img src={url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sleek-btn py-4 group"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? 'Criando Guardião...' : 'Iniciar Jornada'}
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

