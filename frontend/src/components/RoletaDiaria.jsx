import React, { useState, useCallback, useEffect } from 'react';
import { Wheel } from 'react-custom-roulette';
import axios from 'axios';

const data = [
  { option: '10 XP', style: { backgroundColor: '#FF6B6B', textColor: 'white' } },
  { option: '50 XP', style: { backgroundColor: '#4ECDC4', textColor: 'white' } },
  { option: '20 XP', style: { backgroundColor: '#45B7D1', textColor: 'white' } },
  { option: '100 XP', style: { backgroundColor: '#96CEB4', textColor: 'white' } },
  { option: '30 XP', style: { backgroundColor: '#FFEEAD', textColor: 'black' } },
  { option: '200 XP', style: { backgroundColor: '#D4A5A5', textColor: 'white' } },
];

// URL absoluta para o backend
const API_URL = 'http://localhost:5030/api/roleta/girar';

const RoletaDiaria = ({ usuario, onPremioRecebido }) => {
  const usuarioId = usuario?.id;
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [podeGirar, setPodeGirar] = useState(true);

  // Verifica se o usuário já girou hoje
  useEffect(() => {
    const checarStatus = async () => {
      if (!usuarioId) return;
      try {
        const response = await axios.post(
          API_URL,
          { usuario_id: usuarioId },
          { withCredentials: true }
        );
        if (response.data) {
          setPodeGirar(true);
        }
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.erro?.includes('já girou hoje')) {
          setPodeGirar(false);
        } else {
          console.error("Erro ao verificar status da roleta");
        }
      }
    };
    checarStatus();
  }, [usuarioId]);

  const handleGirar = useCallback(async () => {
    if (carregando || mustSpin || !podeGirar || !usuarioId) return;

    setCarregando(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await axios.post(
        API_URL,
        { usuario_id: usuarioId },
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true 
        }
      );

      const { index_ganhador, valor, mensagem } = response.data;

      setPrizeNumber(index_ganhador);
      setMustSpin(true);
      setFeedback({ type: 'success', message: mensagem || `🎉 Parabéns! +${valor} XP!` });
      setPodeGirar(false);
      
      if (onPremioRecebido && valor) {
        onPremioRecebido(valor);
      }
    } catch (error) {
      let mensagemErro = 'Erro ao girar a roleta. Tente novamente.';
      
      if (error.response?.status === 400) {
        mensagemErro = error.response?.data?.erro || '⏳ Você já girou hoje! Volte amanhã.';
        setPodeGirar(false);
      } else if (error.response?.status === 404) {
        mensagemErro = '❌ Servidor não encontrado. Verifique se o backend está rodando.';
      } else if (error.request) {
        mensagemErro = '❌ Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 5030.';
      }
      
      setFeedback({ type: 'error', message: mensagemErro });
      setCarregando(false);
    }
  }, [usuarioId, carregando, mustSpin, podeGirar, onPremioRecebido]);

  const handleStopSpinning = useCallback(() => {
    setMustSpin(false);
    setCarregando(false);
    
    if (prizeNumber !== undefined && feedback.type !== 'success') {
      const premio = data[prizeNumber]?.option || 'XP';
      setFeedback({ 
        type: 'success', 
        message: `🎉 Incrível! Você ganhou ${premio}!` 
      });
    }
  }, [prizeNumber, feedback.type]);

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>⚔️ Sorte Diária do Guardião</h2>

      <div style={wheelWrapperStyle}>
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          outerBorderColor="#2c3e50"
          outerBorderWidth={5}
          innerBorderColor="#f2f2f2"
          radiusLineColor="#dedede"
          radiusLineWidth={1}
          fontSize={20}
          perpendicularText={true}
          onStopSpinning={handleStopSpinning}
        />
        <div style={pointerStyle}>▼</div>
      </div>

      <button
        onClick={handleGirar}
        disabled={!podeGirar || mustSpin || carregando || !usuarioId}
        style={{
          ...buttonStyle,
          background: (!podeGirar || mustSpin || carregando || !usuarioId) 
            ? '#34495e' 
            : 'linear-gradient(135deg, #e67e22, #d35400)',
          cursor: (!podeGirar || mustSpin || carregando || !usuarioId) ? 'not-allowed' : 'pointer',
          opacity: !podeGirar ? 0.7 : 1
        }}
      >
        {carregando && <div className="spinner" />}
        {!carregando && (mustSpin ? 'SORTEANDO...' : podeGirar ? 'GIRAR ROLETA' : 'VOLTE AMANHÃ')}
      </button>

      {feedback.message && (
        <div style={{
          ...feedbackStyle,
          background: feedback.type === 'success' ? '#2ecc71' : '#e74c3c',
        }}>
          {feedback.message}
        </div>
      )}

      <style>{`
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          margin-right: 10px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '20px',
  padding: '30px',
  maxWidth: '450px',
  margin: '0 auto',
  background: '#1a1a2e',
  borderRadius: '2rem',
  boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
};

const titleStyle = {
  color: '#ffd966',
  fontSize: '1.8rem',
  textAlign: 'center',
  margin: 0,
  textShadow: '2px 2px 0 #b45f06',
  fontFamily: 'sans-serif'
};

const wheelWrapperStyle = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  width: '100%'
};

const pointerStyle = {
  position: 'absolute',
  top: '-15px',
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: '2.5rem',
  color: '#e67e22',
  zIndex: 10,
  textShadow: '0 0 5px rgba(0,0,0,0.5)'
};

const buttonStyle = {
  padding: '16px 0',
  width: '100%',
  maxWidth: '280px',
  borderRadius: '50px',
  border: 'none',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '18px',
  transition: 'all 0.3s ease',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '10px'
};

const feedbackStyle = {
  padding: '12px 24px',
  borderRadius: '1rem',
  color: 'white',
  fontWeight: 'bold',
  textAlign: 'center',
  width: '100%',
  animation: 'fadeIn 0.5s ease'
};

export default RoletaDiaria;