export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo_id?: number;
  hospital_id?: number;
  cargo_nome?: string;
  hospital_nome?: string;
  avatar: string;
  banner?: string;
  level: number;
  xp: number;
  moedas: number;
  vitorias: number;
  derrotas: number;
  is_admin: number;
}

export interface Tema {
  id: number;
  nome: string;
  descricao: string;
  icone: string;
  capa?: string;
}

export interface Meta {
  id: number;
  tema_id: number;
  titulo: string;
  descricao: string;
  lore_rpg: string;
  icone: string;
  ordem: number;
  cor: string;
}

export interface Cargo {
  id: number;
  nome: string;
}

export interface Hospital {
  id: number;
  nome: string;
}

export interface AvatarLoja {
  id: number;
  nome: string;
  url: string;
  preco_moedas: number;
  raridade: 'comum' | 'raro' | 'epico' | 'lendario';
  comprado?: boolean;
}

export interface Questao {
  id: number;
  meta_id: number;
  pergunta: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  resposta_correta: string;
  explicacao: string;
  dificuldade: number;
}

export interface BattleState {
  id: string;
  players: Usuario[];
  hp: number[];
  round: number;
  questions: Questao[];
}
