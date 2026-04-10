import React, { useState, useCallback } from 'react';
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

const RoletaDiaria = ({ usuarioId, onPremioRecebido }) => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [podeGirar, setPodeGirar] = useState(true);

  const handleGirar = useCallback(async () => {
    if (carregando || mustSpin || !podeGirar) return;

    setCarregando(true);
    setFeedback({ type: '', message: '' });

    try {
      const response = await axios.post(
        '/api/roleta/girar',
        { usuario_id: usuarioId },
        { withCredentials: true }
      );

      const { index_ganhador, valor, mensagem } = response.data;

      setPrizeNumber(index_ganhador);
      setMustSpin(true);
      setFeedback({ type: 'success', message: mensagem || `🎉 Parabéns! +${valor} XP!` });

      if (onPremioRecebido) onPremioRecebido(valor);
    } catch (error) {
      let mensagemErro = 'Erro ao girar a roleta. Tente novamente.';
      
      if (error.response) {
        mensagemErro = error.response.data?.erro || mensagemErro;
        if (error.response.status === 400 && error.response.data?.erro?.includes('já girou hoje')) {
          setPodeGirar(false);
          mensagemErro = '⏳ Você já girou a roleta hoje! Volte amanhã.';
        }
      } else if (error.request) {
        mensagemErro = '❌ Não foi possível conectar ao servidor.';
      } else {
        mensagemErro = `Erro: ${error.message}`;
      }

      setFeedback({ type: 'error', message: mensagemErro });
      setCarregando(false);
    }
  }, [usuarioId, carregando, mustSpin, podeGirar, onPremioRecebido]);

  const handleStopSpinning = useCallback(() => {
    setMustSpin(false);
    setCarregando(false);
  }, []);

  return (
    <div className="card-medieval flex flex-col items-center gap-6 max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-yellow-400 text-center drop-shadow-lg">
        ⚔️ Sorte Diária do Guardião
      </h2>

      <div className="relative flex justify-center w-full">
        <div className="relative w-72 h-72 md:w-80 md:h-80">
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
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-3xl drop-shadow-lg z-10 text-yellow-500">
            ▼
          </div>
        </div>
      </div>

      <button
        onClick={handleGirar}
        disabled={!podeGirar || mustSpin || carregando}
        className={`btn-primary w-full max-w-xs text-lg ${
          (!podeGirar || mustSpin || carregando) ? 'opacity-60 cursor-not-allowed transform-none' : ''
        }`}
      >
        {carregando && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!carregando && (mustSpin ? 'Girando...' : podeGirar ? 'GIRAR ROLETA' : 'LIMITE ATINGIDO')}
      </button>

      {feedback.message && (
        <div className={`mt-4 p-3 rounded-xl text-center font-bold w-full animate-pulse ${
          feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`} role="alert">
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default RoletaDiaria;