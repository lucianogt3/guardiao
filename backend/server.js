const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);

// =========================
// CONFIG
// =========================
const PORT = 5030;
const DB_FILE = './guardiao_hcor.db';
const CORS_ORIGINS = [
  'https://guardiao.nursetec.com.br',
  'http://guardiao.nursetec.com.br',
  'http://localhost:5173',
  'http://localhost:3000'
];

// =========================
// MIDDLEWARE
// =========================
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// =========================
// SOCKET.IO (CORRIGIDO PARA ESTABILIDADE WSS/NGINX)
// =========================
const io = socketIo(server, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  },
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ['polling', 'websocket']
});

// =========================
// SQLITE
// =========================
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

console.log(`✅ SQLite conectado em ${DB_FILE}`);
console.log(`🚀 Motor de Batalha sincronizado para Produção (HTTPS)`);

// =========================
// SCHEMA
// =========================
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      matricula TEXT UNIQUE,
      avatar TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      setor TEXT,
      vitorias_pvp INTEGER DEFAULT 0,
      derrotas_pvp INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      lore_rpg TEXT,
      icone TEXT,
      ordem INTEGER,
      cor TEXT
    );

    CREATE TABLE IF NOT EXISTS questoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meta_id INTEGER NOT NULL,
      pergunta TEXT NOT NULL,
      opcao_a TEXT NOT NULL,
      opcao_b TEXT NOT NULL,
      opcao_c TEXT NOT NULL,
      opcao_d TEXT NOT NULL,
      resposta_correta TEXT NOT NULL,
      explicacao TEXT,
      dificuldade INTEGER DEFAULT 1,
      FOREIGN KEY (meta_id) REFERENCES metas(id)
    );

    CREATE TABLE IF NOT EXISTS metas_concluidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      meta_id INTEGER NOT NULL,
      UNIQUE(usuario_id, meta_id)
    );

    CREATE TABLE IF NOT EXISTS batalhas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      venceu INTEGER DEFAULT 0
    );
  `);
}

initDatabase();

// =========================
// PREPARED STATEMENTS
// =========================

const stmtGetUsuarioById = db.prepare(`
  SELECT id, nome, matricula, avatar, level, xp, setor, vitorias_pvp, derrotas_pvp
  FROM usuarios
  WHERE id = ?
`);

const stmtGetUsuarioByMatricula = db.prepare(`
  SELECT id, nome, matricula, avatar, level, xp, setor, vitorias_pvp, derrotas_pvp
  FROM usuarios
  WHERE matricula = ? AND setor = ?
`);

const stmtCheckMatricula = db.prepare(`
  SELECT id, setor FROM usuarios WHERE matricula = ?
`);

const stmtGetMetas = db.prepare(`
  SELECT id, titulo, descricao, lore_rpg, icone, ordem, cor
  FROM metas
  ORDER BY ordem
`);

const stmtGetQuestoesByMeta = db.prepare(`
  SELECT id, meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao, dificuldade
  FROM questoes
  WHERE meta_id = ?
  ORDER BY id
`);

const stmtGetQuestaoById = db.prepare(`
  SELECT id, meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao, dificuldade
  FROM questoes
  WHERE id = ?
`);

const stmtGetQuestoesAleatorias = db.prepare(`
  SELECT id, meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao, dificuldade
  FROM questoes
  ORDER BY RANDOM()
  LIMIT ?
`);

const stmtInsertMetaConcluida = db.prepare(`
  INSERT OR IGNORE INTO metas_concluidas (usuario_id, meta_id)
  VALUES (?, ?)
`);

const stmtGetMetasConcluidas = db.prepare(`
  SELECT meta_id FROM metas_concluidas WHERE usuario_id = ?
`);

const stmtGetRanking = db.prepare(`
  SELECT
    u.id,
    u.nome,
    u.matricula,
    u.avatar,
    u.setor,
    u.level,
    u.xp AS pontos,
    u.vitorias_pvp AS vitorias,
    u.derrotas_pvp AS derrotas
  FROM usuarios u
  ORDER BY u.xp DESC, u.vitorias_pvp DESC, u.nome ASC
`);

const stmtInsertBatalha = db.prepare(`
  INSERT INTO batalhas (usuario_id, venceu)
  VALUES (?, ?)
`);

const stmtAddXp = db.prepare(`
  UPDATE usuarios
  SET xp = COALESCE(xp, 0) + ?
  WHERE id = ?
`);

const stmtAddVitoria = db.prepare(`
  UPDATE usuarios
  SET vitorias_pvp = COALESCE(vitorias_pvp, 0) + 1
  WHERE id = ?
`);

const stmtAddDerrota = db.prepare(`
  UPDATE usuarios
  SET derrotas_pvp = COALESCE(derrotas_pvp, 0) + 1
  WHERE id = ?
`);

const stmtLevelUpByXp = db.prepare(`
  UPDATE usuarios
  SET level = CASE
    WHEN COALESCE(xp,0) >= 1000 THEN 10
    WHEN COALESCE(xp,0) >= 800 THEN 9
    WHEN COALESCE(xp,0) >= 650 THEN 8
    WHEN COALESCE(xp,0) >= 500 THEN 7
    WHEN COALESCE(xp,0) >= 380 THEN 6
    WHEN COALESCE(xp,0) >= 280 THEN 5
    WHEN COALESCE(xp,0) >= 190 THEN 4
    WHEN COALESCE(xp,0) >= 110 THEN 3
    WHEN COALESCE(xp,0) >= 50 THEN 2
    ELSE 1
  END
  WHERE id = ?
`);

// =========================
// ROTAS DA API
// =========================

// Rota de cadastro
app.post('/api/cadastro', (req, res) => {
  try {
    const { matricula, setor, avatar, nome } = req.body;
    
    if (!matricula || !String(matricula).trim()) {
      return res.status(400).json({ error: 'Matrícula é obrigatória' });
    }
    
    if (!setor || !String(setor).trim()) {
      return res.status(400).json({ error: 'Setor é obrigatório' });
    }
    
    const checkUser = db.prepare('SELECT id, matricula, setor FROM usuarios WHERE matricula = ?');
    const existingUser = checkUser.get(String(matricula).trim());
    
    if (existingUser) {
      return res.status(400).json({ error: 'Matrícula já cadastrada' });
    }
    
    const nomeFinal = nome && nome.trim() ? nome.trim() : `Jogador ${matricula}`;
    
    const insert = db.prepare(`
      INSERT INTO usuarios (nome, matricula, avatar, level, xp, setor, vitorias_pvp, derrotas_pvp)
      VALUES (?, ?, ?, 1, 0, ?, 0, 0)
    `);
    
    const result = insert.run(
      nomeFinal,
      String(matricula).trim(),
      avatar || '🛡️',
      String(setor).trim()
    );
    
    const usuario = db.prepare(`
      SELECT id, nome, matricula, avatar, level, xp, setor, vitorias_pvp, derrotas_pvp
      FROM usuarios WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.json({
      success: true,
      mensagem: 'Cadastro realizado com sucesso!',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        matricula: usuario.matricula,
        avatar: usuario.avatar,
        level: usuario.level,
        xp: usuario.xp,
        setor: usuario.setor,
        vitorias_pvp: usuario.vitorias_pvp,
        derrotas_pvp: usuario.derrotas_pvp,
        metas_concluidas: []
      }
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Rota de login
app.post('/api/login', (req, res) => {
  try {
    const { matricula, setor } = req.body;
    
    if (!matricula || !String(matricula).trim()) {
      return res.status(400).json({ error: 'Matrícula é obrigatória' });
    }
    
    if (!setor || !String(setor).trim()) {
      return res.status(400).json({ error: 'Setor é obrigatório' });
    }
    
    let usuario = stmtGetUsuarioByMatricula.get(String(matricula).trim(), String(setor).trim());
    
    if (!usuario) {
      return res.status(401).json({ error: 'Matrícula ou setor incorretos' });
    }
    
    const metasConcluidas = stmtGetMetasConcluidas.all(usuario.id).map(row => row.meta_id);
    
    const posicaoRanking = stmtGetRanking.all().findIndex(r => r.id === usuario.id) + 1;
    
    res.json({
      id: usuario.id,
      nome: usuario.nome,
      matricula: usuario.matricula,
      avatar: usuario.avatar,
      level: usuario.level,
      xp: usuario.xp,
      setor: usuario.setor,
      vitorias_pvp: usuario.vitorias_pvp || 0,
      derrotas_pvp: usuario.derrotas_pvp || 0,
      metas_concluidas: metasConcluidas,
      ranking_posicao: posicaoRanking
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Rota para perfil
app.get('/api/perfil/:usuarioId', (req, res) => {
  try {
    const usuarioId = Number(req.params.usuarioId);
    const usuario = stmtGetUsuarioById.get(usuarioId);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const metasConcluidas = stmtGetMetasConcluidas.all(usuarioId).map(row => row.meta_id);
    const xpProximo = 600 - (usuario.xp % 600);
    
    res.json({
      nome: usuario.nome,
      setor: usuario.setor,
      avatar: usuario.avatar,
      xp: usuario.xp,
      level: usuario.level,
      xp_proximo_level: xpProximo,
      metas_concluidas: metasConcluidas,
      vitorias_pvp: usuario.vitorias_pvp || 0,
      derrotas_pvp: usuario.derrotas_pvp || 0
    });
  } catch (error) {
    console.error('Erro /api/perfil:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Rota de metas
app.get('/api/metas', (req, res) => {
  try {
    const dados = stmtGetMetas.all();
    res.json(dados);
  } catch (e) {
    console.error('Erro /api/metas:', e);
    res.status(500).json({ error: e.message });
  }
});

// Rota de questões
app.get('/api/questoes/:metaId', (req, res) => {
  try {
    const metaId = Number(req.params.metaId);
    const dados = stmtGetQuestoesByMeta.all(metaId);
    
    const questoesFormatadas = dados.map(questao => ({
      id: questao.id,
      meta_id: questao.meta_id,
      pergunta: questao.pergunta,
      opcao_a: questao.opcao_a,
      opcao_b: questao.opcao_b,
      opcao_c: questao.opcao_c,
      opcao_d: questao.opcao_d,
      resposta_correta: questao.resposta_correta,
      explicacao: questao.explicacao,
      dificuldade: questao.dificuldade
    }));
    
    res.json(questoesFormatadas);
  } catch (e) {
    console.error('Erro /api/questoes/:metaId:', e);
    res.status(500).json({ error: e.message });
  }
});

// Rota de responder
app.post('/api/responder', (req, res) => {
  try {
    const { questao_id, resposta } = req.body;
    
    const questao = stmtGetQuestaoById.get(Number(questao_id));
    
    if (!questao) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    const respostaNormalizada = String(resposta).trim().toUpperCase();
    const corretaLetra = String(questao.resposta_correta).trim().toUpperCase();
    const correta = respostaNormalizada === corretaLetra;
    
    res.json({
      correta,
      pontos_ganhos: correta ? 10 * (questao.dificuldade || 1) : 0,
      explicacao: questao.explicacao,
      resposta_correta: questao.resposta_correta
    });
  } catch (e) {
    console.error('Erro /api/responder:', e);
    res.status(500).json({ error: e.message });
  }
});

// Rota de completar meta
app.post('/api/completar-meta/:metaId', (req, res) => {
  try {
    const metaId = Number(req.params.metaId);
    const usuario_id = req.body.usuario_id;
    
    if (!metaId || isNaN(metaId)) {
      return res.status(400).json({ error: 'metaId é obrigatório' });
    }
    
    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id é obrigatório' });
    }
    
    const usuario = stmtGetUsuarioById.get(usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const checkStmt = db.prepare(`
      SELECT * FROM metas_concluidas 
      WHERE usuario_id = ? AND meta_id = ?
    `);
    const jaConcluida = checkStmt.get(usuario_id, metaId);
    
    if (jaConcluida) {
      return res.json({
        success: true,
        meta_completada: true,
        ja_concluida: true,
        xp_ganho: 0,
        novo_level: usuario.level,
        metas_concluidas: stmtGetMetasConcluidas.all(usuario_id).map(row => row.meta_id)
      });
    }
    
    stmtInsertMetaConcluida.run(usuario_id, metaId);
    stmtAddXp.run(100, usuario_id);
    stmtLevelUpByXp.run(usuario_id);
    
    const metasConcluidas = stmtGetMetasConcluidas.all(usuario_id).map(row => row.meta_id);
    const usuarioAtualizado = stmtGetUsuarioById.get(usuario_id);
    
    res.json({
      success: true,
      meta_completada: true,
      ja_concluida: false,
      xp_ganho: 100,
      novo_level: usuarioAtualizado.level,
      metas_concluidas: metasConcluidas,
      elegivel_sorteio: metasConcluidas.length === 6
    });
  } catch (error) {
    console.error('Erro ao completar meta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de ranking
app.get('/api/ranking_completo', (req, res) => {
  try {
    const ranking = stmtGetRanking.all().map((r, idx) => ({
      posicao: idx + 1,
      id: r.id,
      nome: r.nome,
      avatar: r.avatar,
      setor: r.setor,
      level: r.level,
      pontos: r.pontos,
      vitorias: r.vitorias,
      derrotas: r.derrotas,
      kd: r.derrotas > 0 ? Number(r.vitorias / r.derrotas).toFixed(2) : String(r.vitorias)
    }));
    res.json(ranking);
  } catch (e) {
    console.error('Erro /api/ranking_completo:', e);
    res.status(500).json({ error: e.message });
  }
});

// Rota de ranking simples
app.get('/api/ranking', (req, res) => {
  try {
    const ranking = stmtGetRanking.all().slice(0, 20).map(r => ({
      nome: r.nome,
      avatar: r.avatar,
      pontos: r.pontos,
      setor: r.setor,
      level: r.level
    }));
    res.json(ranking);
  } catch (e) {
    console.error('Erro /api/ranking:', e);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  try {
    const totalMetas = db.prepare('SELECT COUNT(*) AS total FROM metas').get().total;
    const totalQuestoes = db.prepare('SELECT COUNT(*) AS total FROM questoes').get().total;
    const totalUsuarios = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: 'sqlite',
      metas: totalMetas,
      questoes: totalQuestoes,
      usuarios: totalUsuarios,
      online: usuariosOnline.size,
      fila: filaBatalha.length,
      batalhas_ativas: salasBatalha.size
    });
  } catch (e) {
    console.error('Erro /health:', e);
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// =========================
// ESTADO EM MEMÓRIA
// =========================
const salasBatalha = new Map();
const filaBatalha = [];
const usuariosOnline = new Map();
const desafiosPendentes = new Map();

// =========================
// BROADCAST PARA ATUALIZAR LISTA
// =========================
function broadcastListaOnline() {
  const onlinePlayers = Array.from(usuariosOnline.values()).map(u => ({
    id: u.id,
    nome: u.nome,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    setor: u.setor,
    vitorias_pvp: u.vitorias_pvp || 0,
    derrotas_pvp: u.derrotas_pvp || 0
  }));
  
  console.log(`📡 Broadcast lista online: ${onlinePlayers.length} jogadores`);
  io.emit('lista_online', onlinePlayers);
}

// =========================
// HELPERS
// =========================
function now() {
  return Date.now();
}

function gerarSalaId() {
  return `sala_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function gerarDesafioId() {
  return `desafio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSocketById(socketId) {
  return io.sockets.sockets.get(socketId);
}

function getSocketByUsuarioId(usuarioId) {
  const usuario = usuariosOnline.get(usuarioId);
  if (!usuario) return null;
  return getSocketById(usuario.socketId);
}

function removerDaFila(usuarioId) {
  for (let i = filaBatalha.length - 1; i >= 0; i--) {
    if (filaBatalha[i].id === usuarioId) {
      filaBatalha.splice(i, 1);
    }
  }
}

function jaEstaEmBatalha(usuarioId) {
  for (const sala of salasBatalha.values()) {
    if (sala.jogadores.some(j => j.id === usuarioId)) {
      return true;
    }
  }
  return false;
}

function entrarNaFilaSemDuplicar(usuario) {
  removerDaFila(usuario.id);
  if (!jaEstaEmBatalha(usuario.id)) {
    filaBatalha.push(usuario);
  }
}

function letraParaTexto(questao, letra) {
  const l = String(letra || '').trim().toUpperCase();
  if (l === 'A') return questao.opcao_a;
  if (l === 'B') return questao.opcao_b;
  if (l === 'C') return questao.opcao_c;
  if (l === 'D') return questao.opcao_d;
  return null;
}

function normalizarQuestao(questao) {
  return {
    id: questao.id,
    meta_id: questao.meta_id,
    pergunta: questao.pergunta,
    opcao_a: questao.opcao_a,
    opcao_b: questao.opcao_b,
    opcao_c: questao.opcao_c,
    opcao_d: questao.opcao_d,
    opcoes: {
      A: questao.opcao_a,
      B: questao.opcao_b,
      C: questao.opcao_c,
      D: questao.opcao_d
    },
    resposta_correta: questao.resposta_correta,
    explicacao: questao.explicacao,
    dificuldade: questao.dificuldade
  };
}

function questaoPublica(questao) {
  const q = normalizarQuestao(questao);
  return {
    id: q.id,
    pergunta: q.pergunta,
    opcoes: q.opcoes,
    dificuldade: q.dificuldade
  };
}

function isRespostaCorreta(questao, resposta) {
  if (!resposta || resposta === 'TIMEOUT') return false;
  
  const respostaNormalizada = String(resposta).trim().toUpperCase();
  const corretaLetra = String(questao.resposta_correta).trim().toUpperCase();
  
  if (['A', 'B', 'C', 'D'].includes(respostaNormalizada)) {
    return respostaNormalizada === corretaLetra;
  }
  
  const respostaTexto = String(resposta).trim().toLowerCase();
  const corretaTexto = String(letraParaTexto(questao, corretaLetra) || '').trim().toLowerCase();
  
  return respostaTexto === corretaTexto;
}

function calcularDano(tempoRestante, multiplicador = 1) {
  const baseDano = 15;
  const tr = Number.isFinite(Number(tempoRestante)) ? Number(tempoRestante) : 0;
  const bonusVelocidade = Math.max(0, Math.min(10, Math.floor(tr / 2)));
  return Math.floor((baseDano + bonusVelocidade) * multiplicador);
}

function broadcastSala(sala, evento, payload) {
  sala.jogadores.forEach((jogador) => {
    const s = getSocketById(jogador.socketId);
    if (s) s.emit(evento, payload);
  });
}

function salvarResultadoBatalha(sala) {
  const xpVitoria = 50;
  const xpDerrota = 20;
  
  const transacao = db.transaction(() => {
    sala.jogadores.forEach((jogador) => {
      const venceu = sala.vencedor && sala.vencedor.id === jogador.id ? 1 : 0;
      stmtInsertBatalha.run(jogador.id, venceu);
      stmtAddXp.run(venceu ? xpVitoria : xpDerrota, jogador.id);
      stmtLevelUpByXp.run(jogador.id);
      
      if (venceu) {
        stmtAddVitoria.run(jogador.id);
      } else {
        stmtAddDerrota.run(jogador.id);
      }
    });
  });
  
  transacao();
}

function finalizarSala(salaId, motivo = 'fim') {
  const sala = salasBatalha.get(salaId);
  if (!sala) return;
  
  if (sala.timeoutRodada) {
    clearTimeout(sala.timeoutRodada);
    sala.timeoutRodada = null;
  }
  
  const [j1, j2] = sala.jogadores;
  let vencedor = null;
  
  if (j1.hp > j2.hp) vencedor = j1;
  else if (j2.hp > j1.hp) vencedor = j2;
  else if (j1.acertos > j2.acertos) vencedor = j1;
  else if (j2.acertos > j1.acertos) vencedor = j2;
  
  sala.vencedor = vencedor;
  
  salvarResultadoBatalha(sala);
  
  broadcastSala(sala, 'fim_batalha', {
    vencedor_id: vencedor ? vencedor.id : null,
    vencedor_nome: vencedor ? vencedor.nome : null,
    hp_final: {
      [j1.id]: j1.hp,
      [j2.id]: j2.hp
    },
    acertos_final: {
      [j1.id]: j1.acertos,
      [j2.id]: j2.acertos
    }
  });
  
  salasBatalha.delete(salaId);
  
  // Atualiza a lista online após a batalha
  broadcastListaOnline();
}

function processarRodada(salaId) {
  const sala = salasBatalha.get(salaId);
  if (!sala || sala.rodadaProcessada) return;
  
  sala.rodadaProcessada = true;
  if (sala.timeoutRodada) {
    clearTimeout(sala.timeoutRodada);
    sala.timeoutRodada = null;
  }
  
  const questao = sala.perguntas[sala.rodadaAtual];
  const [j1, j2] = sala.jogadores;
  
  const j1Correta = isRespostaCorreta(questao, j1.resposta);
  const j2Correta = isRespostaCorreta(questao, j2.resposta);
  
  if (j1Correta) j1.acertos += 1;
  if (j2Correta) j2.acertos += 1;
  
  let danoJ1 = 0, danoJ2 = 0;
  
  if (j1Correta && !j2Correta) {
    danoJ1 = calcularDano(j1.tempoRestante, 1);
    j2.hp = Math.max(0, j2.hp - danoJ1);
  } else if (!j1Correta && j2Correta) {
    danoJ2 = calcularDano(j2.tempoRestante, 1);
    j1.hp = Math.max(0, j1.hp - danoJ2);
  } else if (j1Correta && j2Correta) {
    const j1Tempo = Number(j1.tempoResposta ?? Number.MAX_SAFE_INTEGER);
    const j2Tempo = Number(j2.tempoResposta ?? Number.MAX_SAFE_INTEGER);
    
    if (j1Tempo < j2Tempo) {
      danoJ1 = calcularDano(j1.tempoRestante, 0.8);
      j2.hp = Math.max(0, j2.hp - danoJ1);
    } else if (j2Tempo < j1Tempo) {
      danoJ2 = calcularDano(j2.tempoRestante, 0.8);
      j1.hp = Math.max(0, j1.hp - danoJ2);
    }
  }
  
  // Emite resultado individual para cada jogador
  broadcastSala(sala, 'resultado_rodada', {
    jogador_id: j1.id,
    acertou: j1Correta,
    dano_causado: danoJ1,
    hp_atual: j1.hp,
    hp_oponente: j2.hp
  });
  
  broadcastSala(sala, 'resultado_rodada', {
    jogador_id: j2.id,
    acertou: j2Correta,
    dano_causado: danoJ2,
    hp_atual: j2.hp,
    hp_oponente: j1.hp
  });
  
  if (j1.hp <= 0 || j2.hp <= 0) {
    setTimeout(() => finalizarSala(sala.id, 'hp_zero'), 2000);
    return;
  }
  
  sala.rodadaAtual += 1;
  
  if (sala.rodadaAtual >= sala.totalRodadas) {
    setTimeout(() => finalizarSala(sala.id, 'rodadas_finais'), 2000);
    return;
  }
  
  setTimeout(() => {
    iniciarRodada(sala.id);
  }, 2500);
}

function iniciarRodada(salaId) {
  const sala = salasBatalha.get(salaId);
  if (!sala) return;
  
  const questao = sala.perguntas[sala.rodadaAtual];
  if (!questao) {
    finalizarSala(sala.id, 'sem_questoes');
    return;
  }
  
  sala.jogadores.forEach(j => {
    j.respondeu = false;
    j.resposta = null;
    j.tempoResposta = null;
    j.tempoRestante = null;
  });
  sala.primeiroRespondedor = null;
  sala.rodadaProcessada = false;
  sala.inicioRodada = now();
  
  broadcastSala(sala, 'nova_pergunta', {
    pergunta: questao.pergunta,
    opcoes: questao.opcoes,
    tempo: 15,
    rodada: sala.rodadaAtual + 1,
    total: sala.totalRodadas
  });
  
  sala.timeoutRodada = setTimeout(() => {
    if (!sala) return;
    sala.jogadores.forEach((j) => {
      if (!j.respondeu) {
        j.respondeu = true;
        j.resposta = 'TIMEOUT';
        j.tempoResposta = 15000;
        j.tempoRestante = 0;
      }
    });
    processarRodada(sala.id);
  }, 15000);
}

function criarSalaBatalha(jogador1, jogador2) {
  const questoes = stmtGetQuestoesAleatorias.all(5).map(normalizarQuestao);
  
  if (!questoes.length) {
    const s1 = getSocketById(jogador1.socketId);
    const s2 = getSocketById(jogador2.socketId);
    if (s1) s1.emit('erro_batalha', { mensagem: 'Não há questões cadastradas.' });
    if (s2) s2.emit('erro_batalha', { mensagem: 'Não há questões cadastradas.' });
    return;
  }
  
  const salaId = gerarSalaId();
  
  const sala = {
    id: salaId,
    jogadores: [
      {
        id: jogador1.id,
        nome: jogador1.nome,
        avatar: jogador1.avatar,
        socketId: jogador1.socketId,
        hp: 100,
        acertos: 0,
        respondeu: false,
        resposta: null,
        tempoResposta: null,
        tempoRestante: null
      },
      {
        id: jogador2.id,
        nome: jogador2.nome,
        avatar: jogador2.avatar,
        socketId: jogador2.socketId,
        hp: 100,
        acertos: 0,
        respondeu: false,
        resposta: null,
        tempoResposta: null,
        tempoRestante: null
      }
    ],
    perguntas: questoes,
    rodadaAtual: 0,
    totalRodadas: questoes.length,
    inicioRodada: null,
    primeiroRespondedor: null,
    rodadaProcessada: false,
    timeoutRodada: null,
    vencedor: null
  };
  
  salasBatalha.set(salaId, sala);
  
  const jogador1Socket = getSocketById(jogador1.socketId);
  const jogador2Socket = getSocketById(jogador2.socketId);
  
  const batalhaBase = {
    sala_id: salaId,
    total_rodadas: sala.totalRodadas,
    seu_hp: 100,
    hp_oponente: 100
  };
  
  if (jogador1Socket) {
    jogador1Socket.emit('batalha_iniciada', {
      ...batalhaBase,
      oponente: {
        id: jogador2.id,
        nome: jogador2.nome,
        avatar: jogador2.avatar
      }
    });
  }
  
  if (jogador2Socket) {
    jogador2Socket.emit('batalha_iniciada', {
      ...batalhaBase,
      oponente: {
        id: jogador1.id,
        nome: jogador1.nome,
        avatar: jogador1.avatar
      }
    });
  }
  
  setTimeout(() => iniciarRodada(salaId), 3000);
}

// =========================
// SOCKET EVENTS
// =========================
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('registrar_usuario_online', (data = {}) => {
    try {
      const usuarioId = Number(data.usuario_id);
      if (!usuarioId) {
        console.log('⚠️ registrar_usuario_online: usuario_id inválido');
        return;
      }
      
      const usuario = stmtGetUsuarioById.get(usuarioId);
      if (!usuario) {
        console.log(`⚠️ Usuário ${usuarioId} não encontrado no banco`);
        socket.emit('erro_usuario', { mensagem: 'Usuário não encontrado.' });
        return;
      }
      
      usuario.socketId = socket.id;
      usuariosOnline.set(usuario.id, usuario);
      
      console.log(`✅ ${usuario.nome} (ID: ${usuario.id}) está online. Total: ${usuariosOnline.size}`);
      
      socket.emit('usuario_online_registrado', {
        success: true,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          avatar: usuario.avatar,
          level: usuario.level,
          xp: usuario.xp,
          setor: usuario.setor
        }
      });
      
      // Broadcast da lista atualizada
      broadcastListaOnline();
      
      // Envia a lista atual para o usuário que acabou de conectar
      const onlinePlayers = Array.from(usuariosOnline.values()).map(u => ({
        id: u.id,
        nome: u.nome,
        avatar: u.avatar,
        level: u.level,
        xp: u.xp,
        setor: u.setor
      }));
      socket.emit('lista_online', onlinePlayers);
      
    } catch (error) {
      console.error('Erro registrar_usuario_online:', error);
    }
  });
  
  socket.on('entrar_fila', (data = {}) => {
    try {
      const usuarioId = Number(data.usuario_id);
      if (!usuarioId) return;
      
      const usuario = stmtGetUsuarioById.get(usuarioId);
      if (!usuario) {
        socket.emit('erro_fila', { mensagem: 'Usuário não encontrado.' });
        return;
      }
      
      usuario.socketId = socket.id;
      usuariosOnline.set(usuario.id, usuario);
      
      if (jaEstaEmBatalha(usuario.id)) {
        socket.emit('fila_status', { mensagem: 'Você já está em uma batalha.' });
        return;
      }
      
      entrarNaFilaSemDuplicar(usuario);
      
      socket.emit('fila_status', {
        mensagem: 'Você entrou na fila de batalha.',
        total_na_fila: filaBatalha.length
      });
      
      console.log(`⚔️ ${usuario.nome} entrou na fila. Total: ${filaBatalha.length}`);
      
      if (filaBatalha.length >= 2) {
        const jogador1 = filaBatalha.shift();
        const jogador2 = filaBatalha.shift();
        
        if (jogador1 && jogador2 && jogador1.id !== jogador2.id) {
          criarSalaBatalha(jogador1, jogador2);
        }
      }
    } catch (error) {
      console.error('Erro entrar_fila:', error);
      socket.emit('erro_fila', { mensagem: 'Erro ao entrar na fila.' });
    }
  });
  
  socket.on('sair_fila', (data = {}) => {
    try {
      const usuarioId = Number(data.usuario_id);
      if (!usuarioId) return;
      
      removerDaFila(usuarioId);
      socket.emit('fila_status', {
        mensagem: 'Você saiu da fila de batalha.',
        total_na_fila: filaBatalha.length
      });
    } catch (error) {
      console.error('Erro sair_fila:', error);
    }
  });
  
  socket.on('buscar_oponente', (data = {}) => {
    try {
      const usuarioId = Number(data.usuario_id);
      if (!usuarioId) return;
      
      const usuario = stmtGetUsuarioById.get(usuarioId);
      if (!usuario) return;
      
      usuario.socketId = socket.id;
      usuariosOnline.set(usuario.id, usuario);
      
      // Broadcast da lista atualizada
      broadcastListaOnline();
      
      entrarNaFilaSemDuplicar(usuario);
      
      socket.emit('fila_status', {
        mensagem: 'Buscando oponente...',
        total_na_fila: filaBatalha.length
      });
      
      if (filaBatalha.length >= 2) {
        const jogador1 = filaBatalha.shift();
        const jogador2 = filaBatalha.shift();
        
        if (jogador1 && jogador2 && jogador1.id !== jogador2.id) {
          criarSalaBatalha(jogador1, jogador2);
        }
      }
    } catch (error) {
      console.error('Erro buscar_oponente:', error);
    }
  });
  
  socket.on('get_online_players', () => {
    try {
      const onlinePlayers = Array.from(usuariosOnline.values()).map(u => ({
        id: u.id,
        nome: u.nome,
        avatar: u.avatar,
        level: u.level,
        xp: u.xp,
        setor: u.setor,
        vitorias_pvp: u.vitorias_pvp || 0,
        derrotas_pvp: u.derrotas_pvp || 0
      }));
      socket.emit('lista_online', onlinePlayers);
    } catch (error) {
      console.error('Erro get_online_players:', error);
    }
  });
  
  socket.on('enviar_desafio', (data = {}) => {
    try {
      const desafianteId = Number(data.desafiante_id);
      const desafiadoId = Number(data.desafiado_id);
      
      if (!desafianteId || !desafiadoId || desafianteId === desafiadoId) {
        socket.emit('desafio_erro', { mensagem: 'Desafio inválido.' });
        return;
      }
      
      const desafiante = usuariosOnline.get(desafianteId);
      const desafiado = usuariosOnline.get(desafiadoId);
      
      if (!desafiante || !desafiado) {
        socket.emit('desafio_erro', { mensagem: 'Usuário offline.' });
        return;
      }
      
      if (jaEstaEmBatalha(desafianteId) || jaEstaEmBatalha(desafiadoId)) {
        socket.emit('desafio_erro', { mensagem: 'Um dos jogadores já está em batalha.' });
        return;
      }
      
      const desafioId = gerarDesafioId();
      desafiosPendentes.set(desafioId, {
        desafianteId,
        desafiadoId,
        createdAt: now()
      });
      
      const desafiadoSocket = getSocketByUsuarioId(desafiadoId);
      
      if (desafiadoSocket) {
        desafiadoSocket.emit('receber_desafio', {
          desafio_id: desafioId,
          desafiante_nome: desafiante.nome,
          desafiante_avatar: desafiante.avatar,
          desafiante_id: desafiante.id
        });
      }
      
      socket.emit('desafio_enviado', {
        desafio_id: desafioId,
        desafiado_nome: desafiado.nome
      });
    } catch (error) {
      console.error('Erro enviar_desafio:', error);
      socket.emit('desafio_erro', { mensagem: 'Erro ao enviar desafio.' });
    }
  });
  
  socket.on('aceitar_desafio', (data = {}) => {
    try {
      const desafioId = String(data.desafio_id || '');
      const desafiadoId = Number(data.desafiado_id);
      
      const desafio = desafiosPendentes.get(desafioId);
      if (!desafio) {
        socket.emit('desafio_erro', { mensagem: 'Desafio não encontrado ou expirado.' });
        return;
      }
      
      if (desafio.desafiadoId !== desafiadoId) {
        socket.emit('desafio_erro', { mensagem: 'Este desafio não pertence a você.' });
        return;
      }
      
      const desafiante = usuariosOnline.get(desafio.desafianteId);
      const desafiado = usuariosOnline.get(desafio.desafiadoId);
      
      desafiosPendentes.delete(desafioId);
      
      if (!desafiante || !desafiado) {
        socket.emit('desafio_erro', { mensagem: 'Jogador offline.' });
        return;
      }
      
      removerDaFila(desafiante.id);
      removerDaFila(desafiado.id);
      
      if (jaEstaEmBatalha(desafiante.id) || jaEstaEmBatalha(desafiado.id)) {
        socket.emit('desafio_erro', { mensagem: 'Um dos jogadores já entrou em batalha.' });
        return;
      }
      
      const desafianteSocket = getSocketByUsuarioId(desafiante.id);
      if (desafianteSocket) {
        desafianteSocket.emit('desafio_aceito', {
          desafiado_nome: desafiado.nome
        });
      }
      
      socket.emit('desafio_aceito', {
        desafiante_nome: desafiante.nome
      });
      
      criarSalaBatalha(desafiante, desafiado);
    } catch (error) {
      console.error('Erro aceitar_desafio:', error);
      socket.emit('desafio_erro', { mensagem: 'Erro ao aceitar desafio.' });
    }
  });
  
  socket.on('recusar_desafio', (data = {}) => {
    try {
      const desafioId = String(data.desafio_id || '');
      const desafio = desafiosPendentes.get(desafioId);
      if (!desafio) {
        socket.emit('desafio_recusado', { mensagem: 'Desafio já expirado.' });
        return;
      }
      
      desafiosPendentes.delete(desafioId);
      
      const desafianteSocket = getSocketByUsuarioId(desafio.desafianteId);
      if (desafianteSocket) {
        desafianteSocket.emit('desafio_recusado', { mensagem: 'Desafio recusado.' });
      }
      
      socket.emit('desafio_recusado', { mensagem: 'Desafio recusado.' });
    } catch (error) {
      console.error('Erro recusar_desafio:', error);
    }
  });
  
  socket.on('responder_pergunta', (data = {}) => {
    try {
      const salaId = String(data.sala_id || '');
      const usuarioId = Number(data.usuario_id);
      const resposta = data.resposta;
      const tempoResposta = Number(data.tempo_resposta ?? 15000);
      const tempoRestante = Number(data.tempo_restante ?? 0);
      
      const sala = salasBatalha.get(salaId);
      if (!sala) {
        socket.emit('erro_batalha', { mensagem: 'Sala não encontrada.' });
        return;
      }
      
      const jogador = sala.jogadores.find(j => j.id === usuarioId);
      if (!jogador) {
        socket.emit('erro_batalha', { mensagem: 'Jogador não pertence à sala.' });
        return;
      }
      
      if (jogador.respondeu) {
        return;
      }
      
      jogador.respondeu = true;
      jogador.resposta = resposta;
      jogador.tempoResposta = tempoResposta;
      jogador.tempoRestante = tempoRestante;
      
      if (!sala.primeiroRespondedor) {
        sala.primeiroRespondedor = jogador.id;
      }
      
      socket.emit('resposta_recebida', {
        sala_id: sala.id,
        usuario_id: jogador.id
      });
      
      if (sala.jogadores.every(j => j.respondeu)) {
        processarRodada(sala.id);
      }
    } catch (error) {
      console.error('Erro responder_pergunta:', error);
      socket.emit('erro_batalha', { mensagem: 'Erro ao responder pergunta.' });
    }
  });
  
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
    
    let usuarioDesconectado = null;
    
    for (const [id, usuario] of usuariosOnline.entries()) {
      if (usuario.socketId === socket.id) {
        usuarioDesconectado = usuario;
        usuariosOnline.delete(id);
        removerDaFila(id);
        break;
      }
    }
    
    if (usuarioDesconectado) {
      console.log(`👋 ${usuarioDesconectado.nome} saiu. Total online: ${usuariosOnline.size}`);
      
      for (const [salaId, sala] of salasBatalha.entries()) {
        const estaNaSala = sala.jogadores.find(j => j.id === usuarioDesconectado.id);
        if (estaNaSala) {
          const oponente = sala.jogadores.find(j => j.id !== usuarioDesconectado.id);
          if (oponente) {
            sala.vencedor = oponente;
          }
          finalizarSala(salaId, 'desconexao');
          break;
        }
      }
      
      // Broadcast da lista atualizada
      broadcastListaOnline();
    }
  });
});
// ROTA DA ROLETA DIÁRIA
app.post('/api/roleta/girar', (req, res) => {
  try {
    const { usuario_id } = req.body;
    
    if (!usuario_id) {
      return res.status(400).json({ erro: 'usuario_id é obrigatório' });
    }
    
    const usuario = stmtGetUsuarioById.get(usuario_id);
    if (!usuario) {
      return res.status(404).json({ erro: 'Guardião não encontrado' });
    }
    
    const hoje = new Date().toISOString().slice(0, 10);
    const ultimoGiro = db.prepare('SELECT ultimo_giro FROM usuarios WHERE id = ?').get(usuario_id);
    
    if (ultimoGiro && ultimoGiro.ultimo_giro === hoje) {
      return res.status(400).json({ erro: 'Você já girou hoje! Volte amanhã.' });
    }
    
    const premios = [
      { index: 0, valor: 10 },
      { index: 1, valor: 50 },
      { index: 2, valor: 20 },
      { index: 3, valor: 100 },
      { index: 4, valor: 30 },
      { index: 5, valor: 200 }
    ];
    
    const ganhou = premios[Math.floor(Math.random() * premios.length)];
    
    // Atualiza XP e última data de giro
    const updateStmt = db.prepare(`
      UPDATE usuarios 
      SET xp = COALESCE(xp, 0) + ?, 
          ultimo_giro = ?
      WHERE id = ?
    `);
    updateStmt.run(ganhou.valor, hoje, usuario_id);
    
    // Atualiza level baseado no XP
    stmtLevelUpByXp.run(usuario_id);
    
    res.json({
      index_ganhador: ganhou.index,
      valor: ganhou.valor,
      mensagem: `🛡️ Sorte de Guardião! +${ganhou.valor} XP!`
    });
  } catch (error) {
    console.error('Erro na roleta:', error);
    res.status(500).json({ erro: 'Erro ao processar giro' });
  }
});
// =========================
// START
// =========================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Socket.IO disponível em ws://localhost:${PORT}`);
  console.log(`🌐 CORS permitido para: ${CORS_ORIGINS.join(', ')}`);
});