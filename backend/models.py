from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    matricula = db.Column(db.String(20), unique=True, nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    setor = db.Column(db.String(100))
    avatar = db.Column(db.String(20), default='guerreiro')
    xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    vitorias_pvp = db.Column(db.Integer, default=0)
    derrotas_pvp = db.Column(db.Integer, default=0)
    metas_concluidas = db.Column(db.String(100), default='')
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)
    
    def completar_meta(self, meta_id):
        if not self.metas_concluidas:
            self.metas_concluidas = str(meta_id)
        else:
            ids = [int(i) for i in self.metas_concluidas.split(',')]
            if meta_id not in ids:
                ids.append(meta_id)
                self.metas_concluidas = ','.join(map(str, ids))
                self.xp += 100
                self.level = (self.xp // 600) + 1
        db.session.commit()
    
    def adicionar_xp(self, quantidade):
        self.xp += quantidade
        novo_level = (self.xp // 600) + 1
        level_up = novo_level > self.level
        self.level = novo_level
        db.session.commit()
        return level_up

class Meta(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text, nullable=False)
    lore_rpg = db.Column(db.Text)
    icone = db.Column(db.String(50))
    ordem = db.Column(db.Integer)
    cor = db.Column(db.String(20), default='#FFD700')

class Questao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    meta_id = db.Column(db.Integer, db.ForeignKey('meta.id'), nullable=False)
    pergunta = db.Column(db.Text, nullable=False)
    opcao_a = db.Column(db.String(200))
    opcao_b = db.Column(db.String(200))
    opcao_c = db.Column(db.String(200))
    opcao_d = db.Column(db.String(200))
    resposta_correta = db.Column(db.String(1), nullable=False)
    explicacao = db.Column(db.Text)
    dificuldade = db.Column(db.Integer, default=1)

class Pontuacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'))
    pontuacao_total = db.Column(db.Integer, default=0)
    questoes_acertadas = db.Column(db.Integer, default=0)
    batalhas_vencidas = db.Column(db.Integer, default=0)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)