import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Trash2, Edit3, Save, X, ChevronRight, Layout, Map, HelpCircle, ShoppingBag, AlertCircle, Users, Lock, Unlock, Key, Building2, Sword, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudio } from './AudioController';
import { Tema, Meta, Questao } from '../types';
import { cn } from '@/src/lib/utils';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'temas' | 'metas' | 'questoes' | 'loja' | 'usuarios' | 'unidades' | 'salas'>('temas');
  const [temas, setTemas] = useState<Tema[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [avatares, setAvatares] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [hospitais, setHospitais] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedTemaId, setSelectedTemaId] = useState<number>(0);
  const [selectedMetaId, setSelectedMetaId] = useState<number>(0);
  const [adminError, setAdminError] = useState<string | null>(null);
  const { playSound } = useAudio();

  // Form states
  const [newTema, setNewTema] = useState({ nome: '', descricao: '', icone: 'Shield', capa: '' });
  const [newMeta, setNewMeta] = useState({ tema_id: 0, titulo: '', descricao: '', lore_rpg: '', icone: 'Star', ordem: 1, cor: 'purple' });
  const [newQuestao, setNewQuestao] = useState({ meta_id: 0, pergunta: '', opcao_a: '', opcao_b: '', opcao_c: '', opcao_d: '', resposta_correta: 'a', explicacao: '' });
  const [newAvatar, setNewAvatar] = useState({ nome: '', url: '', preco_moedas: 100, raridade: 'comum' });
  const [newHospital, setNewHospital] = useState({ nome: '' });
  const [newSala, setNewSala] = useState({ nome: '', descricao: '', questoes_ids: [] as number[] });

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedTemaId, selectedMetaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tRes = await axios.get('/api/temas');
      setTemas(tRes.data);
      
      let currentTemaId = selectedTemaId;
      if (tRes.data.length > 0 && currentTemaId === 0) {
        currentTemaId = tRes.data[0].id;
        setSelectedTemaId(currentTemaId);
      }

      if (currentTemaId > 0) {
        const mRes = await axios.get(`/api/metas/${currentTemaId}`);
        setMetas(mRes.data);
        
        let currentMetaId = selectedMetaId;
        if (mRes.data.length > 0 && currentMetaId === 0) {
          currentMetaId = mRes.data[0].id;
          setSelectedMetaId(currentMetaId);
        }

        if (currentMetaId > 0) {
          const qRes = await axios.get(`/api/questoes/${currentMetaId}`);
          setQuestoes(qRes.data);
        } else {
          setQuestoes([]);
        }
      } else {
        setMetas([]);
        setQuestoes([]);
      }

      if (activeTab === 'loja') {
        const aRes = await axios.get('/api/admin/loja');
        setAvatares(aRes.data);
      }

      if (activeTab === 'usuarios') {
        const uRes = await axios.get('/api/admin/usuarios');
        setUsuarios(uRes.data);
      }

      if (activeTab === 'unidades') {
        const hRes = await axios.get('/api/admin/hospitais');
        setHospitais(hRes.data);
      }

      if (activeTab === 'salas') {
        const sRes = await axios.get('/api/admin/salas-batalha');
        setSalas(sRes.data);
      }
    } catch (err) {
      console.error('Erro ao buscar dados', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTema = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/temas', newTema);
      playSound('conquista');
      setNewTema({ nome: '', descricao: '', icone: 'Shield', capa: '' });
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleCreateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const metaData = { ...newMeta, tema_id: newMeta.tema_id || selectedTemaId };
      if (!metaData.tema_id) {
        setAdminError('Selecione um tema primeiro.');
        return;
      }
      await axios.post('/api/admin/metas', metaData);
      playSound('conquista');
      setNewMeta({ tema_id: 0, titulo: '', descricao: '', lore_rpg: '', icone: 'Star', ordem: 1, cor: 'purple' });
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleCreateQuestao = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const questaoData = { ...newQuestao, meta_id: newQuestao.meta_id || selectedMetaId };
      if (!questaoData.meta_id) {
        setAdminError('Selecione uma trilha primeiro.');
        return;
      }
      await axios.post('/api/admin/questoes', questaoData);
      playSound('conquista');
      setNewQuestao({ meta_id: 0, pergunta: '', opcao_a: '', opcao_b: '', opcao_c: '', opcao_d: '', resposta_correta: 'a', explicacao: '' });
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleCreateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/loja', newAvatar);
      playSound('conquista');
      setNewAvatar({ nome: '', url: '', preco_moedas: 100, raridade: 'comum' });
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleDeleteTema = async (id: number) => {
    setAdminError(null);
    try {
      await axios.delete(`/api/admin/temas/${id}`);
      playSound('conquista');
      fetchData();
    } catch (err: any) {
      setAdminError(err.response?.data?.error || 'Erro ao excluir tema');
      playSound('erro');
    }
  };

  const handleDeleteMeta = async (id: number) => {
    setAdminError(null);
    try {
      await axios.delete(`/api/admin/metas/${id}`);
      playSound('conquista');
      fetchData();
    } catch (err: any) {
      setAdminError(err.response?.data?.error || 'Erro ao excluir trilha');
      playSound('erro');
    }
  };

  const handleDeleteQuestao = async (id: number) => {
    setAdminError(null);
    try {
      await axios.delete(`/api/admin/questoes/${id}`);
      playSound('conquista');
      fetchData();
    } catch (err: any) {
      setAdminError('Erro ao excluir questão');
      playSound('erro');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: number) => {
    try {
      await axios.post('/api/admin/usuarios/toggle-status', { userId, ativo: currentStatus === 1 ? 0 : 1 });
      playSound('conquista');
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleResetPassword = async (userId: number) => {
    const novaSenha = prompt('Digite a nova senha para este usuário:');
    if (!novaSenha) return;
    try {
      await axios.post('/api/admin/usuarios/reset-password', { userId, novaSenha });
      alert('Senha redefinida com sucesso!');
      playSound('conquista');
    } catch (err) {
      playSound('erro');
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/hospitais', newHospital);
      playSound('conquista');
      setNewHospital({ nome: '' });
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleDeleteHospital = async (id: number) => {
    try {
      await axios.delete(`/api/admin/hospitais/${id}`);
      playSound('conquista');
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleCreateSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSala.questoes_ids.length === 0) {
      setAdminError('Selecione pelo menos uma questão.');
      return;
    }
    try {
      await axios.post('/api/admin/salas-batalha', newSala);
      playSound('conquista');
      setNewSala({ nome: '', descricao: '', questoes_ids: [] });
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const handleDeleteSala = async (id: number) => {
    try {
      await axios.delete(`/api/admin/salas-batalha/${id}`);
      playSound('conquista');
      fetchData();
    } catch (err) {
      playSound('erro');
    }
  };

  const toggleQuestaoInSala = (qId: number) => {
    setNewSala(prev => {
      const exists = prev.questoes_ids.includes(qId);
      if (exists) {
        return { ...prev, questoes_ids: prev.questoes_ids.filter(id => id !== qId) };
      } else {
        return { ...prev, questoes_ids: [...prev.questoes_ids, qId] };
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl h-[80vh] sleek-card flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-gold/20 rounded-lg text-accent-gold">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Painel do Mestre</h2>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Gerenciamento de Conteúdo HCOR</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-text-muted">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-black/20 overflow-x-auto no-scrollbar">
          {[
            { id: 'temas', label: 'Temas', icon: Layout },
            { id: 'metas', label: 'Trilhas', icon: Map },
            { id: 'questoes', label: 'Questões', icon: HelpCircle },
            { id: 'loja', label: 'Loja', icon: ShoppingBag },
            { id: 'usuarios', label: 'Usuários', icon: Users },
            { id: 'unidades', label: 'Unidades', icon: Building2 },
            { id: 'salas', label: 'Salas', icon: Sword },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { playSound('clique'); setActiveTab(tab.id as any); setAdminError(null); }}
              className={cn(
                "flex-1 min-w-[100px] py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === tab.id ? 'border-accent-gold text-accent-gold bg-accent-gold/5' : 'border-transparent text-text-muted hover:bg-white/5'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {adminError && (
          <div className="mx-8 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest">
              <AlertCircle size={14} />
              {adminError}
            </div>
            <button onClick={() => setAdminError(null)} className="text-red-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'temas' && (
              <motion.div 
                key="temas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8"
              >
                {/* Form Novo Tema */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Plus size={18} className="text-accent-gold" /> Criar Novo Tema
                  </h3>
                  <form onSubmit={handleCreateTema} className="space-y-4 sleek-card p-6 bg-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome do Tema</label>
                      <input 
                        className="sleek-input text-sm" 
                        placeholder="Ex: Protocolo de Sepse"
                        value={newTema.nome}
                        onChange={e => setNewTema({...newTema, nome: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Descrição</label>
                      <textarea 
                        className="sleek-input text-sm min-h-[100px]" 
                        placeholder="Explique o objetivo deste tema..."
                        value={newTema.descricao}
                        onChange={e => setNewTema({...newTema, descricao: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">URL da Capa (Imagem/GIF)</label>
                      <input 
                        className="sleek-input text-sm" 
                        placeholder="https://exemplo.com/imagem.gif"
                        value={newTema.capa}
                        onChange={e => setNewTema({...newTema, capa: e.target.value})}
                      />
                    </div>
                    <button type="submit" className="w-full sleek-btn py-3 text-xs">Salvar Tema</button>
                  </form>
                </div>

                {/* Lista de Temas */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Temas Ativos</h3>
                  <div className="space-y-3">
                    {temas.map(tema => (
                      <div key={tema.id} className="p-4 sleek-card bg-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-accent-gold/10 rounded-xl text-accent-gold">
                            <Layout size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{tema.nome}</h4>
                            <p className="text-[10px] text-text-muted">{tema.descricao}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><Edit3 size={16} /></button>
                          <button 
                            onClick={() => handleDeleteTema(tema.id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'metas' && (
              <motion.div 
                key="metas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4 p-4 sleek-card bg-accent-gold/5 border-accent-gold/20">
                  <Layout size={20} className="text-accent-gold" />
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-accent-gold uppercase tracking-widest block mb-1">Filtrar por Tema</label>
                    <select 
                      className="bg-transparent text-white font-bold outline-none w-full"
                      value={selectedTemaId}
                      onChange={(e) => { setSelectedTemaId(Number(e.target.value)); setSelectedMetaId(0); }}
                    >
                      {temas.map(t => <option key={t.id} value={t.id} className="bg-bg-dark">{t.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Plus size={18} className="text-accent-gold" /> Criar Nova Trilha
                    </h3>
                    <form onSubmit={handleCreateMeta} className="space-y-4 sleek-card p-6 bg-white/5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tema Pai</label>
                        <select 
                          className="sleek-input text-sm appearance-none"
                          value={newMeta.tema_id || selectedTemaId}
                          onChange={e => setNewMeta({...newMeta, tema_id: Number(e.target.value)})}
                          required
                        >
                          <option value={0} disabled className="bg-bg-dark">Selecione o tema</option>
                          {temas.map(t => <option key={t.id} value={t.id} className="bg-bg-dark">{t.nome}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Título da Trilha</label>
                        <input 
                          className="sleek-input text-sm" 
                          placeholder="Ex: AVC Isquêmico"
                          value={newMeta.titulo}
                          onChange={e => setNewMeta({...newMeta, titulo: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Lore RPG (Ambientação)</label>
                        <textarea 
                          className="sleek-input text-sm" 
                          placeholder="Era uma vez no reino do HCOR..."
                          value={newMeta.lore_rpg}
                          onChange={e => setNewMeta({...newMeta, lore_rpg: e.target.value})}
                          required
                        />
                      </div>
                      <button type="submit" className="w-full sleek-btn py-3 text-xs">Salvar Trilha</button>
                    </form>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Trilhas Existentes</h3>
                    <div className="space-y-3">
                      {metas.map(meta => (
                        <div key={meta.id} className="p-4 sleek-card bg-white/5 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold">
                              <Map size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{meta.titulo}</h4>
                              <p className="text-[10px] text-text-muted">Ordem: {meta.ordem}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteMeta(meta.id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-red-400 opacity-40 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'questoes' && (
              <motion.div 
                key="questoes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 sleek-card bg-white/5 flex items-center gap-3">
                    <Layout size={18} className="text-accent-gold" />
                    <div className="flex-1">
                      <label className="text-[8px] font-black text-text-muted uppercase tracking-widest block">Tema</label>
                      <select 
                        className="bg-transparent text-white text-xs font-bold outline-none w-full"
                        value={selectedTemaId}
                        onChange={(e) => { setSelectedTemaId(Number(e.target.value)); setSelectedMetaId(0); }}
                      >
                        {temas.map(t => <option key={t.id} value={t.id} className="bg-bg-dark">{t.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="p-4 sleek-card bg-white/5 flex items-center gap-3">
                    <Map size={18} className="text-accent-gold" />
                    <div className="flex-1">
                      <label className="text-[8px] font-black text-text-muted uppercase tracking-widest block">Trilha</label>
                      <select 
                        className="bg-transparent text-white text-xs font-bold outline-none w-full"
                        value={selectedMetaId}
                        onChange={(e) => setSelectedMetaId(Number(e.target.value))}
                      >
                        <option value={0} className="bg-bg-dark">Selecione uma trilha</option>
                        {metas.map(m => <option key={m.id} value={m.id} className="bg-bg-dark">{m.titulo}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreateQuestao} className="sleek-card p-8 bg-white/5 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vincular à Trilha</label>
                        <select 
                          className="sleek-input text-sm appearance-none"
                          value={newQuestao.meta_id || selectedMetaId}
                          onChange={e => setNewQuestao({...newQuestao, meta_id: Number(e.target.value)})}
                          required
                        >
                          <option value={0} disabled className="bg-bg-dark">Selecione a trilha</option>
                          {metas.map(m => <option key={m.id} value={m.id} className="bg-bg-dark">{m.titulo}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pergunta</label>
                        <textarea 
                          className="sleek-input text-sm min-h-[80px]" 
                          placeholder="Qual a conduta correta em..."
                          value={newQuestao.pergunta}
                          onChange={e => setNewQuestao({...newQuestao, pergunta: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Explicação (Feedback)</label>
                        <textarea 
                          className="sleek-input text-sm" 
                          placeholder="Explique por que esta é a resposta correta..."
                          value={newQuestao.explicacao}
                          onChange={e => setNewQuestao({...newQuestao, explicacao: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {['a', 'b', 'c', 'd'].map(opt => (
                        <div key={opt} className="space-y-1">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Opção {opt.toUpperCase()}</label>
                          <div className="flex gap-2">
                            <input 
                              className="sleek-input text-sm" 
                              placeholder={`Texto da opção ${opt}...`}
                              value={(newQuestao as any)[`opcao_${opt}`]}
                              onChange={e => setNewQuestao({...newQuestao, [`opcao_${opt}`]: e.target.value})}
                              required
                            />
                            <button 
                              type="button"
                              onClick={() => setNewQuestao({...newQuestao, resposta_correta: opt})}
                              className={cn(
                                "px-4 rounded-xl font-bold transition-all",
                                newQuestao.resposta_correta === opt ? 'bg-accent-gold text-black' : 'bg-white/5 text-text-muted'
                              )}
                            >
                              {opt.toUpperCase()}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full sleek-btn py-4">Publicar Questão no Quiz</button>
                </form>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Questões na Trilha Selecionada</h3>
                  <div className="space-y-3">
                    {questoes.length === 0 ? (
                      <p className="text-text-muted text-xs italic">Nenhuma questão cadastrada para esta trilha.</p>
                    ) : (
                      questoes.map(q => (
                        <div key={q.id} className="p-4 sleek-card bg-white/5 space-y-2 group relative">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-white flex-1">{q.pergunta}</p>
                            <button 
                              onClick={() => handleDeleteQuestao(q.id)}
                              className="p-2 hover:bg-white/10 rounded-lg text-red-400 opacity-40 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {['a', 'b', 'c', 'd'].map(opt => (
                              <div key={opt} className={cn(
                                "text-[10px] p-1 rounded border",
                                q.resposta_correta === opt ? "border-accent-gold text-accent-gold bg-accent-gold/5" : "border-white/5 text-text-muted"
                              )}>
                                {opt.toUpperCase()}: {(q as any)[`opcao_${opt}`]}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'loja' && (
              <motion.div 
                key="loja"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Plus size={18} className="text-accent-gold" /> Adicionar Avatar à Loja
                  </h3>
                  <form onSubmit={handleCreateAvatar} className="space-y-4 sleek-card p-6 bg-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome do Avatar</label>
                      <input 
                        className="sleek-input text-sm" 
                        placeholder="Ex: Guardião de Elite"
                        value={newAvatar.nome}
                        onChange={e => setNewAvatar({...newAvatar, nome: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">URL da Imagem</label>
                      <input 
                        className="sleek-input text-sm" 
                        placeholder="https://..."
                        value={newAvatar.url}
                        onChange={e => setNewAvatar({...newAvatar, url: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Preço (Moedas)</label>
                        <input 
                          type="number"
                          className="sleek-input text-sm" 
                          value={newAvatar.preco_moedas}
                          onChange={e => setNewAvatar({...newAvatar, preco_moedas: Number(e.target.value)})}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Raridade</label>
                        <select 
                          className="sleek-input text-sm appearance-none"
                          value={newAvatar.raridade}
                          onChange={e => setNewAvatar({...newAvatar, raridade: e.target.value})}
                          required
                        >
                          <option value="comum" className="bg-bg-dark">Comum</option>
                          <option value="raro" className="bg-bg-dark">Raro</option>
                          <option value="epico" className="bg-bg-dark">Épico</option>
                          <option value="lendario" className="bg-bg-dark">Lendário</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full sleek-btn py-3 text-xs">Salvar Avatar</button>
                  </form>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Itens na Loja</h3>
                  <div className="space-y-3">
                    {avatares.map(avatar => (
                      <div key={avatar.id} className="p-4 sleek-card bg-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <img src={avatar.url} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <h4 className="text-sm font-bold text-white">{avatar.nome}</h4>
                            <p className="text-[10px] text-accent-gold uppercase font-black">{avatar.raridade} • 🪙 {avatar.preco_moedas}</p>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-white/10 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'usuarios' && (
              <motion.div 
                key="usuarios"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Users size={18} className="text-accent-gold" /> Gestão de Usuários
                  </h3>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Total: {usuarios.length} Guardiões
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {usuarios.map(user => (
                    <div key={user.id} className="p-4 sleek-card bg-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img src={user.avatar} className={cn("w-12 h-12 rounded-full border-2 object-cover", user.ativo === 0 ? "grayscale border-red-500/50" : "border-accent-gold/50")} referrerPolicy="no-referrer" />
                          {user.is_admin === 1 && (
                            <div className="absolute -top-1 -right-1 bg-accent-gold text-black p-0.5 rounded-full">
                              <Shield size={10} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className={cn("text-sm font-bold", user.ativo === 0 ? "text-text-muted line-through" : "text-white")}>
                            {user.nome} 
                            {user.ativo === 0 && <span className="ml-2 text-[8px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-widest">Bloqueado</span>}
                          </h4>
                          <p className="text-[10px] text-text-muted">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-widest font-black text-accent-gold">LVL {user.level}</span>
                            <span className="text-[8px] text-text-muted uppercase font-bold tracking-widest">{user.cargo_nome} • {user.hospital_nome}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleResetPassword(user.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          title="Resetar Senha"
                        >
                          <Key size={14} />
                          Resetar Senha
                        </button>
                        
                        <button 
                          onClick={() => handleToggleUserStatus(user.id, user.ativo)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            user.ativo === 1 
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400" 
                              : "bg-success/10 hover:bg-success/20 text-success"
                          )}
                        >
                          {user.ativo === 1 ? (
                            <>
                              <Lock size={14} />
                              Bloquear
                            </>
                          ) : (
                            <>
                              <Unlock size={14} />
                              Desbloquear
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'unidades' && (
              <motion.div 
                key="unidades"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Plus size={18} className="text-accent-gold" /> Nova Unidade / Hospital
                  </h3>
                  <form onSubmit={handleCreateHospital} className="space-y-4 sleek-card p-6 bg-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome da Unidade</label>
                      <input 
                        className="sleek-input text-sm" 
                        placeholder="Ex: Unidade Central"
                        value={newHospital.nome}
                        onChange={e => setNewHospital({ nome: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="w-full sleek-btn py-3 text-xs">Adicionar Unidade</button>
                  </form>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Unidades Cadastradas</h3>
                  <div className="space-y-3">
                    {hospitais.map(h => (
                      <div key={h.id} className="p-4 sleek-card bg-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/10 rounded-lg text-text-muted">
                            <Building2 size={18} />
                          </div>
                          <h4 className="text-sm font-bold text-white">{h.nome}</h4>
                        </div>
                        <button 
                          onClick={() => handleDeleteHospital(h.id)}
                          className="p-2 hover:bg-white/10 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'salas' && (
              <motion.div 
                key="salas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Plus size={18} className="text-accent-gold" /> Configurar Sala de Batalha
                  </h3>
                  <form onSubmit={handleCreateSala} className="space-y-4 sleek-card p-6 bg-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nome da Sala</label>
                      <input 
                        className="sleek-input text-sm" 
                        placeholder="Ex: Torneio de Emergência"
                        value={newSala.nome}
                        onChange={e => setNewSala({ ...newSala, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Descrição</label>
                      <textarea 
                        className="sleek-input text-sm min-h-[80px]" 
                        placeholder="Descreva o objetivo desta sala..."
                        value={newSala.descricao}
                        onChange={e => setNewSala({ ...newSala, descricao: e.target.value })}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Selecionar Questões ({newSala.questoes_ids.length})</label>
                        <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">
                          {newSala.questoes_ids.length < 5 ? `Faltam ${5 - newSala.questoes_ids.length}` : 'Pronto!'}
                        </span>
                      </div>
                      
                      <div className="h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {temas.map(tema => (
                          <div key={tema.id} className="space-y-2">
                            <h5 className="text-[8px] font-black text-accent-gold uppercase tracking-widest border-b border-white/5 pb-1">{tema.nome}</h5>
                            {metas.filter(m => m.tema_id === tema.id).map(meta => (
                              <div key={meta.id} className="space-y-1 pl-2">
                                <h6 className="text-[8px] font-bold text-text-muted uppercase tracking-widest">{meta.titulo}</h6>
                                {questoes.filter(q => q.meta_id === meta.id).map(q => (
                                  <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => toggleQuestaoInSala(q.id)}
                                    className={cn(
                                      "w-full text-left p-2 rounded-lg text-[10px] transition-all flex items-center justify-between gap-2",
                                      newSala.questoes_ids.includes(q.id) ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/30" : "bg-white/5 text-text-muted border border-transparent hover:bg-white/10"
                                    )}
                                  >
                                    <span className="truncate">{q.pergunta}</span>
                                    {newSala.questoes_ids.includes(q.id) && <CheckSquare size={12} />}
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button type="submit" className="w-full sleek-btn py-3 text-xs">Criar Sala de Batalha</button>
                  </form>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Salas Ativas</h3>
                  <div className="space-y-3">
                    {salas.map(s => (
                      <div key={s.id} className="p-4 sleek-card bg-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent-gold/10 rounded-lg text-accent-gold">
                            <Sword size={18} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{s.nome}</h4>
                            <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{s.questoes_ids?.length || 0} Questões Selecionadas</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteSala(s.id)}
                          className="p-2 hover:bg-white/10 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
