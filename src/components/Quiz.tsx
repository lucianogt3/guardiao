import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, CheckCircle2, XCircle, ChevronRight, Trophy } from 'lucide-react';
import { Meta, Questao, Usuario } from '../types';
import { useAudio } from './AudioController';
import { cn } from '@/src/lib/utils';

interface QuizProps {
  usuario: Usuario;
  meta: Meta;
  onComplete: (updatedUser: Usuario) => void;
  onCancel: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ usuario, meta, onComplete, onCancel }) => {
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [quizFinished, setQuizFinished] = useState(false);
  const { playSound } = useAudio();

  useEffect(() => {
    const fetchQuestoes = async () => {
      const res = await axios.get(`/api/questoes/${meta.id}`);
      setQuestoes(res.data);
    };
    fetchQuestoes();
  }, [meta.id]);

  const handleNext = useCallback(() => {
    if (currentIndex < questoes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(15);
    } else {
      setQuizFinished(true);
    }
  }, [currentIndex, questoes.length]);

  useEffect(() => {
    if (quizFinished || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsAnswered(true);
          playSound('timeup');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isAnswered, quizFinished, playSound]);

  const handleAnswer = (option: string) => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    setIsAnswered(true);
    
    const correct = option === questoes[currentIndex].resposta_correta;
    if (correct) {
      setScore(prev => prev + 1);
      playSound('acerto');
    } else {
      playSound('erro');
    }
  };

  const handleFinish = async () => {
    const percent = (score / questoes.length) * 100;
    if (percent >= 70) {
      playSound('conquista');
      const res = await axios.post('/api/completar-meta', { userId: usuario.id, metaId: meta.id });
      onComplete(res.data.user);
    } else {
      playSound('derrota');
      onCancel();
    }
  };

  if (questoes.length === 0) return null;

  const currentQuestao = questoes[currentIndex];
  const percent = (score / questoes.length) * 100;
  const isAprovado = percent >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl sleek-card overflow-hidden shadow-2xl my-auto">
        {!quizFinished ? (
          <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <span className="text-[10px] md:text-xs font-bold text-accent-gold uppercase tracking-widest">Questão {currentIndex + 1} de {questoes.length}</span>
                <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tighter">{meta.titulo}</h2>
              </div>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 font-mono font-bold text-sm md:text-base",
                timeLeft > 5 ? "border-accent-gold text-accent-gold" : "border-red-500 text-red-500 animate-pulse"
              )}>
                <Timer size={18} className="md:w-5 md:h-5" />
                {timeLeft}s
              </div>
            </div>

            {/* Question */}
            <div className="mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">{currentQuestao.pergunta}</h3>
            </div>

            {/* Options */}
            <div className="grid gap-4">
              {['a', 'b', 'c', 'd'].map((opt) => {
                const key = `opcao_${opt}` as keyof Questao;
                const text = currentQuestao[key] as string;
                const isCorrect = opt === currentQuestao.resposta_correta;
                const isSelected = selectedOption === opt;

                return (
                  <button
                    key={opt}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(opt)}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                      !isAnswered 
                        ? "bg-black/20 border-white/10 hover:border-accent-gold hover:bg-white/5" 
                        : isCorrect 
                          ? "bg-success/20 border-success text-success"
                          : isSelected
                            ? "bg-red-900/40 border-red-500 text-red-400"
                            : "bg-black/20 border-white/5 text-gray-600"
                    )}
                  >
                    <span className="font-medium">{text}</span>
                    {isAnswered && isCorrect && <CheckCircle2 size={20} />}
                    {isAnswered && isSelected && !isCorrect && <XCircle size={20} />}
                  </button>
                );
              })}
            </div>

            {/* Feedback & Next */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 bg-black/20 rounded-2xl border border-white/10"
                >
                  <p className="text-sm text-text-muted mb-4 italic">
                    <span className="font-bold text-accent-gold uppercase not-italic mr-2">Explicação:</span>
                    {currentQuestao.explicacao}
                  </p>
                  <button
                    onClick={handleNext}
                    className="w-full sleek-btn"
                  >
                    {currentIndex < questoes.length - 1 ? 'Próxima Questão' : 'Finalizar Quiz'}
                    <ChevronRight size={20} className="inline ml-2" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className={cn(
              "w-24 h-24 mx-auto rounded-full flex items-center justify-center border-4 mb-6",
              isAprovado ? "bg-success border-green-400 text-white" : "bg-red-600 border-red-400 text-white"
            )}>
              {isAprovado ? <Trophy size={48} /> : <XCircle size={48} />}
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic mb-2">
              {isAprovado ? 'Missão Cumprida!' : 'Treinamento Falhou'}
            </h2>
            <p className="text-text-muted mb-8">
              Você acertou {score} de {questoes.length} questões ({percent.toFixed(0)}%).
              {isAprovado ? ' Você provou ser um verdadeiro Guardião!' : ' Estude mais e tente novamente, Guardião.'}
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleFinish}
                className={cn(
                  "flex-1 sleek-btn",
                  !isAprovado && "from-gray-700 to-gray-600 text-white"
                )}
              >
                {isAprovado ? 'Coletar Recompensa' : 'Voltar ao Mapa'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
