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
// SOCKET.IO
// =========================
const io = socketIo(server, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// =========================
// SQLITE
// =========================
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`✅ SQLite conectado em ${DB_FILE}`);

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
      setor TEXT
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
// PREPARED STATEMENTS (ATUALIZADOS)
// =========================

const stmtGetUsuarioById = db.prepare(`
  SELECT id, nome, matricula, avatar, level, xp, setor
  FROM usuarios
  WHERE id = ?
`);

const stmtGetUsuarioByMatricula = db.prepare(`
  SELECT id, nome, matricula, avatar, level, xp, setor
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
    COALESCE((SELECT COUNT(*) FROM batalhas WHERE usuario_id = u.id AND venceu = 1), 0) AS vitorias,
    COALESCE((SELECT COUNT(*) FROM batalhas WHERE usuario_id = u.id AND venceu = 0), 0) AS derrotas
  FROM usuarios u
  ORDER BY u.xp DESC, vitorias DESC, u.nome ASC
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

// ========== AUTENTICAÇÃO ==========

// Rota de cadastro (com matrícula e setor)
app.post('/api/cadastro', (req, res) => {
  try {
    const { matricula, setor, avatar } = req.body;
    
    if (!matricula || !String(matricula).trim()) {
      return res.status(400).json({ error: 'Matrícula é obrigatória' });
    }
    
    if (!setor || !String(setor).trim()) {
      return res.status(400).json({ error: 'Setor é obrigatório' });
    }
    
    // Verificar se matrícula já existe
    const checkUser = db.prepare('SELECT id, matricula, setor FROM usuarios WHERE matricula = ?');
    const existingUser = checkUser.get(String(matricula).trim());
    
    if (existingUser) {
      return res.status(400).json({ error: 'Matrícula já cadastrada' });
    }
    
    const nome = data.nome && data.nome.trim() ? data.nome.trim() : `Guardião ${matricula}`;
    
    const insert = db.prepare(`
      INSERT INTO usuarios (nome, matricula, avatar, level, xp, setor)
      VALUES (?, ?, ?, 1, 0, ?)
    `);
    
    const result = insert.run(
      nome,
      String(matricula).trim(), 
      avatar || '🛡️', 
      String(setor).trim()
    );
    
    const usuario = db.prepare(`
      SELECT id, nome, matricula, avatar, level, xp, setor
      FROM usuarios WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.json({
      id: usuario.id,
      nome: usuario.nome,
      matricula: usuario.matricula,
      avatar: usuario.avatar,
      level: usuario.level,
      xp: usuario.xp,
      setor: usuario.setor,
      metas_concluidas: []
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// Rota de login (com matrícula e setor)
app.post('/api/login', (req, res) => {
  try {
    const { matricula, setor } = req.body;
    
    if (!matricula || !String(matricula).trim()) {
      return res.status(400).json({ error: 'Matrícula é obrigatória' });
    }
    
    if (!setor || !String(setor).trim()) {
      return res.status(400).json({ error: 'Setor é obrigatório' });
    }
    
    // Buscar usuário por matrícula e setor
    const stmtGetUsuarioByMatricula = db.prepare(`
      SELECT id, nome, matricula, avatar, level, xp, setor
      FROM usuarios
      WHERE matricula = ? AND setor = ?
    `);
    
    let usuario = stmtGetUsuarioByMatricula.get(String(matricula).trim(), String(setor).trim());
    
    if (!usuario) {
      // Matrícula ou setor incorreto
      return res.status(401).json({ error: 'Matrícula ou setor incorretos' });
    }
    
    // Buscar metas concluídas
    const metasConcluidasStmt = db.prepare(`
      SELECT meta_id FROM metas_concluidas WHERE usuario_id = ?
    `);
    const metasConcluidas = metasConcluidasStmt.all(usuario.id).map(row => row.meta_id);
    
    res.json({
      id: usuario.id,
      nome: usuario.nome,
      matricula: usuario.matricula,
      avatar: usuario.avatar,
      level: usuario.level,
      xp: usuario.xp,
      setor: usuario.setor,
      metas_concluidas: metasConcluidas
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Rota para verificar se matrícula existe (usado no cadastro)
app.post('/api/verificar-matricula', (req, res) => {
  try {
    const { matricula } = req.body;
    
    if (!matricula || !String(matricula).trim()) {
      return res.status(400).json({ error: 'Matrícula é obrigatória' });
    }
    
    const checkUser = db.prepare('SELECT id, setor FROM usuarios WHERE matricula = ?');
    const usuario = checkUser.get(String(matricula).trim());
    
    if (usuario) {
      res.json({ existe: true, setor: usuario.setor });
    } else {
      res.json({ existe: false });
    }
  } catch (error) {
    console.error('Erro ao verificar matrícula:', error);
    res.status(500).json({ error: 'Erro ao verificar matrícula' });
  }
});

// ========== METAS ==========

app.get('/api/metas', (req, res) => {
  try {
    const dados = stmtGetMetas.all();
    res.json(dados);
  } catch (e) {
    console.error('Erro /api/metas:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== QUESTÕES ==========

app.get('/api/questoes/:metaId', (req, res) => {
  try {
    const metaId = Number(req.params.metaId);
    const dados = stmtGetQuestoesByMeta.all(metaId);
    
    // Normalizar questões para o frontend
    const questoesFormatadas = dados.map(questao => ({
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
    }));
    
    res.json(questoesFormatadas);
  } catch (e) {
    console.error('Erro /api/questoes/:metaId:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== RESPONDER QUESTÃO ==========

app.post('/api/responder', (req, res) => {
  try {
    const { questao_id, resposta, usuario_id, meta_id } = req.body;
    
    const questao = stmtGetQuestaoById.get(Number(questao_id));
    
    if (!questao) {
      return res.status(404).json({ error: 'Questão não encontrada' });
    }
    
    // Verificar se a resposta está correta
    const respostaNormalizada = String(resposta).trim().toUpperCase();
    const corretaLetra = String(questao.resposta_correta).trim().toUpperCase();
    const correta = respostaNormalizada === corretaLetra;
    
    res.json({
      correta,
      pontos_ganhos: correta ? 10 : 0,
      explicacao: questao.explicacao,
      resposta_correta: questao.resposta_correta
    });
  } catch (e) {
    console.error('Erro /api/responder:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== COMPLETAR META ==========

app.post('/api/completar-meta/:metaId', (req, res) => {
  try {
    const metaId = Number(req.params.metaId);
    // CORREÇÃO: Pega o usuario_id do body da requisição
    const usuario_id = req.body.usuario_id;
    
    console.log('📝 Completar meta - metaId:', metaId);
    console.log('📝 Completar meta - usuario_id:', usuario_id);
    console.log('📝 Body completo:', req.body);
    
    if (!metaId || isNaN(metaId)) {
      return res.status(400).json({ error: 'metaId é obrigatório e deve ser um número' });
    }
    
    if (!usuario_id) {
      return res.status(400).json({ error: 'usuario_id é obrigatório' });
    }
    
    // Verificar se o usuário existe
    const usuario = stmtGetUsuarioById.get(usuario_id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se já foi concluída
    const checkStmt = db.prepare(`
      SELECT * FROM metas_concluidas 
      WHERE usuario_id = ? AND meta_id = ?
    `);
    const jaConcluida = checkStmt.get(usuario_id, metaId);
    
    if (jaConcluida) {
      return res.json({
        success: true,
        ja_concluida: true,
        xp_ganho: 0,
        mensagem: 'Meta já concluída anteriormente',
        metas_concluidas: stmtGetMetasConcluidas.all(usuario_id).map(row => row.meta_id)
      });
    }
    
    // Registrar conclusão
    stmtInsertMetaConcluida.run(usuario_id, metaId);
    stmtAddXp.run(100, usuario_id);
    stmtLevelUpByXp.run(usuario_id);
    
    // Buscar metas concluídas atualizadas
    const metasConcluidas = stmtGetMetasConcluidas.all(usuario_id).map(row => row.meta_id);
    
    // Buscar usuário atualizado
    const usuarioAtualizado = stmtGetUsuarioById.get(usuario_id);
    
    console.log(`✅ Meta ${metaId} concluída para usuário ${usuario_id}`);
    
    res.json({
      success: true,
      ja_concluida: false,
      xp_ganho: 100,
      metas_concluidas: metasConcluidas,
      usuario: {
        id: usuarioAtualizado.id,
        nome: usuarioAtualizado.nome,
        matricula: usuarioAtualizado.matricula,
        avatar: usuarioAtualizado.avatar,
        level: usuarioAtualizado.level,
        xp: usuarioAtualizado.xp,
        setor: usuarioAtualizado.setor
      }
    });
  } catch (error) {
    console.error('Erro ao completar meta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== RANKING ==========

app.get('/api/ranking_completo', (req, res) => {
  try {
    const ranking = stmtGetRanking.all().map(r => ({
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

// ========== USUÁRIOS ==========

app.post('/api/usuarios', (req, res) => {
  try {
    const { nome, avatar = '🛡️', setor = 'Geral' } = req.body;
    
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    
    const insert = db.prepare(`
      INSERT INTO usuarios (nome, avatar, level, xp, setor)
      VALUES (?, ?, 1, 0, ?)
    `);
    
    const result = insert.run(String(nome).trim(), avatar, setor);
    const usuario = stmtGetUsuarioById.get(result.lastInsertRowid);
    
    res.status(201).json(usuario);
  } catch (e) {
    console.error('Erro /api/usuarios:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/usuarios/:id', (req, res) => {
  try {
    const usuario = stmtGetUsuarioById.get(Number(req.params.id));
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    
    const metasConcluidas = stmtGetMetasConcluidas.all(usuario.id).map(row => row.meta_id);
    
    res.json({
      ...usuario,
      metas_concluidas: metasConcluidas
    });
  } catch (e) {
    console.error('Erro /api/usuarios/:id:', e);
    res.status(500).json({ error: e.message });
  }
});

// ========== HEALTH CHECK ==========

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
      online: usuariosOnline ? usuariosOnline.size : 0,
      fila: filaBatalha ? filaBatalha.length : 0,
      batalhas_ativas: salasBatalha ? salasBatalha.size : 0
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
    opcoes_array: [
      { letra: 'A', texto: questao.opcao_a },
      { letra: 'B', texto: questao.opcao_b },
      { letra: 'C', texto: questao.opcao_c },
      { letra: 'D', texto: questao.opcao_d }
    ],
    resposta_correta: questao.resposta_correta,
    resposta_correta_texto: letraParaTexto(questao, questao.resposta_correta),
    explicacao: questao.explicacao,
    dificuldade: questao.dificuldade
  };
}

function questaoPublica(questao) {
  const q = normalizarQuestao(questao);
  return {
    id: q.id,
    meta_id: q.meta_id,
    pergunta: q.pergunta,
    opcao_a: q.opcao_a,
    opcao_b: q.opcao_b,
    opcao_c: q.opcao_c,
    opcao_d: q.opcao_d,
    opcoes: q.opcoes,
    opcoes_array: q.opcoes_array,
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
  const xpVitoria = 30;
  const xpDerrota = 10;
  
  const transacao = db.transaction(() => {
    sala.jogadores.forEach((jogador) => {
      const venceu = sala.vencedor && sala.vencedor.id === jogador.id ? 1 : 0;
      stmtInsertBatalha.run(jogador.id, venceu);
      stmtAddXp.run(venceu ? xpVitoria : xpDerrota, jogador.id);
      stmtLevelUpByXp.run(jogador.id);
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
  
  sala.vencedor = vencedor;
  
  salvarResultadoBatalha(sala);
  
  const rankingAtualizado = stmtGetRanking.all().map(r => ({
    ...r,
    kd: r.derrotas > 0 ? Number(r.vitorias / r.derrotas).toFixed(2) : String(r.vitorias)
  }));
  
  broadcastSala(sala, 'batalha_finalizada', {
    sala_id: sala.id,
    motivo,
    vencedor: vencedor ? {
      id: vencedor.id,
      nome: vencedor.nome,
      avatar: vencedor.avatar
    } : null,
    empate: !vencedor,
    jogadores: sala.jogadores.map(j => ({
      id: j.id,
      nome: j.nome,
      avatar: j.avatar,
      hp: j.hp,
      acertos: j.acertos
    })),
    ranking: rankingAtualizado
  });
  
  salasBatalha.delete(salaId);
}

function prepararRodada(sala) {
  sala.jogadores.forEach(j => {
    j.respondeu = false;
    j.resposta = null;
    j.tempoResposta = null;
    j.tempoRestante = null;
  });
  sala.primeiroRespondedor = null;
  sala.primeiroAcertou = false;
  sala.rodadaProcessada = false;
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
  
  let resumo = {
    questao_id: questao.id,
    resposta_correta: questao.resposta_correta,
    resposta_correta_texto: letraParaTexto(questao, questao.resposta_correta),
    explicacao: questao.explicacao,
    jogadores: []
  };
  
  if (j1Correta && !j2Correta) {
    const dano = calcularDano(j1.tempoRestante, 1);
    j2.hp = Math.max(0, j2.hp - dano);
    resumo.jogadores.push({ id: j1.id, acertou: true, dano_causado: dano, hp_atual: j1.hp });
    resumo.jogadores.push({ id: j2.id, acertou: false, dano_causado: 0, hp_atual: j2.hp });
  } else if (!j1Correta && j2Correta) {
    const dano = calcularDano(j2.tempoRestante, 1);
    j1.hp = Math.max(0, j1.hp - dano);
    resumo.jogadores.push({ id: j1.id, acertou: false, dano_causado: 0, hp_atual: j1.hp });
    resumo.jogadores.push({ id: j2.id, acertou: true, dano_causado: dano, hp_atual: j2.hp });
  } else if (j1Correta && j2Correta) {
    const j1Tempo = Number(j1.tempoResposta ?? Number.MAX_SAFE_INTEGER);
    const j2Tempo = Number(j2.tempoResposta ?? Number.MAX_SAFE_INTEGER);
    
    if (j1Tempo < j2Tempo) {
      const dano = calcularDano(j1.tempoRestante, 0.8);
      j2.hp = Math.max(0, j2.hp - dano);
      resumo.jogadores.push({ id: j1.id, acertou: true, dano_causado: dano, hp_atual: j1.hp, bonus_velocidade: true });
      resumo.jogadores.push({ id: j2.id, acertou: true, dano_causado: 0, hp_atual: j2.hp });
    } else if (j2Tempo < j1Tempo) {
      const dano = calcularDano(j2.tempoRestante, 0.8);
      j1.hp = Math.max(0, j1.hp - dano);
      resumo.jogadores.push({ id: j1.id, acertou: true, dano_causado: 0, hp_atual: j1.hp });
      resumo.jogadores.push({ id: j2.id, acertou: true, dano_causado: dano, hp_atual: j2.hp, bonus_velocidade: true });
    } else {
      resumo.jogadores.push({ id: j1.id, acertou: true, dano_causado: 0, hp_atual: j1.hp, empate_velocidade: true });
      resumo.jogadores.push({ id: j2.id, acertou: true, dano_causado: 0, hp_atual: j2.hp, empate_velocidade: true });
    }
  } else {
    resumo.jogadores.push({ id: j1.id, acertou: false, dano_causado: 0, hp_atual: j1.hp });
    resumo.jogadores.push({ id: j2.id, acertou: false, dano_causado: 0, hp_atual: j2.hp });
  }
  
  broadcastSala(sala, 'resultado_rodada', {
    sala_id: sala.id,
    rodada: sala.rodadaAtual + 1,
    total_rodadas: sala.totalRodadas,
    ...resumo
  });
  
  if (j1.hp <= 0 || j2.hp <= 0) {
    finalizarSala(sala.id, 'hp_zero');
    return;
  }
  
  sala.rodadaAtual += 1;
  
  if (sala.rodadaAtual >= sala.totalRodadas) {
    finalizarSala(sala.id, 'rodadas_finais');
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
  
  prepararRodada(sala);
  sala.inicioRodada = now();
  
  broadcastSala(sala, 'rodada_iniciada', {
    sala_id: sala.id,
    rodada: sala.rodadaAtual + 1,
    total_rodadas: sala.totalRodadas,
    tempo_limite: 15,
    questao: questaoPublica(questao),
    jogadores: sala.jogadores.map(j => ({
      id: j.id,
      nome: j.nome,
      avatar: j.avatar,
      hp: j.hp,
      acertos: j.acertos
    }))
  });
  
  sala.timeoutRodada = setTimeout(() => {
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
    primeiroAcertou: false,
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
  
  setTimeout(() => iniciarRodada(salaId), 2000);
}

// =========================
// SOCKET EVENTS
// =========================
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('registrar_usuario_online', (data = {}) => {
    try {
      const usuarioId = Number(data.usuario_id);
      if (!usuarioId) return;
      
      const usuario = stmtGetUsuarioById.get(usuarioId);
      if (!usuario) {
        socket.emit('erro_usuario', { mensagem: 'Usuário não encontrado.' });
        return;
      }
      
      usuario.socketId = socket.id;
      usuariosOnline.set(usuario.id, usuario);
      
      socket.emit('usuario_online_registrado', {
        success: true,
        usuario: usuario
      });
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
        setor: u.setor
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
    }
  });
});

// =========================
// START
// =========================
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Socket.IO disponível em ws://localhost:${PORT}`);
});