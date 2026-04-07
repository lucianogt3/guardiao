const Database = require('better-sqlite3');
const db = new Database('./guardiao_hcor.db');

db.pragma('foreign_keys = ON');

console.log('🌱 Criando banco de dados e inserindo dados...\n');

// Criar tabelas (COM MATRÍCULA)
db.exec(`
  DROP TABLE IF EXISTS batalhas;
  DROP TABLE IF EXISTS metas_concluidas;
  DROP TABLE IF EXISTS questoes;
  DROP TABLE IF EXISTS metas;
  DROP TABLE IF EXISTS usuarios;

  CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    matricula TEXT UNIQUE,
    avatar TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    setor TEXT
  );

  CREATE TABLE metas (
    id INTEGER PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT,
    lore_rpg TEXT,
    icone TEXT,
    ordem INTEGER,
    cor TEXT
  );

  CREATE TABLE questoes (
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

  CREATE TABLE metas_concluidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    meta_id INTEGER NOT NULL,
    UNIQUE(usuario_id, meta_id)
  );

  CREATE TABLE batalhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    venceu INTEGER DEFAULT 0
  );
`);

console.log('✅ Tabelas criadas com sucesso!');

// Inserir metas
const metas = [
  { id: 1, titulo: 'Identificação Correta do Paciente', descricao: 'Garanta que cada paciente seja corretamente identificado.', icone: '🛡️', ordem: 1, cor: '#FF6B6B' },
  { id: 2, titulo: 'Comunicação entre Profissionais', descricao: 'Comunique-se de forma clara para evitar erros.', icone: '💬', ordem: 2, cor: '#4ECDC4' },
  { id: 3, titulo: 'Segurança na Administração de Medicamentos', descricao: 'Evite erros com medicamentos usando os 5 Certos.', icone: '⚗️', ordem: 3, cor: '#45B7D1' },
  { id: 4, titulo: 'Cirurgia Segura', descricao: 'Procedimentos cirúrgicos com checklist e marcação.', icone: '⚔️', ordem: 4, cor: '#96CEB4' },
  { id: 5, titulo: 'Higienização das Mãos', descricao: 'Lave as mãos nos 5 momentos certos.', icone: '🧼', ordem: 5, cor: '#FFD93D' },
  { id: 6, titulo: 'Prevenção de Quedas', descricao: 'Identifique riscos e previna quedas.', icone: '🛡️', ordem: 6, cor: '#6C5CE7' }
];

const insertMeta = db.prepare(`
  INSERT INTO metas (id, titulo, descricao, icone, ordem, cor)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const meta of metas) {
  insertMeta.run(meta.id, meta.titulo, meta.descricao, meta.icone, meta.ordem, meta.cor);
}
console.log(`✅ ${metas.length} metas inseridas`);

// Inserir questões (10 por meta = 60 questões)
const questoes = [
  // Meta 1 - Identificação (10 questões)
  [1, 'Quantos identificadores são obrigatórios para identificar um paciente?', '1', '2', '3', '4', 'B', 'Dois identificadores: nome completo e data de nascimento.', 1],
  [1, 'Qual destes NÃO é um identificador válido?', 'Nome completo', 'Data de nascimento', 'Número do leito', 'Prontuário', 'C', 'Número do leito pode mudar, não é seguro.', 1],
  [1, 'Quando deve ser feita a identificação do paciente?', 'Só na admissão', 'Antes de cada procedimento', 'Uma vez por dia', 'Só se confuso', 'B', 'Antes de cada procedimento, medicação ou coleta.', 1],
  [1, 'Pacientes com alergia usam qual pulseira?', 'Branca', 'Vermelha', 'Azul', 'Verde', 'B', 'Pulseira vermelha indica alergia.', 2],
  [1, 'Pacientes com risco de queda usam qual pulseira?', 'Vermelha', 'Verde', 'Amarela', 'Azul', 'C', 'Pulseira amarela indica risco de queda.', 2],
  [1, 'O que fazer se paciente não tem pulseira?', 'Prosseguir', 'Fazer com marcador', 'Suspender até colocar', 'Perguntar ao acompanhante', 'C', 'Nenhum procedimento sem identificação.', 1],
  [1, 'A identificação deve ser conferida por:', 'Um profissional', 'Dois profissionais', 'Apenas médico', 'O paciente', 'B', 'Dois profissionais para segurança.', 1],
  [1, 'Qual documento NÃO é aceito como identificador?', 'RG', 'Prontuário', 'Nome do leito', 'Data de nascimento', 'C', 'Nome do leito não é identificador seguro.', 1],
  [1, 'Paciente confuso sem acompanhante, como identificar?', 'Aguardar acordar', 'Usar prontuário e pulseira', 'Perguntar a outro', 'Adiar procedimento', 'B', 'Usar pulseira e prontuário.', 2],
  [1, 'Falha na identificação pode causar?', 'Atraso', 'Procedimento errado', 'Nada grave', 'Multa', 'B', 'Pode levar a procedimentos em paciente errado.', 1],

  // Meta 2 - Comunicação (10 questões)
  [2, 'O que significa a sigla SBAR?', 'Situação, Background, Avaliação, Recomendação', 'Sintomas, Bula, Alta, Receita', 'Sistema, Banco, Acesso, Rede', 'Solicitação, Burocracia, Ata, Relatório', 'A', 'Técnica de comunicação estruturada.', 2],
  [2, 'Prescrição verbal deve ser:', 'Anotada e executada', 'Repetida e confirmada', 'Ignorada', 'Apenas anotada', 'B', 'Repetir e confirmar antes de executar.', 1],
  [2, 'Documento para transferência segura:', 'Receituário', 'Checklist de transferência', 'Pedido de exame', 'Declaração', 'B', 'Garante comunicação completa entre setores.', 1],
  [2, 'O que é "passback" na comunicação?', 'Repetir instrução', 'Ignorar mensagem', 'Anotar rápido', 'Falar mais alto', 'A', 'Técnica de repetir para confirmar entendimento.', 2],
  [2, 'Como receber prescrição por telefone?', 'Anotar e desligar', 'Repetir, confirmar e registrar', 'Pedir mensagem', 'Ignorar', 'B', 'Sempre repetir e confirmar antes de registrar.', 2],
  [2, 'Na passagem de plantão, o que não pode faltar?', 'Pacientes críticos', 'Previsão do tempo', 'Escala de folgas', 'Horário do café', 'A', 'Pacientes críticos são prioridade.', 1],
  [2, 'Qual ferramenta ajuda na comunicação?', 'Checklist cirúrgico', 'E-mail pessoal', 'WhatsApp', 'Telefone pessoal', 'A', 'Checklist padroniza a comunicação.', 1],
  [2, 'O que significa "read back"?', 'Ler de volta', 'Desligar telefone', 'Anotar rápido', 'Ignorar', 'A', 'Técnica de ler o que foi prescrito.', 2],
  [2, 'SBAR é mais útil em:', 'Comunicação rotineira', 'Comunicação urgente', 'Conversa informal', 'E-mail', 'B', 'Útil em situações urgentes e críticas.', 2],
  [2, 'Comunicação eficaz ajuda a:', 'Aumentar erros', 'Reduzir eventos adversos', 'Aumentar custos', 'Gerar conflitos', 'B', 'Comunicação clara reduz eventos adversos.', 1],

  // Meta 3 - Medicamentos (10 questões)
  [3, 'Quais são os "5 Certos"?', 'Paciente, remédio, dose, hora, via', 'Paciente, médico, enfermeiro, farmácia', 'Nome, leito, diagnóstico, peso', 'Prescrição, dispensação, administração', 'A', 'Os 5 Certos são fundamentais para segurança.', 1],
  [3, 'Medicamentos de alta vigilância requerem:', 'Administração sem checagem', 'Dupla checagem independente', 'Diluição obrigatória', 'Administração por médico', 'B', 'Sempre dupla checagem independente.', 2],
  [3, 'Dose acima do seguro: o que fazer?', 'Administrar mesmo', 'Reduzir a dose', 'Contatar prescritor', 'Ignorar medicação', 'C', 'Sempre contate o prescritor.', 1],
  [3, 'Como rotular seringas preparadas?', 'Após administrar', 'Não rotular', 'Imediatamente após preparo', 'Usar código de cores', 'C', 'Rotular imediatamente evita erros.', 2],
  [3, 'O que significa "look-alike"?', 'Nomes/embalagens parecidas', 'Preços semelhantes', 'Mesma cor', 'Mesmo fabricante', 'A', 'Medicamentos com aparência semelhante.', 2],
  [3, 'Como evitar erro com look-alike?', 'Tripla checagem', 'Ignorar semelhança', 'Trocar por genérico', 'Armazenar juntos', 'A', 'Checagem rigorosa evita confusão.', 2],
  [3, 'Horário errado de medicação é:', 'Aceitável', 'Evento adverso', 'Sem importância', 'Normal', 'B', 'Horário errado é um evento adverso.', 1],
  [3, 'Via errada pode causar:', 'Nenhum dano', 'Dano grave', 'Apenas desconforto', 'Retrabalho', 'B', 'Via errada pode ser fatal.', 1],
  [3, 'Antes de administrar, verificar:', 'Só o nome', '5 Certos + alergias', 'Só a dose', 'Só o horário', 'B', 'Verificar 5 Certos e alergias.', 1],
  [3, 'Paciente alérgico a penicilina:', 'Administrar normal', 'Suspender e notificar', 'Reduzir dose', 'Trocar via', 'B', 'Nunca administrar, suspender e comunicar.', 2],

  // Meta 4 - Cirurgia Segura (10 questões)
  [4, 'Checklist de cirurgia tem quantas fases?', '2', '3', '4', '5', 'B', 'Sign In, Time Out e Sign Out.', 2],
  [4, 'Marcaçã o local deve ser feita por:', 'Paciente', 'Anestesista', 'Cirurgião', 'Enfermeiro', 'C', 'Pelo cirurgião ou profissional designado.', 1],
  [4, 'O que é verificado no Time Out?', 'Identidade, local, consentimento', 'Só nome', 'Horário', 'Instrumentos', 'A', 'Confirmação final antes da incisão.', 1],
  [4, 'Local não marcado: o que fazer?', 'Prosseguir', 'Parar e marcar', 'Pedir para marcar', 'Ignorar', 'B', 'Não iniciar sem marcação.', 1],
  [4, 'Checklist deve ser preenchido por:', 'Só cirurgião', 'Equipe multiprofissional', 'Só enfermeiro', 'Paciente', 'B', 'Participação de toda equipe.', 2],
  [4, 'Objetivo do Sign In:', 'Antes da anestesia', 'Antes da incisão', 'Após cirurgia', 'Na alta', 'A', 'Verificação antes da anestesia.', 2],
  [4, 'Objetivo do Sign Out:', 'Antes da anestesia', 'Antes de sair da sala', 'Durante cirurgia', 'Na internação', 'B', 'Verificação final antes da saída.', 2],
  [4, 'Profilaxia antimicrobiana em qual fase?', 'Sign In', 'Time Out', 'Sign Out', 'Pós-operatório', 'A', 'Verificada antes da anestesia.', 2],
  [4, 'Contagem de instrumentos em qual fase?', 'Sign In', 'Time Out', 'Sign Out', 'Todas', 'C', 'Verificada na saída da sala.', 2],
  [4, 'Cor da caneta para marcação cirúrgica:', 'Azul', 'Vermelha', 'Indelével', 'Qualquer', 'C', 'Caneta indelével não sai com antissepsia.', 1],

  // Meta 5 - Higienização (10 questões)
  [5, 'Quais os 5 momentos da higienização?', 'Antes tocar, antes procedimento, após risco, após tocar, após superfícies', 'Antes e depois refeições', 'Ao chegar e sair', 'Só antes procedimentos', 'A', 'Os 5 momentos da OMS.', 2],
  [5, 'Álcool em gel é eficaz contra:', 'Todos microrganismos', 'Bactérias e vírus envelopados', 'Só fungos', 'Só vírus', 'B', 'Não elimina esporos.', 3],
  [5, 'Higienização com água/sabão deve durar:', '5 segundos', '15 segundos', '40 segundos', '1 minuto', 'C', '40-60 segundos é o recomendado.', 1],
  [5, 'Quando NÃO usar álcool em gel?', 'Mãos visivelmente sujas', 'Antes tocar paciente', 'Após tocar paciente', 'Antes procedimento', 'A', 'Mãos sujas requerem água e sabão.', 2],
  [5, 'Técnica correta do álcool em gel:', 'Aplicar e secar', 'Friccionar até secar', 'Enxaguar com água', 'Aplicar e esperar', 'B', 'Friccionar todas superfícies até secar.', 1],
  [5, 'O que fazer após contato com sangue?', 'Álcool em gel', 'Água e sabão', 'Só luva', 'Nada', 'B', 'Matéria orgânica requer água e sabão.', 1],
  [5, 'Unhas postiças são permitidas?', 'Sim', 'Não, acumulam microrganismos', 'Só curtas', 'Depende', 'B', 'Acumulam fungos e bactérias.', 2],
  [5, 'Alianças na assistência:', 'Permitidas', 'Proibidas, acumulam microrganismos', 'Só aliança', 'Depende', 'B', 'Acumulam microrganismos.', 1],
  [5, 'Onde aplicar álcool em gel?', 'Só palmas', 'Todas superfícies', 'Só pontas dos dedos', 'Só dorso', 'B', 'Cobrir todas superfícies.', 1],
  [5, 'Principal infecção prevenida:', 'Infecção urinária', 'Infecção sanguínea', 'Infecção por MRSA', 'Todas anteriores', 'D', 'Higienização previne várias infecções.', 2],

  // Meta 6 - Prevenção de Quedas (10 questões)
  [6, 'Paciente com MAIOR risco de queda?', 'Jovem pós-cirurgia', 'Idoso com histórico e sedativos', 'Criança acompanhada', 'Paciente com fratura', 'B', 'Idoso + histórico + sedativos = alto risco.', 2],
  [6, 'Medida NÃO eficaz para prevenir quedas:', 'Grades elevadas', 'Campainha ao alcance', 'Restrição física sem indicação', 'Tapete antiderrapante', 'C', 'Restrição pode causar mais danos.', 3],
  [6, 'Escala de Morse avalia:', 'Risco de úlcera', 'Risco de queda', 'Risco de infecção', 'Risco de trombose', 'B', 'Principal escala para risco de queda.', 2],
  [6, 'Paciente com Morse >45: conduta?', 'Nenhuma medida', 'Alto risco, implementar medidas', 'Observar apenas', 'Transferir para UTI', 'B', 'Alto risco, implementar protocolo.', 2],
  [6, 'Medicamento que aumenta risco de queda:', 'Dipirona', 'Benzodiazepínicos', 'Paracetamol', 'Omeprazol', 'B', 'Sedativos aumentam risco de queda.', 2],
  [6, 'Sinalização de risco deve ser:', 'Só no prontuário', 'Visível no leito', 'Só verbal', 'Não necessária', 'B', 'Sinalização visível para toda equipe.', 1],
  [6, 'Cor da pulseira para risco de queda:', 'Vermelha', 'Amarela', 'Verde', 'Azul', 'B', 'Pulseira amarela = risco de queda.', 1],
  [6, 'Como prevenir queda no banheiro?', 'Tapete e barras de apoio', 'Deixar paciente sozinho', 'Apagar luz', 'Molhar o piso', 'A', 'Equipamentos de segurança no banheiro.', 1],
  [6, 'Após queda, o que fazer primeiro?', 'Levantar paciente', 'Avaliar danos e notificar', 'Chamar família', 'Limpar local', 'B', 'Avaliar e notificar é prioridade.', 1],
  [6, 'Altura ideal das grades do leito:', 'Metade', 'Totalmente elevadas', 'Abaixadas', 'Só um lado', 'B', 'Grades totalmente elevadas para segurança.', 1]
];

const insertQuestao = db.prepare(`
  INSERT INTO questoes (meta_id, pergunta, opcao_a, opcao_b, opcao_c, opcao_d, resposta_correta, explicacao, dificuldade)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const q of questoes) {
  insertQuestao.run(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]);
}

console.log(`✅ ${questoes.length} questões inseridas`);

// Mostrar resumo
const totalMetas = db.prepare('SELECT COUNT(*) AS total FROM metas').get().total;
const totalQuestoes = db.prepare('SELECT COUNT(*) AS total FROM questoes').get().total;
const tabelaInfo = db.prepare("PRAGMA table_info(usuarios)").all();

console.log('\n✨ Seed concluído com sucesso!');
console.log(`📚 Metas: ${totalMetas}`);
console.log(`❓ Questões: ${totalQuestoes}`);
console.log('\n📋 Estrutura da tabela usuarios:');
tabelaInfo.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`);
});

db.close();