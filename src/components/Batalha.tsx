import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Shield, Zap, Timer, User, X, Trophy, Users } from 'lucide-react';
import { Usuario, BattleState, Questao } from '../types';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';

interface BatalhaProps {
  usuario: Usuario;
  onUpdateUser: (user: Usuario) => void;
  onClose: () => void;
}

export const Batalha: React.FC<BatalhaProps> = ({ usuario, onUpdateUser, onClose }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answered, setAnswered] = useState(false);
  const [hp, setHp] = useState([100, 100]);
  const [winner, setWinner] = useState<Usuario | null>(null);
  const [invitation, setInvitation] = useState<{ from: Usuario; sala?: any } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [salas, setSalas] = useState<any[]>([]);
  const [selectedSalaId, setSelectedSalaId] = useState<number | null>(null);
  const { playMusic, playSound } = useAudio();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSalas();
  }, []);

  const fetchSalas = async () => {
    try {
      const res = await axios.get('/api/admin/salas-batalha');
      setSalas(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('registrar_usuario_online', usuario);

    newSocket.on('lista_online', (players) => {
      setOnlinePlayers(players.filter((p: any) => p.id !== usuario.id));
    });

    newSocket.on('batalha_iniciada', (state: BattleState) => {
      setInvitation(null);
      setCountdown(3);
      setBattle(state);
      setSearching(false);
      setHp([100, 100]);
      setCurrentRound(0);
      setTimeLeft(15);
      setMessages([]);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(interval);
            playMusic('battle');
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    });

    newSocket.on('convite_recebido', ({ from, sala }) => {
      setInvitation({ from, sala });
      playSound('conquista');
    });

    newSocket.on('convite_recusado', ({ from }) => {
      alert(`${from.nome} recusou seu convite.`);
      setSearching(false);
    });

    newSocket.on('mensagem_batalha', (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }, 100);
    });

    newSocket.on('resultado_rodada', ({ userId, correct, damage }) => {
      setHp(prev => {
        const newHp = [...prev];
        const playerIndex = battle?.players.findIndex(p => p.id === userId);
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        if (correct) {
          newHp[opponentIndex] = Math.max(0, newHp[opponentIndex] - damage);
        }
        return newHp;
      });
    });

    return () => {
      newSocket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [usuario.id]);

  useEffect(() => {
    if (!battle || winner || answered) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(null); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [battle, winner, answered, currentRound]);

  const handleSearch = () => {
    setSearching(true);
    socket?.emit('buscar_oponente');
    playSound('clique');
  };

  const handleInvite = (targetSocketId: string) => {
    setSearching(true);
    socket?.emit('enviar_convite', { targetSocketId, salaId: selectedSalaId });
    playSound('clique');
  };

  const handleRespondInvitation = (aceito: boolean) => {
    if (!invitation) return;
    socket?.emit('responder_convite', { 
      senderSocketId: (invitation.from as any).socketId, 
      aceito,
      salaId: invitation.sala?.id
    });
    setInvitation(null);
    playSound('clique');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !battle) return;
    socket?.emit('enviar_mensagem_batalha', { battleId: battle.id, text: newMessage });
    setNewMessage('');
  };

  const handleAnswer = (option: string | null) => {
    if (answered || !battle) return;
    setAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const question = battle.questions[currentRound];
    const correct = option === question.resposta_correta;
    const timeBonus = Math.floor(timeLeft / 2);

    socket?.emit('responder_pergunta_batalha', {
      battleId: battle.id,
      userId: usuario.id,
      correct,
      timeBonus
    });

    if (correct) {
      playSound('acerto');
      setHp(prev => {
        const newHp = [...prev];
        const myIndex = battle.players.findIndex(p => p.id === usuario.id);
        const opponentIndex = myIndex === 0 ? 1 : 0;
        newHp[opponentIndex] = Math.max(0, newHp[opponentIndex] - (20 + timeBonus));
        return newHp;
      });
    } else {
      playSound('erro');
    }

    setTimeout(async () => {
      if (currentRound < 4) {
        setCurrentRound(prev => prev + 1);
        setAnswered(false);
        setTimeLeft(15);
      } else {
        // End of battle
        const myIndex = battle.players.findIndex(p => p.id === usuario.id);
        const opponentIndex = myIndex === 0 ? 1 : 0;
        let isWinner = false;
        
        if (hp[myIndex] > hp[opponentIndex]) {
          setWinner(battle.players[myIndex]);
          playSound('conquista');
          isWinner = true;
        } else if (hp[myIndex] < hp[opponentIndex]) {
          setWinner(battle.players[opponentIndex]);
          playSound('derrota');
        } else {
          // Draw logic or winner by HP
          const finalWinner = hp[myIndex] >= hp[opponentIndex] ? battle.players[myIndex] : battle.players[opponentIndex];
          setWinner(finalWinner);
          isWinner = finalWinner.id === usuario.id;
          if (isWinner) playSound('conquista');
          else playSound('derrota');
        }

        try {
          const res = await axios.post('/api/batalha/recompensa', { userId: usuario.id, vitoria: isWinner });
          onUpdateUser(res.data.user);
        } catch (err) {
          console.error('Erro ao processar recompensa da batalha', err);
        }
      }
    }, 2000);
  };

  if (winner) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className={cn(
            "w-32 h-32 mx-auto rounded-full flex items-center justify-center border-4 mb-6",
            winner.id === usuario.id ? "bg-accent-gold/20 border-accent-gold" : "bg-gray-700/20 border-gray-500"
          )}>
            <Trophy size={64} className={winner.id === usuario.id ? "text-accent-gold" : "text-gray-400"} />
          </div>
          <h2 className="text-4xl font-black text-white uppercase italic mb-2 tracking-tighter">
            {winner.id === usuario.id ? 'Vitória Épica!' : 'Derrota Honrosa'}
          </h2>
          <p className="text-text-muted text-xl mb-8">
            {winner.id === usuario.id ? 'Você dominou a arena!' : 'O oponente foi mais rápido desta vez.'}
          </p>
          <button
            onClick={onClose}
            className="sleek-btn px-12"
          >
            Voltar ao Mapa
          </button>
        </motion.div>
      </div>
    );
  }

  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-2xl">
        <motion.div 
          key={countdown}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="text-9xl font-black text-accent-gold italic tracking-tighter"
        >
          {countdown}
        </motion.div>
      </div>
    );
  }

  if (battle) {
    const myIndex = battle.players.findIndex(p => p.id === usuario.id);
    const opponentIndex = myIndex === 0 ? 1 : 0;
    const opponent = battle.players[opponentIndex];
    const question = battle.questions[currentRound];

    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-bg-dark to-red-950 p-4 flex flex-col overflow-hidden">
        {/* Battle Header */}
        <div className="flex justify-between items-center max-w-6xl mx-auto w-full mb-8 mt-4">
          {/* Me */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <h3 className="text-white font-black uppercase italic tracking-tight">{usuario.nome}</h3>
              <div className="w-48 h-4 bg-black/40 rounded-full border-2 border-white/10 overflow-hidden mt-1">
                <motion.div 
                  animate={{ width: `${hp[myIndex]}%` }}
                  className="h-full bg-gradient-to-r from-success to-emerald-500"
                />
              </div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{hp[myIndex]} HP</span>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-success overflow-hidden bg-bg-dark shadow-lg shadow-success/20">
              <img src={usuario.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-accent-gold font-black text-4xl italic mb-1 tracking-tighter animate-pulse">VS</div>
            <div className="bg-black/50 px-4 py-1 rounded-full border border-white/10 text-[10px] text-text-muted uppercase font-bold tracking-widest">
              Rodada {currentRound + 1}/5
            </div>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-red-500 overflow-hidden bg-bg-dark shadow-lg shadow-red-500/20">
              <img src={opponent.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h3 className="text-white font-black uppercase italic tracking-tight">{opponent.nome}</h3>
              <div className="w-48 h-4 bg-black/40 rounded-full border-2 border-white/10 overflow-hidden mt-1">
                <motion.div 
                  animate={{ width: `${hp[opponentIndex]}%` }}
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                />
              </div>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{hp[opponentIndex]} HP</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full overflow-hidden">
          {/* Question Area */}
          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto pr-2 custom-scrollbar">
            <div className="relative w-full sleek-card p-8 mb-6 text-center bg-black/40 border-white/5">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-accent-gold text-black px-6 py-2 rounded-full font-black flex items-center gap-2 shadow-lg z-10">
                <Timer size={20} />
                {timeLeft}s
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-tight mt-4">
                {question.pergunta}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {['a', 'b', 'c', 'd'].map((opt) => {
                const key = `opcao_${opt}` as keyof Questao;
                return (
                  <button
                    key={opt}
                    disabled={answered}
                    onClick={() => handleAnswer(opt)}
                    className={cn(
                      "p-5 rounded-2xl border-2 text-left transition-all font-bold text-base",
                      !answered 
                        ? "bg-black/20 border-white/10 hover:border-accent-gold hover:bg-white/5 text-white" 
                        : opt === question.resposta_correta
                          ? "bg-success/20 border-success text-success"
                          : "bg-black/20 border-white/5 text-gray-600"
                    )}
                  >
                    <span className="text-accent-gold mr-2">{opt.toUpperCase()}.</span>
                    {question[key] as string}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Battle Chat */}
          <div className="w-full md:w-80 flex flex-col bg-black/40 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
              <Users size={16} className="text-accent-gold" />
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Chat da Batalha</h4>
            </div>
            
            <div ref={chatRef} className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col", msg.userId === usuario.id ? "items-end" : "items-start")}>
                  <span className="text-[8px] font-black text-text-muted uppercase mb-1">{msg.userName}</span>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-xs max-w-[90%]",
                    msg.userId === usuario.id ? "bg-accent-gold text-black rounded-tr-none" : "bg-white/10 text-white rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-[10px] text-text-muted italic text-center py-8">Provoque seu oponente!</p>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5">
              <input 
                type="text"
                className="sleek-input text-xs"
                placeholder="Enviar mensagem..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl sleek-card overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-red-950/20">
          <h2 className="text-2xl font-black text-red-500 uppercase tracking-tighter italic flex items-center gap-3">
            <Sword size={32} />
            Arena dos Guardiões
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[500px]">
          {/* Players Online */}
          <div className="col-span-1 border-r border-white/5 p-6 flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Guardioes Online ({onlinePlayers.length})</h3>
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {onlinePlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-accent-gold overflow-hidden">
                      <img src={p.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">{p.nome}</p>
                      <p className="text-[8px] text-accent-gold uppercase font-black mt-1 tracking-widest">{p.hospital_nome || 'Sem Unidade'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleInvite(p.socketId)}
                    className="p-2 bg-accent-gold/10 hover:bg-accent-gold text-accent-gold hover:text-black rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Convidar para Duelo"
                  >
                    <Sword size={14} />
                  </button>
                </div>
              ))}
              {onlinePlayers.length === 0 && (
                <p className="text-sm text-text-muted italic text-center py-8">Nenhum outro guardião online no momento...</p>
              )}
            </div>
          </div>

          {/* Matchmaking Area */}
          <div className="col-span-2 p-8 flex flex-col items-center justify-center text-center relative">
            <AnimatePresence>
              {invitation && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute inset-x-8 bottom-8 z-20 p-6 bg-accent-gold rounded-3xl shadow-2xl flex flex-col items-center gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img src={invitation.from.avatar} className="w-12 h-12 rounded-full border-2 border-black/20" />
                    <div className="text-left">
                      <p className="text-black font-black uppercase italic text-sm">{invitation.from.nome} te desafiou!</p>
                      <p className="text-black/60 text-[10px] font-bold uppercase tracking-widest">
                        {invitation.sala ? `Sala: ${invitation.sala.nome}` : 'Duelo Aleatório'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => handleRespondInvitation(true)}
                      className="flex-1 py-3 bg-black text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black/80 transition-all"
                    >
                      Aceitar Desafio
                    </button>
                    <button 
                      onClick={() => handleRespondInvitation(false)}
                      className="flex-1 py-3 bg-black/10 text-black rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black/20 transition-all"
                    >
                      Recusar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {searching ? (
              <div className="space-y-8">
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-32 h-32 border-4 border-red-600 border-t-transparent rounded-full"
                  />
                  <Sword className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600" size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter italic">Aguardando Resposta...</h3>
                  <p className="text-text-muted">Desafio enviado. Prepare-se para a batalha.</p>
                </div>
                <button 
                  onClick={() => setSearching(false)}
                  className="text-text-muted hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="space-y-6 w-full max-w-md">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest text-left">Escolher Sala de Batalha (Opcional)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSelectedSalaId(null)}
                      className={cn(
                        "p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        selectedSalaId === null ? "bg-accent-gold text-black border-accent-gold" : "bg-white/5 text-text-muted border-white/10 hover:bg-white/10"
                      )}
                    >
                      Aleatório
                    </button>
                    {salas.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedSalaId(s.id)}
                        className={cn(
                          "p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all truncate",
                          selectedSalaId === s.id ? "bg-accent-gold text-black border-accent-gold" : "bg-white/5 text-text-muted border-white/10 hover:bg-white/10"
                        )}
                      >
                        {s.nome}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                    <Zap className="text-accent-gold mx-auto mb-2" size={24} />
                    <h4 className="text-white font-bold mb-1 uppercase text-[8px] tracking-widest">Dano Veloz</h4>
                    <p className="text-[8px] text-text-muted leading-relaxed">Resposta rápida = Mais dano.</p>
                  </div>
                  <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                    <Shield className="text-blue-500 mx-auto mb-2" size={24} />
                    <h4 className="text-white font-bold mb-1 uppercase text-[8px] tracking-widest">Bloqueio</h4>
                    <p className="text-[8px] text-text-muted leading-relaxed">Acertos protegem seu HP.</p>
                  </div>
                </div>
                
                <button
                  onClick={handleSearch}
                  className="group relative w-full py-5 bg-red-600 hover:bg-red-500 rounded-2xl transition-all active:scale-95 overflow-hidden shadow-xl shadow-red-900/20"
                >
                  <div className="relative z-10 flex items-center justify-center gap-3 text-white font-black text-xl uppercase italic tracking-tighter">
                    <Sword size={24} />
                    Fila de Matchmaking
                  </div>
                </button>
                <p className="text-text-muted text-[8px] font-bold uppercase tracking-widest italic">Ou selecione um Guardião ao lado para desafiar diretamente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
