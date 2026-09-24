// seed.js
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho para o banco de dados
const dbPath = join(__dirname, 'guardiao_v2.db');
console.log(`📁 Banco de dados: ${dbPath}`);
console.log(`📊 Existe? ${existsSync(dbPath) ? 'Sim' : 'Não (será criado)'}`);

const db = new Database(dbPath);

try {
    // Verificar se as tabelas existem
    const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`📋 Tabelas encontradas: ${tabelas.map(t => t.name).join(', ')}`);

    // Inserir temas
    const inserirTemas = db.prepare(`
        INSERT INTO temas (nome, descricao, icone, capa) VALUES 
        (?, ?, ?, ?)
    `);

    console.log('\n📝 Inserindo temas...');
    inserirTemas.run('Emergência', 'Protocolos de atendimento urgente', '🚑', '/images/emergencia.jpg');
    inserirTemas.run('UTI', 'Cuidados intensivos', '🫀', '/images/uti.jpg');
    inserirTemas.run('Pediatria', 'Cuidados infantis', '👶', '/images/pediatria.jpg');
    inserirTemas.run('Gestão', 'Gestão em enfermagem', '📊', '/images/gestao.jpg');
    console.log('✅ Temas inseridos!');

    // Inserir admin padrão (senha: admin123)
    const inserirAdmin = db.prepare(`
        INSERT INTO usuarios (nome, email, senha, avatar, is_admin) 
        VALUES (?, ?, ?, ?, ?)
    `);

    console.log('\n👤 Inserindo admin...');
    inserirAdmin.run('Mestre dos Jogos', 'admin@guardioes.com', 'admin123', '/avatars/mestre.png', 1);
    console.log('✅ Admin inserido!');

    // Verificar o que foi inserido
    const temas = db.prepare('SELECT * FROM temas').all();
    const admin = db.prepare('SELECT id, nome, email, is_admin FROM usuarios WHERE is_admin = 1').get();

    console.log('\n📊 RESUMO:');
    console.log(`- ${temas.length} temas cadastrados`);
    console.log(`- Admin: ${admin?.nome} (${admin?.email})`);
    console.log('\n✅ Dados iniciais inseridos com sucesso!');
    console.log('🔑 Login: admin@guardioes.com / senha: admin123');

} catch (error) {
    console.error('❌ Erro ao inserir dados:', error.message);
    if (error.message.includes('no such table')) {
        console.log('\n⚠️ As tabelas ainda não foram criadas!');
        console.log('Primeiro rode: npm run dev');
        console.log('Isso criará o banco e as tabelas automaticamente.');
    }
}