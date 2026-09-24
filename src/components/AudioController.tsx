import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioContextType {
  playMusic: (type: 'menu' | 'battle' | 'ranking') => void;
  playSound: (type: 'clique' | 'acerto' | 'erro' | 'conquista' | 'derrota' | 'timeup') => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const playMusic = (type: 'menu' | 'battle' | 'ranking') => {
    if (musicRef.current) {
      musicRef.current.pause();
    }
    
    // Placeholder URLs - in a real app these would be local assets
    const urls = {
      menu: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      battle: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      ranking: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    };

    const audio = new Audio(urls[type]);
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(e => console.log('Autoplay blocked', e));
    musicRef.current = audio;
  };

  const playSound = (type: string) => {
    const urls: Record<string, string> = {
      clique: 'https://actions.google.com/sounds/v1/foley/button_click.ogg',
      acerto: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
      erro: 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flick.ogg',
      conquista: 'https://actions.google.com/sounds/v1/cartoon/clap_and_cheer.ogg',
      derrota: 'https://actions.google.com/sounds/v1/cartoon/slide_whistle_down.ogg',
      timeup: 'https://actions.google.com/sounds/v1/alarms/alarm_clock_beeping.ogg'
    };
    
    const audio = new Audio(urls[type]);
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch(e => console.log('Sound blocked', e));
  };

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  return (
    <AudioContext.Provider value={{ playMusic, playSound, volume, setVolume, isMuted, setIsMuted }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
};
