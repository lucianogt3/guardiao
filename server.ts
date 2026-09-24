import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('guardiao_v2.db');

// Initialize Database
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cargos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS hospitais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS temas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      icone TEXT,
      capa TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      avatar TEXT NOT NULL,
      banner TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      moedas INTEGER DEFAULT 0,
      vitorias INTEGER DEFAULT 0,
      derrotas INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tema_id INTEGER,
      titulo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      lore_rpg TEXT NOT NULL,
      icone TEXT NOT NULL,
      ordem INTEGER NOT NULL,
      cor TEXT NOT NULL,
      FOREIGN KEY (tema_id) REFERENCES temas(id)
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
      explicacao TEXT NOT NULL,
      dificuldade INTEGER DEFAULT 1,
      FOREIGN KEY (meta_id) REFERENCES metas(id)
    );

    CREATE TABLE IF NOT EXISTS metas_concluidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      meta_id INTEGER NOT NULL,
      data_conclusao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (meta_id) REFERENCES metas(id)
    );

    CREATE TABLE IF NOT EXISTS roleta_giros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      data_giro DATE NOT NULL,
      giros_realizados INTEGER DEFAULT 0,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS loja_avatares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      url TEXT NOT NULL,
      preco_moedas INTEGER NOT NULL,
      raridade TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuario_avatares (
      usuario_id INTEGER NOT NULL,
      avatar_id INTEGER NOT NULL,
      PRIMARY KEY (usuario_id, avatar_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (avatar_id) REFERENCES loja_avatares(id)
    );

    CREATE TABLE IF NOT EXISTS metas_diarias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      data DATE NOT NULL,
      concluida INTEGER DEFAULT 0,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS salas_batalha (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      ativa INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sala_batalha_questoes (
      sala_id INTEGER NOT NULL,
      questao_id INTEGER NOT NULL,
      PRIMARY KEY (sala_id, questao_id),
      FOREIGN KEY (sala_id) REFERENCES salas_batalha(id),
      FOREIGN KEY (questao_id) REFERENCES questoes(id)
    );
  `);

  // Migrations: Ensure columns exist and handle schema changes
  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN cargo_id INTEGER REFERENCES cargos(id)");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN hospital_id INTEGER REFERENCES hospitais(id)");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE temas ADD COLUMN capa TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN banner TEXT");
  } catch (e) {}
  
  // If matricula still exists and is NOT NULL, we might have issues. 
  // But we'll try to proceed and only log errors.
} catch (error) {
  console.error("Erro ao inicializar banco de dados:", error);
}

// Seed Initial Data
const seedData = () => {
  try {
    const cargosCount = db.prepare('SELECT COUNT(*) as count FROM cargos').get() as { count: number };
    if (cargosCount.count === 0) {
      const insertCargo = db.prepare('INSERT INTO cargos (nome) VALUES (?)');
      ['Enfermeiro(a)', 'Técnico(a) de Enfermagem', 'Auxiliar de Enfermagem', 'Estagiário(a)', 'Gestor(a)', 'Outros'].forEach(c => insertCargo.run(c));

      const insertHospital = db.prepare('INSERT INTO hospitais (nome) VALUES (?)');
      ['Unidade Central', 'Unidade Norte', 'Unidade Sul', 'Unidade Leste', 'Unidade Oeste'].forEach(h => insertHospital.run(h));

      const insertTema = db.prepare('INSERT INTO temas (nome, descricao, icone, capa) VALUES (?, ?, ?, ?)');
      insertTema.run('Segurança do Paciente', 'Metas internacionais de segurança do paciente.', 'ShieldCheck', 'https://picsum.photos/seed/safety/800/600');
      
      const resEmergencia = insertTema.run('Emergência', 'Protocolos de atendimento urgente', '🚑', 'https://picsum.photos/seed/emergency/800/600');
      const resUTI = insertTema.run('UTI', 'Cuidados intensivos', '🫀', 'https://picsum.photos/seed/icu/800/600');
      
      const temaId = 1; // Segurança do Paciente

      const insertMeta = db.prepare('INSERT INTO metas (tema_id, titulo, descricao, lore_rpg, icone, ordem, cor) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const insertQuestao = db.prepare('INSERT INTO questoes (meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

      const metasData = [
        {
          titulo: 'Identificação Correta do Paciente',
          descricao: 'Garantir que o paciente certo receba o cuidado certo.',
          lore: 'O primeiro passo de um Guardião é saber quem ele protege. Sem identidade, o caos reina.',
          icone: 'UserCheck',
          ordem: 1,
          cor: 'emerald',
          questoes: [
            {
              q: 'Quais são os dois identificadores padrão no HCOR?',
              a: 'Nome completo e Data de Nascimento',
              b: 'Número do quarto e Nome',
              c: 'Diagnóstico e Nome da Mãe',
              d: 'Matrícula e CPF',
              r: 'a',
              e: 'Sempre use pelo menos dois identificadores para confirmar a identidade do paciente.'
            }
          ]
        }
      ];

      metasData.forEach(m => {
        const result = insertMeta.run(temaId, m.titulo, m.descricao, m.lore, m.icone, m.ordem, m.cor);
        const metaId = result.lastInsertRowid;
        m.questoes.forEach(q => {
          insertQuestao.run(metaId, q.q, q.a, q.b, q.c, q.d, q.r, q.e);
        });
      });

      // Seed Shop Avatares
      const insertAvatar = db.prepare('INSERT INTO loja_avatares (nome, url, preco_moedas, raridade) VALUES (?, ?, ?, ?)');
      insertAvatar.run('Cavaleiro de Ouro', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=facc15', 500, 'raro');
      insertAvatar.run('Mago Supremo', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mago&backgroundColor=7c3aed', 1200, 'epico');
      insertAvatar.run('Dragão Guardião', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dragon&backgroundColor=dc2626', 3000, 'lendario');

      // Create Admin User
      db.prepare('INSERT OR IGNORE INTO usuarios (nome, email, senha, avatar, is_admin) VALUES (?, ?, ?, ?, ?)').run(
        'Mestre dos Jogos', 'admin@guardiões.com', 'admin123', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mestre', 1
      );
      
      db.prepare('INSERT OR IGNORE INTO usuarios (nome, email, senha, avatar, is_admin) VALUES (?, ?, ?, ?, ?)').run(
        'Administrador', 'admin@hcor.com.br', 'admin123', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 1
      );
    }
  } catch (error) {
    console.error("Erro ao semear dados:", error);
  }

  // Ensure Mestre dos Jogos always exists
  try {
    db.prepare('INSERT OR IGNORE INTO usuarios (nome, email, senha, avatar, is_admin) VALUES (?, ?, ?, ?, ?)').run(
      'Mestre dos Jogos', 'admin@guardiões.com', 'admin123', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mestre', 1
    );
  } catch (e) {}
};

seedData();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());

  // Auth Routes
  app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    try {
      const user = db.prepare(`
        SELECT u.*, c.nome as cargo_nome, h.nome as hospital_nome 
        FROM usuarios u 
        LEFT JOIN cargos c ON u.cargo_id = c.id 
        LEFT JOIN hospitais h ON u.hospital_id = h.id 
        WHERE LOWER(u.email) = LOWER(?) AND u.senha = ?
      `).get(email, senha) as any;
      
      if (user) {
        if (user.ativo === 0) {
          return res.status(403).json({ error: 'Sua conta está bloqueada. Entre em contato com o administrador.' });
        }
        delete user.senha;
        res.json(user);
      } else {
        res.status(401).json({ error: 'E-mail ou senha incorretos' });
      }
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });

  app.post('/api/cadastro', (req, res) => {
    const { nome, email, senha, avatar, cargo_id, hospital_id } = req.body;
    try {
      const result = db.prepare('INSERT INTO usuarios (nome, email, senha, avatar, cargo_id, hospital_id) VALUES (?, ?, ?, ?, ?, ?)').run(
        nome, email, senha, avatar, cargo_id, hospital_id
      );
      const user = db.prepare(`
        SELECT u.*, c.nome as cargo_nome, h.nome as hospital_nome 
        FROM usuarios u 
        LEFT JOIN cargos c ON u.cargo_id = c.id 
        LEFT JOIN hospitais h ON u.hospital_id = h.id 
        WHERE u.id = ?
      `).get(result.lastInsertRowid) as any;
      delete user.senha;
      res.json(user);
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      if (error.message.includes('UNIQUE')) {
        res.status(400).json({ error: 'E-mail já cadastrado' });
      } else {
        res.status(500).json({ error: 'Erro ao realizar cadastro' });
      }
    }
  });

  // Master Data Routes
  app.get('/api/cargos', (req, res) => {
    res.json(db.prepare('SELECT * FROM cargos').all());
  });

  app.get('/api/hospitais', (req, res) => {
    res.json(db.prepare('SELECT * FROM hospitais').all());
  });

  // Themes & Metas
  app.get('/api/temas', (req, res) => {
    res.json(db.prepare('SELECT * FROM temas').all());
  });

  app.get('/api/metas/:temaId', (req, res) => {
    res.json(db.prepare('SELECT * FROM metas WHERE tema_id = ? ORDER BY ordem').all(req.params.temaId));
  });

  app.get('/api/metas-concluidas/:userId', (req, res) => {
    const concluidas = db.prepare('SELECT meta_id FROM metas_concluidas WHERE usuario_id = ?').all(req.params.userId);
    res.json(concluidas.map((c: any) => c.meta_id));
  });

  app.get('/api/questoes/:metaId', (req, res) => {
    res.json(db.prepare('SELECT * FROM questoes WHERE meta_id = ?').all(req.params.metaId));
  });

  app.post('/api/completar-meta', (req, res) => {
    const { userId, metaId } = req.body;
    const exists = db.prepare('SELECT * FROM metas_concluidas WHERE usuario_id = ? AND meta_id = ?').get(userId, metaId);
    if (!exists) {
      db.prepare('INSERT INTO metas_concluidas (usuario_id, meta_id) VALUES (?, ?)').run(userId, metaId);
      db.prepare('UPDATE usuarios SET xp = xp + 100, moedas = moedas + 50, level = (xp + 100) / 500 + 1 WHERE id = ?').run(userId);
    }
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
    res.json({ success: true, user });
  });

  // Daily Goals
  app.get('/api/metas-diarias/:userId', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let meta = db.prepare('SELECT * FROM metas_diarias WHERE usuario_id = ? AND data = ?').get(req.params.userId, today) as any;
    if (!meta) {
      db.prepare('INSERT INTO metas_diarias (usuario_id, data, concluida) VALUES (?, ?, 0)').run(req.params.userId, today);
      meta = { concluida: 0 };
    }
    res.json(meta);
  });

  app.post('/api/metas-diarias/completar', (req, res) => {
    const { userId } = req.body;
    const today = new Date().toISOString().split('T')[0];
    db.prepare('UPDATE metas_diarias SET concluida = 1 WHERE usuario_id = ? AND data = ?').run(userId, today);
    db.prepare('UPDATE usuarios SET xp = xp + 50, moedas = moedas + 20 WHERE id = ?').run(userId);
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
    res.json({ success: true, user });
  });

  // Shop
  app.get('/api/loja/:userId', (req, res) => {
    const avatares = db.prepare('SELECT * FROM loja_avatares').all() as any[];
    const comprados = db.prepare('SELECT avatar_id FROM usuario_avatares WHERE usuario_id = ?').all(req.params.userId) as any[];
    const compradosIds = new Set(comprados.map(c => c.avatar_id));
    
    res.json(avatares.map(a => ({
      ...a,
      comprado: compradosIds.has(a.id)
    })));
  });

  app.post('/api/loja/comprar', (req, res) => {
    const { userId, avatarId } = req.body;
    const avatar = db.prepare('SELECT * FROM loja_avatares WHERE id = ?').get(avatarId) as any;
    const user = db.prepare('SELECT moedas FROM usuarios WHERE id = ?').get(userId) as any;

    if (user.moedas < avatar.preco_moedas) {
      return res.status(400).json({ error: 'Moedas insuficientes' });
    }

    try {
      db.prepare('INSERT INTO usuario_avatares (usuario_id, avatar_id) VALUES (?, ?)').run(userId, avatarId);
      db.prepare('UPDATE usuarios SET moedas = moedas - ? WHERE id = ?').run(avatar.preco_moedas, userId);
      const updatedUser = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
      res.json({ success: true, user: updatedUser });
    } catch (e) {
      res.status(400).json({ error: 'Avatar já adquirido' });
    }
  });

  // Admin Shop Routes
  app.get('/api/admin/loja', (req, res) => {
    res.json(db.prepare('SELECT * FROM loja_avatares').all());
  });

  app.post('/api/admin/loja', (req, res) => {
    const { nome, url, preco_moedas, raridade } = req.body;
    const result = db.prepare('INSERT INTO loja_avatares (nome, url, preco_moedas, raridade) VALUES (?, ?, ?, ?)').run(nome, url, preco_moedas, raridade);
    res.json({ id: result.lastInsertRowid });
  });

  // Admin Routes
  app.post('/api/admin/temas', (req, res) => {
    const { nome, descricao, icone, capa } = req.body;
    const result = db.prepare('INSERT INTO temas (nome, descricao, icone, capa) VALUES (?, ?, ?, ?)').run(nome, descricao, icone, capa);
    res.json({ id: result.lastInsertRowid });
  });

  app.post('/api/admin/metas', (req, res) => {
    const { tema_id, titulo, descricao, lore_rpg, icone, ordem, cor } = req.body;
    const result = db.prepare('INSERT INTO metas (tema_id, titulo, descricao, lore_rpg, icone, ordem, cor) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      tema_id, titulo, descricao, lore_rpg, icone, ordem, cor
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.post('/api/admin/questoes', (req, res) => {
    const { meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao } = req.body;
    const result = db.prepare('INSERT INTO questoes (meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao
    );
    res.json({ id: result.lastInsertRowid });
  });

  app.delete('/api/admin/temas/:id', (req, res) => {
    const metasCount = db.prepare('SELECT COUNT(*) as count FROM metas WHERE tema_id = ?').get(req.params.id) as { count: number };
    if (metasCount.count > 0) {
      return res.status(400).json({ error: 'Não é possível excluir um tema que possui trilhas vinculadas.' });
    }
    db.prepare('DELETE FROM temas WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/metas/:id', (req, res) => {
    const questoesCount = db.prepare('SELECT COUNT(*) as count FROM questoes WHERE meta_id = ?').get(req.params.id) as { count: number };
    if (questoesCount.count > 0) {
      return res.status(400).json({ error: 'Não é possível excluir uma trilha que possui questões vinculadas.' });
    }
    db.prepare('DELETE FROM metas WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/questoes/:id', (req, res) => {
    db.prepare('DELETE FROM questoes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/ranking', (req, res) => {
    const ranking = db.prepare(`
      SELECT u.nome, u.avatar, u.level, u.xp, u.vitorias, u.derrotas, h.nome as hospital_nome 
      FROM usuarios u 
      LEFT JOIN hospitais h ON u.hospital_id = h.id 
      ORDER BY xp DESC LIMIT 20
    `).all();
    res.json(ranking);
  });

  // User Management (Admin Only)
  app.get('/api/admin/usuarios', (req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.nome, u.email, u.avatar, u.level, u.xp, u.moedas, u.is_admin, u.ativo,
             c.nome as cargo_nome, h.nome as hospital_nome
      FROM usuarios u
      LEFT JOIN cargos c ON u.cargo_id = c.id
      LEFT JOIN hospitais h ON u.hospital_id = h.id
      ORDER BY u.nome ASC
    `).all();
    res.json(users);
  });

  app.get('/api/admin/hospitais', (req, res) => {
    res.json(db.prepare('SELECT * FROM hospitais ORDER BY nome ASC').all());
  });

  app.post('/api/admin/hospitais', (req, res) => {
    const { nome } = req.body;
    try {
      const result = db.prepare('INSERT INTO hospitais (nome) VALUES (?)').run(nome);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: 'Unidade já existe' });
    }
  });

  app.delete('/api/admin/hospitais/:id', (req, res) => {
    db.prepare('DELETE FROM hospitais WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/admin/salas-batalha', (req, res) => {
    const salas = db.prepare('SELECT * FROM salas_batalha').all() as any[];
    const salasComQuestoes = salas.map(s => {
      const questoes = db.prepare('SELECT questao_id FROM sala_batalha_questoes WHERE sala_id = ?').all(s.id);
      return { ...s, questoes_ids: questoes.map((q: any) => q.questao_id) };
    });
    res.json(salasComQuestoes);
  });

  app.post('/api/admin/salas-batalha', (req, res) => {
    const { nome, descricao, questoes_ids } = req.body;
    const result = db.prepare('INSERT INTO salas_batalha (nome, descricao) VALUES (?, ?)').run(nome, descricao);
    const salaId = result.lastInsertRowid;
    
    if (questoes_ids && questoes_ids.length > 0) {
      const insertQuestao = db.prepare('INSERT INTO sala_batalha_questoes (sala_id, questao_id) VALUES (?, ?)');
      questoes_ids.forEach((qId: number) => insertQuestao.run(salaId, qId));
    }
    
    res.json({ id: salaId });
  });

  app.delete('/api/admin/salas-batalha/:id', (req, res) => {
    db.prepare('DELETE FROM sala_batalha_questoes WHERE sala_id = ?').run(req.params.id);
    db.prepare('DELETE FROM salas_batalha WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/admin/usuarios/toggle-status', (req, res) => {
    const { userId, ativo } = req.body;
    db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo, userId);
    res.json({ success: true });
  });

  app.post('/api/admin/usuarios/reset-password', (req, res) => {
    const { userId, novaSenha } = req.body;
    db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(novaSenha, userId);
    res.json({ success: true });
  });

  app.get('/api/perfil/:userId', (req, res) => {
    const user = db.prepare(`
      SELECT u.*, c.nome as cargo_nome, h.nome as hospital_nome 
      FROM usuarios u 
      LEFT JOIN cargos c ON u.cargo_id = c.id 
      LEFT JOIN hospitais h ON u.hospital_id = h.id 
      WHERE u.id = ?
    `).get(req.params.userId);
    const metas = db.prepare('SELECT m.* FROM metas m JOIN metas_concluidas mc ON m.id = mc.meta_id WHERE mc.usuario_id = ?').all(req.params.userId);
    const avatares = db.prepare('SELECT la.* FROM loja_avatares la JOIN usuario_avatares ua ON la.id = ua.avatar_id WHERE ua.usuario_id = ?').all(req.params.userId);
    res.json({ user, metas, avatares });
  });

  app.post('/api/usuario/update-avatar', (req, res) => {
    const { userId, avatarUrl } = req.body;
    db.prepare('UPDATE usuarios SET avatar = ? WHERE id = ?').run(avatarUrl, userId);
    res.json({ success: true });
  });

  app.post('/api/usuario/update-banner', (req, res) => {
    const { userId, bannerUrl } = req.body;
    db.prepare('UPDATE usuarios SET banner = ? WHERE id = ?').run(bannerUrl, userId);
    res.json({ success: true });
  });

  // Roulette Routes
  app.get('/api/roleta/status/:userId', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let status = db.prepare('SELECT * FROM roleta_giros WHERE usuario_id = ? AND data_giro = ?').get(req.params.userId, today) as any;
    if (!status) {
      db.prepare('INSERT INTO roleta_giros (usuario_id, data_giro, giros_realizados) VALUES (?, ?, 0)').run(req.params.userId, today);
      status = { giros_realizados: 0 };
    }
    res.json({ giros_restantes: 3 - status.giros_realizados, custo_moedas: 10 });
  });

  app.post('/api/roleta/girar', (req, res) => {
    const { userId } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const user = db.prepare('SELECT moedas FROM usuarios WHERE id = ?').get(userId) as any;
    
    if (user.moedas < 10) {
      return res.status(400).json({ error: 'Moedas insuficientes' });
    }

    let status = db.prepare('SELECT * FROM roleta_giros WHERE usuario_id = ? AND data_giro = ?').get(userId, today) as any;
    if (!status) {
      const resInsert = db.prepare('INSERT INTO roleta_giros (usuario_id, data_giro, giros_realizados) VALUES (?, ?, 0)').run(userId, today);
      status = { id: resInsert.lastInsertRowid, giros_realizados: 0 };
    }

    if (status.giros_realizados >= 3) {
      return res.status(400).json({ error: 'Limite de giros diários atingido' });
    }

    const premios = [
      { nome: 'XP Extra', valor: 50, msg: 'Parabéns! Você ganhou 50 XP!' },
      { nome: 'Moedas', valor: 50, msg: 'Incrível! Você ganhou 50 moedas!' },
      { nome: 'XP Extra', valor: 100, msg: 'Épico! Você ganhou 100 XP!' },
      { nome: 'Jackpot', valor: 500, msg: 'JACKPOT! Você ganhou 500 XP!' },
      { nome: 'Tente Novamente', valor: 0, msg: 'Não foi dessa vez, Guardião.' },
    ];
    const premio = premios[Math.floor(Math.random() * premios.length)];

    db.prepare('UPDATE roleta_giros SET giros_realizados = giros_realizados + 1 WHERE id = ?').run(status.id);
    db.prepare('UPDATE usuarios SET moedas = moedas - 10 + (CASE WHEN ? = "Moedas" THEN ? ELSE 0 END), xp = xp + (CASE WHEN ? = "XP Extra" OR ? = "Jackpot" THEN ? ELSE 0 END) WHERE id = ?')
      .run(premio.nome, premio.valor, premio.nome, premio.nome, premio.valor, userId);

    const updatedUser = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
    res.json({ premio: premio.nome, valor: premio.valor, mensagem: premio.msg, user: updatedUser });
  });

  app.post('/api/batalha/recompensa', (req, res) => {
    const { userId, vitoria } = req.body;
    if (vitoria) {
      db.prepare('UPDATE usuarios SET xp = xp + 50, moedas = moedas + 30, vitorias = vitorias + 1 WHERE id = ?').run(userId);
    } else {
      db.prepare('UPDATE usuarios SET xp = xp + 10, derrotas = derrotas + 1 WHERE id = ?').run(userId);
    }
    const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(userId);
    res.json({ success: true, user });
  });
  const onlinePlayers = new Map();
  const matchmakingQueue: any[] = [];

  io.on('connection', (socket) => {
    socket.on('registrar_usuario_online', (user) => {
      onlinePlayers.set(socket.id, { ...user, socketId: socket.id });
      io.emit('lista_online', Array.from(onlinePlayers.values()));
    });

    socket.on('enviar_convite', ({ targetSocketId, salaId }) => {
      const sender = onlinePlayers.get(socket.id);
      if (!sender) return;
      
      let sala = null;
      if (salaId) {
        sala = db.prepare('SELECT * FROM salas_batalha WHERE id = ?').get(salaId);
      }

      io.to(targetSocketId).emit('convite_recebido', {
        from: sender,
        sala
      });
    });

    socket.on('responder_convite', ({ senderSocketId, aceito, salaId }) => {
      const responder = onlinePlayers.get(socket.id);
      if (!responder) return;

      if (aceito) {
        const sender = onlinePlayers.get(senderSocketId);
        if (!sender) {
          socket.emit('erro_batalha', 'Oponente desconectou');
          return;
        }

        const battleId = `battle_${Date.now()}`;
        socket.join(battleId);
        io.sockets.sockets.get(senderSocketId)?.join(battleId);

        let questions;
        if (salaId) {
          questions = db.prepare(`
            SELECT q.* FROM questoes q
            JOIN sala_batalha_questoes sbq ON q.id = sbq.questao_id
            WHERE sbq.sala_id = ?
            ORDER BY RANDOM() LIMIT 5
          `).all(salaId);
        } else {
          questions = db.prepare('SELECT * FROM questoes ORDER BY RANDOM() LIMIT 5').all();
        }

        const battleState = {
          id: battleId,
          players: [sender, responder],
          hp: [100, 100],
          round: 1,
          questions
        };

        io.to(battleId).emit('batalha_iniciada', battleState);
      } else {
        io.to(senderSocketId).emit('convite_recusado', { from: responder });
      }
    });

    socket.on('enviar_mensagem_batalha', ({ battleId, text }) => {
      const sender = onlinePlayers.get(socket.id);
      if (!sender) return;
      io.to(battleId).emit('mensagem_batalha', {
        userId: sender.id,
        userName: sender.nome,
        text,
        timestamp: Date.now()
      });
    });

    socket.on('buscar_oponente', () => {
      const player = onlinePlayers.get(socket.id);
      if (!player) return;

      if (matchmakingQueue.length > 0) {
        const opponent = matchmakingQueue.shift();
        if (opponent.socketId === socket.id) {
          matchmakingQueue.push(player);
          return;
        }

        const battleId = `battle_${Date.now()}`;
        socket.join(battleId);
        io.sockets.sockets.get(opponent.socketId)?.join(battleId);

        const battleState = {
          id: battleId,
          players: [player, opponent],
          hp: [100, 100],
          round: 1,
          questions: db.prepare('SELECT * FROM questoes ORDER BY RANDOM() LIMIT 5').all()
        };

        io.to(battleId).emit('batalha_iniciada', battleState);
      } else {
        matchmakingQueue.push(player);
      }
    });

    socket.on('responder_pergunta_batalha', ({ battleId, userId, correct, timeBonus }) => {
      // Simple battle logic: damage opponent if correct
      // In a real app, we'd store battle state on server
      socket.to(battleId).emit('resultado_rodada', { userId, correct, damage: correct ? 20 + timeBonus : 0 });
    });

    socket.on('disconnect', () => {
      onlinePlayers.delete(socket.id);
      const index = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (index > -1) matchmakingQueue.splice(index, 1);
      io.emit('lista_online', Array.from(onlinePlayers.values()));
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
