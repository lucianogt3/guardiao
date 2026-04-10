// seed-node.js - Popula o banco guardiao_hcor.db com 6 metas e 60 questões
const Database = require('better-sqlite3');
const db = new Database('./guardiao_hcor.db');

console.log('🌱 Iniciando seed Node.js...');

// Limpar e recriar tabelas
db.exec(`
  DROP TABLE IF EXISTS metas_concluidas;
  DROP TABLE IF EXISTS questoes;
  DROP TABLE IF EXISTS metas;
  DROP TABLE IF EXISTS batalhas;
  DROP TABLE IF EXISTS usuarios;
  
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    matricula TEXT UNIQUE,
    avatar TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    setor TEXT,
    vitorias_pvp INTEGER DEFAULT 0,
    derrotas_pvp INTEGER DEFAULT 0,
    metas_concluidas TEXT
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
    dificuldade INTEGER DEFAULT 1
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

// Inserir usuário admin
const insertUser = db.prepare(`INSERT INTO usuarios (nome, matricula, setor, avatar, level, xp) VALUES (?, ?, ?, ?, ?, ?)`);
insertUser.run('Administrador', 'admin', 'UTI 1', '🛡️', 10, 1000);
console.log('✅ Admin criado');

// Inserir Metas
const metas = [
  [1, 'Identificação Correta do Paciente', 'Garanta a correta identificação', '🛡️', 1, '#FF6B6B', 'O reino está em caos!'],
  [2, 'Melhorar a Comunicação', 'Comunique-se de forma clara', '💬', 2, '#4ECDC4', 'A Torre de Babel amaldiçoou os curandeiros!'],
  [3, 'Segurança na Prescrição', 'Evite erros com medicamentos', '⚗️', 3, '#45B7D1', 'Poções falsificadas circulam!'],
  [4, 'Cirurgia Segura', 'Checklist e marcação do local', '⚔️', 4, '#96CEB4', 'Cavaleiros feridos precisam de cirurgias'],
  [5, 'Higienização das Mãos', 'Lave as mãos nos 5 momentos', '🧼', 5, '#FFD93D', 'Um vírus antigo foi despertado!'],
  [6, 'Prevenção de Quedas', 'Identifique riscos e previna', '🛡️', 6, '#6C5CE7', 'O castelo tem armadilhas!']
];

const insertMeta = db.prepare(`INSERT INTO metas (id, titulo, descricao, icone, ordem, cor, lore_rpg) VALUES (?, ?, ?, ?, ?, ?, ?)`);
for (const m of metas) {
  insertMeta.run(m[0], m[1], m[2], m[3], m[4], m[5], m[6]);
}
console.log('✅ 6 metas inseridas');

// Inserir questões (60)
const questoes = [
  // Meta 1 - 10 questões
  [1, 'Quantos identificadores são obrigatórios?', '1', '2', '3', '4', 'B', 1, 'Dois identificadores: nome e data nascimento'],
  [1, 'Qual NÃO é identificador válido?', 'Nome completo', 'Data nascimento', 'Número do leito', 'Prontuário', 'C', 2, 'Leito pode mudar'],
  [1, 'Quando deve ser feita a identificação?', 'Na admissão', 'Antes de cada procedimento', 'Na primeira vez', 'Se confuso', 'B', 1, 'Antes de cada procedimento'],
  [1, 'Pulseira de alergia é qual cor?', 'Branca', 'Vermelha', 'Azul', 'Amarela', 'B', 2, 'Vermelha = alergia'],
  [1, 'Sem pulseira, o que fazer?', 'Prosseguir', 'Identificar no leito', 'Suspender', 'Perguntar', 'C', 1, 'Não realizar sem identificação'],
  [1, 'Pulseira de risco de queda?', 'Vermelha', 'Verde', 'Amarela', 'Azul', 'C', 2, 'Amarela = risco queda'],
  [1, 'Identificação deve ser conferida por?', 'Enfermeiro', 'Dois profissionais', 'Médico', 'Paciente', 'B', 1, 'Dois profissionais'],
  [1, 'Paciente confuso como identificar?', 'Aguardar', 'Prontuário e pulseira', 'Perguntar', 'Adiar', 'B', 2, 'Usar prontuário e pulseira'],
  [1, 'Consequência da falha na identificação?', 'Nenhuma', 'Procedimento errado', 'Atraso', 'Multa', 'B', 1, 'Pode levar a procedimentos errados'],
  [1, 'O que é verificado na identificação?', 'Nome e leito', 'Nome e data', 'Leito e diagnóstico', 'Idade', 'B', 1, 'Nome e data de nascimento'],
  
  // Meta 2 - Comunicação (10 questões)
  [2, 'O que significa SBAR?', 'Situação, Background, Avaliação, Recomendação', 'Sintomas, Bula, Alta', 'Sistema, Banco, Acesso', 'Solicitação, Burocracia', 'A', 2, 'Técnica de comunicação estruturada'],
  [2, 'Prescrição verbal deve ser?', 'Anotada', 'Repetida e confirmada', 'Ignorada', 'Apenas anotada', 'B', 1, 'Repetir e confirmar'],
  [2, 'Documento para transferência segura?', 'Receituário', 'Checklist', 'Pedido exame', 'Declaração', 'B', 1, 'Checklist de transferência'],
  [2, 'O que é "passback"?', 'Repetir instrução', 'Ignorar', 'Anotar', 'Falar alto', 'A', 2, 'Repetir para confirmar'],
  [2, 'Postura ao receber prescrição por telefone?', 'Anotar', 'Repetir, confirmar, registrar', 'Pedir mensagem', 'Ignorar', 'B', 2, 'Sempre repetir e confirmar'],
  [2, 'Na passagem de plantão, não pode faltar?', 'Pacientes críticos', 'Previsão tempo', 'Escala folgas', 'Horário café', 'A', 1, 'Pacientes críticos são prioridade'],
  [2, 'Ferramenta para comunicação entre equipes?', 'Checklist', 'E-mail', 'WhatsApp', 'Telefone', 'A', 1, 'Checklist padroniza'],
  [2, 'O que é "read back"?', 'Ler de volta', 'Desligar', 'Anotar', 'Ignorar', 'A', 2, 'Ler de volta o que foi prescrito'],
  [2, 'SBAR é mais útil em?', 'Rotina', 'Comunicação urgente', 'Conversa', 'E-mail', 'B', 2, 'Útil em situações urgentes'],
  [2, 'Comunicação eficaz ajuda a?', 'Aumentar erros', 'Reduzir eventos', 'Aumentar custos', 'Gerar conflitos', 'B', 1, 'Comunicação clara reduz eventos'],
  
  // Meta 3 - Medicamentos (10 questões)
  [3, 'Quais são os "5 Certos"?', 'Paciente, remédio, dose, hora, via', 'Paciente, médico, enfermeiro', 'Nome, leito, diagnóstico', 'Prescrição, dispensação', 'A', 1, 'Os 5 Certos são fundamentais'],
  [3, 'Medicamentos de alta vigilância requerem?', 'Sem checagem', 'Dupla checagem', 'Diluição', 'Administração por médico', 'B', 2, 'Dupla checagem independente'],
  [3, 'Dose acima do máximo?', 'Administrar', 'Reduzir', 'Contatar prescritor', 'Ignorar', 'C', 1, 'Contatar prescritor'],
  [3, 'Como rotular seringas?', 'Após administrar', 'Não rotular', 'Imediatamente após preparo', 'Código cores', 'C', 2, 'Rotular imediatamente'],
  [3, '"look-alike" significa?', 'Nomes parecidos', 'Preços iguais', 'Mesma cor', 'Mesmo fabricante', 'A', 2, 'Aparência semelhante'],
  [3, 'Evitar erro com look-alike?', 'Tripla checagem', 'Ignorar', 'Trocar', 'Armazenar juntos', 'A', 2, 'Checagem rigorosa'],
  [3, 'Horário errado é considerado?', 'Aceitável', 'Evento adverso', 'Sem importância', 'Normal', 'B', 1, 'É um evento adverso'],
  [3, 'Via errada pode causar?', 'Nenhum dano', 'Dano grave', 'Desconforto', 'Retrabalho', 'B', 1, 'Pode ser fatal'],
  [3, 'Antes de administrar, verificar?', 'Apenas nome', '5 Certos + alergias', 'Apenas dose', 'Apenas horário', 'B', 1, 'Verificar tudo'],
  [3, 'Alergia a penicilina?', 'Administrar', 'Suspender e notificar', 'Reduzir dose', 'Trocar via', 'B', 2, 'Nunca administrar'],
  
  // Meta 4 - Cirurgia (10 questões)
  [4, 'Checklist de cirurgia tem quantas fases?', '2', '3', '4', '5', 'B', 2, 'Sign In, Time Out, Sign Out'],
  [4, 'Marcação do local por quem?', 'Paciente', 'Anestesista', 'Cirurgião', 'Enfermeiro', 'C', 1, 'Pelo cirurgião'],
  [4, 'Verificado no Time Out?', 'Identidade, local', 'Apenas nome', 'Horário', 'Instrumentos', 'A', 1, 'Confirmação final'],
  [4, 'Local não marcado?', 'Prosseguir', 'Parar e marcar', 'Pedir para marcar', 'Ignorar', 'B', 1, 'Não iniciar sem marcação'],
  [4, 'Checklist preenchido por?', 'Só cirurgião', 'Equipe toda', 'Só enfermeiro', 'Paciente', 'B', 2, 'Participação de toda equipe'],
  [4, 'Sign In: quando?', 'Antes anestesia', 'Antes incisão', 'Após cirurgia', 'Na alta', 'A', 2, 'Antes da anestesia'],
  [4, 'Sign Out: quando?', 'Antes anestesia', 'Antes sair da sala', 'Durante cirurgia', 'Na internação', 'B', 2, 'Antes do paciente sair'],
  [4, 'Profilaxia verificada em qual fase?', 'Sign In', 'Time Out', 'Sign Out', 'Pós-op', 'A', 2, 'Antes da anestesia'],
  [4, 'Contagem de instrumentos em qual fase?', 'Sign In', 'Time Out', 'Sign Out', 'Todas', 'C', 2, 'Na saída da sala'],
  [4, 'Cor da caneta para marcação?', 'Azul', 'Vermelha', 'Indelével', 'Qualquer', 'C', 1, 'Caneta indelével'],
  
  // Meta 5 - Higienização (10 questões)
  [5, '5 momentos da higienização?', 'Antes tocar, antes procedimento, após risco, após tocar, após superfícies', 'Antes/depois refeições', 'Ao chegar/sair', 'Só antes procedimentos', 'A', 2, 'Os 5 momentos da OMS'],
  [5, 'Álcool em gel é eficaz contra?', 'Todos', 'Bactérias e vírus', 'Só fungos', 'Só vírus', 'B', 3, 'Não elimina esporos'],
  [5, 'Higienização com água/sabão deve durar?', '5s', '15s', '40s', '1min', 'C', 1, '40-60 segundos'],
  [5, 'Quando NÃO usar álcool em gel?', 'Mãos sujas', 'Antes tocar', 'Após tocar', 'Antes procedimento', 'A', 2, 'Mãos sujas requerem água/sabão'],
  [5, 'Técnica correta do álcool em gel?', 'Aplicar e secar', 'Friccionar até secar', 'Enxaguar', 'Aplicar e esperar', 'B', 1, 'Friccionar até secar'],
  [5, 'Após contato com sangue?', 'Álcool gel', 'Água e sabão', 'Só luva', 'Nada', 'B', 1, 'Matéria orgânica requer água/sabão'],
  [5, 'Unhas postiças são permitidas?', 'Sim', 'Não', 'Se curtas', 'Depende', 'B', 2, 'Acumulam microrganismos'],
  [5, 'Alianças na assistência?', 'Permitidas', 'Proibidas', 'Só aliança', 'Depende', 'B', 1, 'Acumulam microrganismos'],
  [5, 'Onde aplicar o álcool em gel?', 'Só palmas', 'Todas superfícies', 'Só pontas', 'Só dorso', 'B', 1, 'Cobrir todas superfícies'],
  [5, 'Principal infecção prevenida?', 'Urinária', 'Corrente sanguínea', 'MRSA', 'Todas', 'D', 2, 'Previne várias infecções'],
  
  // Meta 6 - Quedas (10 questões)
  [6, 'Maior risco de queda?', 'Jovem pós-cirurgia', 'Idoso com histórico e sedativos', 'Criança acompanhada', 'Paciente com fratura', 'B', 2, 'Idoso + histórico + sedativos'],
  [6, 'Medida NÃO eficaz para prevenir quedas?', 'Grades elevadas', 'Campainha', 'Restrição física', 'Tapete antiderrapante', 'C', 3, 'Restrição pode causar mais danos'],
  [6, 'Escala de Morse avalia?', 'Risco úlcera', 'Risco queda', 'Risco infecção', 'Risco trombose', 'B', 2, 'Principal escala para queda'],
  [6, 'Morse >45: conduta?', 'Nenhuma', 'Alto risco, implementar medidas', 'Observar', 'Transferir UTI', 'B', 2, 'Alto risco, implementar protocolo'],
  [6, 'Medicamento que aumenta risco de queda?', 'Dipirona', 'Benzodiazepínicos', 'Paracetamol', 'Omeprazol', 'B', 2, 'Sedativos aumentam risco'],
  [6, 'Sinalização de risco de queda deve ser?', 'Só prontuário', 'Visível no leito', 'Só verbal', 'Não necessária', 'B', 1, 'Sinalização visível'],
  [6, 'Cor da pulseira para risco de queda?', 'Vermelha', 'Amarela', 'Verde', 'Azul', 'B', 1, 'Amarela = risco queda'],
  [6, 'Como prevenir queda no banheiro?', 'Tapete e barras', 'Deixar sozinho', 'Apagar luz', 'Molhar piso', 'A', 1, 'Equipamentos de segurança'],
  [6, 'Após queda, o que fazer primeiro?', 'Levantar', 'Avaliar e notificar', 'Chamar família', 'Limpar local', 'B', 1, 'Avaliar e notificar'],
  [6, 'Altura ideal das grades do leito?', 'Metade', 'Totalmente elevadas', 'Abaixadas', 'Um lado', 'B', 1, 'Grades totalmente elevadas']
];

const insertQuestao = db.prepare(`INSERT INTO questoes (meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, dificuldade, explicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const q of questoes) {
  insertQuestao.run(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]);
}
console.log(`✅ ${questoes.length} questões inseridas`);

// Verificar
console.log('\n📊 Resumo:');
console.log('Metas:', db.prepare('SELECT COUNT(*) FROM metas').get());
console.log('Questões:', db.prepare('SELECT COUNT(*) FROM questoes').get());
console.log('Usuários:', db.prepare('SELECT COUNT(*) FROM usuarios').get());

console.log('\n🌱 Seed concluída! Banco guardiao_hcor.db pronto para uso.');