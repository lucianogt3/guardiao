import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [matricula, setMatricula] = useState(''); // Estado original mantido
  const [setor, setSetor] = useState('');       // Estado original mantido
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [passoDica, setPassoDica] = useState(0);

  const dicasJogo = [
    { title: "🎁 SISTEMA DE GIFTS", text: "Conquiste baús e insígnias raras ao atingir a excelência nas Metas de Segurança.", icon: "💎" },
    { title: "⚔️ ARENA DE DUELOS", text: "Enfrente outros Guardiões em batalhas de conhecimento e suba no Ranking Global.", icon: "⚔️" },
    { title: "🛡️ A MISSÃO HCOR", text: "Sua jornada foca nas 6 Metas Internacionais. Domine-as para se tornar um Guardião.", icon: "🛡️" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPassoDica((prev) => (prev + 1) % dicasJogo.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const setores = [
    { value: '', label: '-- Selecione seu setor --' },
    { value: 'Pronto Socorro', label: 'Pronto Socorro' },
    { value: 'Posto 1', label: 'Posto 1' },
    { value: 'Posto 2', label: 'Posto 2' },
    { value: 'Posto 3', label: 'Posto 3' },
    { value: 'Centro Cirúrgico (CC)', label: 'Centro Cirúrgico (CC)' },
    { value: 'Hemodinâmica', label: 'Hemodinâmica' },
    { value: 'UTI 1', label: 'UTI 1' },
    { value: 'UTI 2', label: 'UTI 2' },
    { value: 'Farmácia', label: 'Farmácia' },
    { value: 'Qualidade', label: 'Qualidade' },
    { value: 'Administrativo', label: 'Administrativo' },
    { value: 'Outros', label: 'Outros' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação local antes de enviar
    if (!matricula.trim() || !setor) {
      setErro('Por favor, informe sua matrícula e selecione o setor.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      // Enviando exatamente como o Backend espera
      const response = await axios.post('/api/login', {
        matricula: matricula.trim(),
        setor: setor
      });

      if (response.data && response.data.id) {
        // Sucesso: Chama a função onLogin que vem do App.js
        onLogin(response.data);
      } else {
        setErro('Erro na resposta do servidor.');
      }
    } catch (error) {
      console.error("Erro de login:", error);
      // Se o erro for 401 ou 404, mostramos a mensagem do backend
      const msgErro = error.response?.data?.error || 'Erro de conexão com o servidor.';
      setErro(msgErro);
    } finally {
      // Aqui garantimos que o botão saia do estado de "Validando"
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-[#05070a]">
      {/* BACKGROUND (Mesmo estilo anterior) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-16">
        {/* LADO ESQUERDO: INFOS */}
        <div className="flex-1 text-center lg:text-left space-y-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4">
              GUARDIÕES<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 uppercase">
                Da Segurança
              </span>
            </h1>
            
            <div className="mt-8 h-32 relative max-w-lg mx-auto lg:mx-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={passoDica}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 bg-white/[0.03] border border-white/10 p-6 rounded-3xl backdrop-blur-xl flex gap-4 items-center"
                >
                  <div className="text-4xl">{dicasJogo[passoDica].icon}</div>
                  <div className="text-left">
                    <h3 className="text-yellow-500 font-black text-sm uppercase">{dicasJogo[passoDica].title}</h3>
                    <p className="text-gray-300 text-sm leading-snug">{dicasJogo[passoDica].text}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* LADO DIREITO: FORM (ESTILO MEDIEVAL GLASS) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0d1117]/90 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-black">ACESSO À ARENA</h2>
            <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold">HCOR SEGURANÇA</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-4">Matrícula</label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white focus:border-yellow-500 outline-none transition-all"
                placeholder="Seu ID HCor"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-4">Setor (Senha)</label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white focus:border-yellow-500 outline-none transition-all"
                required
              >
                {setores.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#0d1117]">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {erro && (
              <p className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '⚔️ VALIDANDO...' : 'INICIAR MISSÃO'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button onClick={() => navigate('/cadastro')} className="text-gray-500 text-[10px] font-bold hover:text-yellow-500 transition-colors uppercase">
              Não tem herói? Cadastre-se
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;