from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from models import db, Usuario, Meta, Questao, Pontuacao
import random
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hcor-guardioes-2025-game'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False

CORS(app, origins=['http://localhost:5173', 'http://localhost:3000'], supports_credentials=True)
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

# Armazenamento temporário
batalhas_ativas = {}
fila_matchmaking = []
usuarios_online = {}
desafios_pendentes = {}

# ==================== FUNÇÃO AUXILIAR ====================
def criar_batalha(jogador1, jogador2):
    sala_id = f"batalha_{jogador1['id']}_{jogador2['id']}"
    
    todas_questoes = Questao.query.all()
    if len(todas_questoes) < 3:
        perguntas_batalha = todas_questoes
    else:
        perguntas_batalha = random.sample(todas_questoes, min(10, len(todas_questoes)))
    
    batalhas_ativas[sala_id] = {
        'jogadores': [jogador1, jogador2],
        'hp': {jogador1['id']: 100, jogador2['id']: 100},
        'acertos': {jogador1['id']: 0, jogador2['id']: 0},
        'combo': {jogador1['id']: 0, jogador2['id']: 0},
        'perguntas': [{
            'id': q.id,
            'pergunta': q.pergunta,
            'opcoes': {'A': q.opcao_a, 'B': q.opcao_b, 'C': q.opcao_c, 'D': q.opcao_d},
            'resposta': q.resposta_correta
        } for q in perguntas_batalha],
        'rodada': 0,
        'responderam': set(),
        'vencedor': None,
        'iniciado': False
    }
    
    join_room(sala_id, jogador1['sid'])
    join_room(sala_id, jogador2['sid'])
    
    emit('batalha_iniciada', {
        'sala_id': sala_id,
        'oponente': {'id': jogador2['id'], 'nome': jogador2['nome'], 'avatar': jogador2['avatar']},
        'seu_hp': 100,
        'hp_oponente': 100,
        'total_rodadas': len(perguntas_batalha)
    }, room=jogador1['sid'])
    
    emit('batalha_iniciada', {
        'sala_id': sala_id,
        'oponente': {'id': jogador1['id'], 'nome': jogador1['nome'], 'avatar': jogador1['avatar']},
        'seu_hp': 100,
        'hp_oponente': 100,
        'total_rodadas': len(perguntas_batalha)
    }, room=jogador2['sid'])
    
    batalhas_ativas[sala_id]['iniciado'] = True
    socketio.sleep(3)
    enviar_proxima_pergunta(sala_id)

def enviar_proxima_pergunta(sala_id):
    batalha = batalhas_ativas.get(sala_id)
    if not batalha or batalha['vencedor']:
        return
    
    rodada = batalha['rodada']
    if rodada >= len(batalha['perguntas']):
        hp1 = batalha['hp'][batalha['jogadores'][0]['id']]
        hp2 = batalha['hp'][batalha['jogadores'][1]['id']]
        acertos1 = batalha['acertos'][batalha['jogadores'][0]['id']]
        acertos2 = batalha['acertos'][batalha['jogadores'][1]['id']]
        
        if hp1 > hp2:
            vencedor_id = batalha['jogadores'][0]['id']
        elif hp2 > hp1:
            vencedor_id = batalha['jogadores'][1]['id']
        else:
            vencedor_id = batalha['jogadores'][0]['id'] if acertos1 > acertos2 else batalha['jogadores'][1]['id']
        
        finalizar_batalha(sala_id, vencedor_id)
        return
    
    pergunta = batalha['perguntas'][rodada]
    batalha['responderam'] = set()
    
    emit('nova_pergunta', {
        'pergunta': pergunta['pergunta'],
        'opcoes': pergunta['opcoes'],
        'tempo': 15,
        'rodada': rodada + 1,
        'total': len(batalha['perguntas'])
    }, room=sala_id)

def finalizar_batalha(sala_id, vencedor_id):
    batalha = batalhas_ativas.get(sala_id)
    if not batalha or batalha['vencedor']:
        return
    
    batalha['vencedor'] = vencedor_id
    
    for jogador in batalha['jogadores']:
        usuario = Usuario.query.get(jogador['id'])
        pont = Pontuacao.query.filter_by(usuario_id=jogador['id']).first()
        
        if jogador['id'] == vencedor_id:
            usuario.vitorias_pvp += 1
            if pont:
                pont.batalhas_vencidas += 1
                pont.pontuacao_total += 50
            usuario.adicionar_xp(50)
        else:
            usuario.derrotas_pvp += 1
            usuario.adicionar_xp(20)
        
        db.session.commit()
    
    emit('fim_batalha', {
        'vencedor_id': vencedor_id,
        'vencedor_nome': next(j['nome'] for j in batalha['jogadores'] if j['id'] == vencedor_id),
        'hp_final': batalha['hp'],
        'acertos_final': batalha['acertos']
    }, room=sala_id)
    
    socketio.sleep(5)
    if sala_id in batalhas_ativas:
        del batalhas_ativas[sala_id]

# ==================== ROTAS DE USUÁRIO ====================
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    matricula = str(data.get('matricula', '')).strip()
    setor = str(data.get('setor', '')).strip()

    if not matricula or not setor:
        return jsonify({'error': 'Matrícula e setor são obrigatórios'}), 400

    usuario = Usuario.query.filter_by(matricula=matricula).first()
    if not usuario:
        return jsonify({'error': 'Matrícula não cadastrada. Faça o cadastro primeiro.'}), 404

    if usuario.setor != setor:
        return jsonify({'error': 'Setor incorreto. Tente novamente.'}), 401

    session['usuario_id'] = usuario.id
    session.permanent = True

    metas_concluidas = []
    if usuario.metas_concluidas:
        metas_concluidas = [int(i) for i in usuario.metas_concluidas.split(',') if i.strip()]

    nome_exibicao = usuario.nome.strip() if usuario.nome and usuario.nome.strip() else "Jogador"

    return jsonify({
        'id': usuario.id,
        'nome': nome_exibicao,
        'matricula': usuario.matricula,
        'setor': usuario.setor,
        'avatar': usuario.avatar,
        'xp': usuario.xp,
        'level': usuario.level,
        'metas_concluidas': metas_concluidas,
        'vitorias': usuario.vitorias_pvp,
        'derrotas': usuario.derrotas_pvp
    })

@app.route('/api/cadastro', methods=['POST'])
def cadastrar_usuario():
    try:
        data = request.json
        print(f"Recebendo cadastro: {data}")

        matricula = str(data.get('matricula', '')).strip()
        nome = data.get('nome')
        setor = str(data.get('setor', '')).strip()
        avatar = data.get('avatar', 'guerreiro')

        if not matricula or not setor:
            return jsonify({'error': 'Matrícula e setor são obrigatórios'}), 400

        existe = Usuario.query.filter_by(matricula=matricula).first()
        if existe:
            return jsonify({'error': 'Matrícula já cadastrada'}), 409

        nome_tratado = str(nome).strip() if nome and str(nome).strip() else "Jogador"

        usuario = Usuario(
            matricula=matricula,
            nome=nome_tratado,
            setor=setor,
            avatar=avatar
        )
        db.session.add(usuario)
        db.session.commit()

        pont = Pontuacao(usuario_id=usuario.id)
        db.session.add(pont)
        db.session.commit()

        print(f"Usuário criado: {usuario.nome} (ID: {usuario.id})")

        return jsonify({
            'success': True,
            'mensagem': 'Cadastro realizado com sucesso!',
            'usuario': {
                'id': usuario.id,
                'nome': usuario.nome,
                'matricula': usuario.matricula,
                'setor': usuario.setor,
                'avatar': usuario.avatar,
                'xp': usuario.xp,
                'level': usuario.level,
                'metas_concluidas': []
            }
        })

    except Exception as e:
        print(f"Erro no cadastro: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/perfil/<int:usuario_id>', methods=['GET'])
def get_perfil(usuario_id):
    try:
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        pontuacao = Pontuacao.query.filter_by(usuario_id=usuario_id).first()
        
        xp_atual = usuario.xp or 0
        xp_proximo = 600 - (xp_atual % 600)
        
        metas_concluidas = []
        if usuario.metas_concluidas:
            try:
                metas_concluidas = [int(i) for i in usuario.metas_concluidas.split(',') if i.strip()]
            except:
                metas_concluidas = []
        
        return jsonify({
            'nome': usuario.nome,
            'setor': usuario.setor,
            'avatar': usuario.avatar,
            'xp': xp_atual,
            'level': usuario.level,
            'xp_proximo_level': xp_proximo,
            'metas_concluidas': metas_concluidas,
            'pontuacao_total': pontuacao.pontuacao_total if pontuacao else 0,
            'acertos': pontuacao.questoes_acertadas if pontuacao else 0,
            'batalhas_vencidas': pontuacao.batalhas_vencidas if pontuacao else 0
        })
    except Exception as e:
        print(f"Erro em /api/perfil: {e}")
        return jsonify({'error': 'Erro interno no servidor'}), 500
    
# ==================== ROTAS DE MISSÕES ====================
@app.route('/api/metas', methods=['GET'])
def listar_metas():
    metas = Meta.query.order_by(Meta.ordem).all()
    return jsonify([{
        'id': m.id,
        'titulo': m.titulo,
        'descricao': m.descricao,
        'icone': m.icone,
        'lore': m.lore_rpg,
        'ordem': m.ordem,
        'cor': m.cor
    } for m in metas])

@app.route('/api/questoes/<int:meta_id>', methods=['GET'])
def get_questoes_meta(meta_id):
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({'error': 'Não autenticado'}), 401

    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    todas_questoes = Questao.query.filter_by(meta_id=meta_id).all()
    if len(todas_questoes) == 0:
        return jsonify({'error': 'Não há questões para esta meta'}), 404

    # Agora cada meta traz até 10 questões
    num_questoes = min(10, len(todas_questoes))
    selecionadas = random.sample(todas_questoes, num_questoes)

    return jsonify([{
        'id': q.id,
        'pergunta': q.pergunta,
        'opcao_a': q.opcao_a,
        'opcao_b': q.opcao_b,
        'opcao_c': q.opcao_c,
        'opcao_d': q.opcao_d,
        'dificuldade': q.dificuldade,
        'resposta_correta': q.resposta_correta,
        'explicacao': q.explicacao
    } for q in selecionadas])

@app.route('/api/responder', methods=['POST'])
def responder_questao():
    data = request.json
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({'error': 'Não autenticado'}), 401
    
    questao_id = data.get('questao_id')
    resposta = data.get('resposta')
    meta_id = data.get('meta_id')
    
    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    questao = Questao.query.get(questao_id)
    if not questao:
        return jsonify({'error': 'Questão não encontrada'}), 404
    
    correta = (resposta.upper() == questao.resposta_correta) if resposta else False
    pontos_ganhos = 0
    
    if correta:
        pontos_ganhos = 10 * questao.dificuldade
        pont = Pontuacao.query.filter_by(usuario_id=usuario_id).first()
        if pont:
            pont.pontuacao_total += pontos_ganhos
            pont.questoes_acertadas += 1
            db.session.commit()
    
    return jsonify({
        'correta': correta,
        'pontos_ganhos': pontos_ganhos if correta else 0,
        'explicacao': questao.explicacao if not correta else None,
        'resposta_correta': questao.resposta_correta if not correta else None
    })

@app.route('/api/completar-meta/<int:meta_id>', methods=['POST'])
def completar_meta(meta_id):
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({'error': 'Não autenticado'}), 401

    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    metas_concluidas = []
    if usuario.metas_concluidas:
        metas_concluidas = [int(i) for i in usuario.metas_concluidas.split(',') if i.strip()]

    print(f"DEBUG: Completando meta {meta_id}")
    print(f"DEBUG: Metas atuais: {metas_concluidas}")

    # Se já concluiu, permite jogar novamente, mas não dá XP de novo
    if meta_id in metas_concluidas:
        return jsonify({
            'success': True,
            'meta_completada': True,
            'ja_concluida': True,
            'xp_ganho': 0,
            'novo_level': usuario.level,
            'metas_concluidas': metas_concluidas,
            'proxima_meta': meta_id + 1 if meta_id < 6 else None,
            'elegivel_sorteio': len(metas_concluidas) == 6,
            'mensagem': f'Você refez a Meta {meta_id} com sucesso!'
        })

    # Se ainda não concluiu, grava e dá XP
    metas_concluidas.append(meta_id)
    metas_concluidas = sorted(list(set(metas_concluidas)))
    usuario.metas_concluidas = ",".join(str(m) for m in metas_concluidas)

    usuario.adicionar_xp(100)
    db.session.commit()

    print(f"DEBUG: Metas agora: {metas_concluidas}")

    return jsonify({
        'success': True,
        'meta_completada': True,
        'ja_concluida': False,
        'xp_ganho': 100,
        'novo_level': usuario.level,
        'metas_concluidas': metas_concluidas,
        'proxima_meta': meta_id + 1 if meta_id < 6 else None,
        'elegivel_sorteio': len(metas_concluidas) == 6,
        'mensagem': f'Parabéns! Você completou a Meta {meta_id}! +100 XP!'
    })

# ==================== ROTA DE DEBUG ====================
@app.route('/api/debug/usuario', methods=['GET'])
def debug_usuario():
    usuario_id = session.get('usuario_id')
    if not usuario_id:
        return jsonify({'error': 'Não autenticado'}), 401
    
    usuario = Usuario.query.get(usuario_id)
    metas = []
    if usuario.metas_concluidas:
        metas = [int(i) for i in usuario.metas_concluidas.split(',') if i.strip()]
    
    return jsonify({
        'id': usuario.id,
        'nome': usuario.nome,
        'metas_concluidas': metas,
        'metas_string': usuario.metas_concluidas,
        'xp': usuario.xp,
        'level': usuario.level
    })

# ==================== RANKING ====================
@app.route('/api/ranking', methods=['GET'])
def get_ranking():
    ranking = db.session.query(
        Usuario.nome,
        Usuario.avatar,
        Pontuacao.pontuacao_total,
        Usuario.setor,
        Usuario.level
    ).join(Pontuacao).order_by(Pontuacao.pontuacao_total.desc()).limit(20).all()
    
    return jsonify([{
        'nome': r[0],
        'avatar': r[1],
        'pontos': r[2],
        'setor': r[3],
        'level': r[4]
    } for r in ranking])

@app.route('/api/ranking_completo', methods=['GET'])
def get_ranking_completo():
    ranking = db.session.query(
        Usuario.nome,
        Usuario.avatar,
        Pontuacao.pontuacao_total,
        Usuario.setor,
        Usuario.level,
        Usuario.vitorias_pvp,
        Usuario.derrotas_pvp
    ).join(Pontuacao).order_by(Pontuacao.pontuacao_total.desc()).limit(20).all()
    
    resultado = []
    for r in ranking:
        total_batalhas = r[5] + r[6]
        kd = round(r[5] / total_batalhas, 2) if total_batalhas > 0 else 0
        resultado.append({
            'nome': r[0],
            'avatar': r[1],
            'pontos': r[2],
            'setor': r[3],
            'level': r[4],
            'vitorias': r[5],
            'derrotas': r[6],
            'kd': kd
        })
    return jsonify(resultado)

# ==================== SOCKET.IO ====================
@socketio.on('entrar_fila')
def handle_entrar_fila(data):
    usuario_id = data.get('usuario_id')
    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return
    
    usuarios_online[usuario_id] = {
        'id': usuario_id,
        'nome': usuario.nome,
        'avatar': usuario.avatar,
        'sid': request.sid
    }
    emit('lista_online', list(usuarios_online.values()), broadcast=True)

@socketio.on('buscar_oponente')
def handle_matchmaking(data):
    usuario_id = data.get('usuario_id')
    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        emit('erro', {'mensagem': 'Usuário não encontrado'})
        return
    
    fila_matchmaking.append({
        'id': usuario_id,
        'nome': usuario.nome,
        'avatar': usuario.avatar,
        'sid': request.sid
    })
    
    if len(fila_matchmaking) >= 2:
        jogador1 = fila_matchmaking.pop(0)
        jogador2 = fila_matchmaking.pop(0)
        criar_batalha(jogador1, jogador2)

@socketio.on('enviar_desafio')
def handle_enviar_desafio(data):
    desafiante_id = data.get('desafiante_id')
    desafiado_id = data.get('desafiado_id')
    
    desafiante = Usuario.query.get(desafiante_id)
    desafiado = Usuario.query.get(desafiado_id)
    
    if not desafiante or not desafiado:
        emit('erro', {'mensagem': 'Jogador não encontrado'})
        return
    
    if desafiado_id not in usuarios_online:
        emit('desafio_recusado', {'mensagem': f'{desafiado.nome} não está online.'}, room=request.sid)
        return
    
    desafio_id = f"desafio_{desafiante_id}_{desafiado_id}_{int(time.time())}"
    
    desafios_pendentes[desafio_id] = {
        'desafiante_id': desafiante_id,
        'desafiante_nome': desafiante.nome,
        'desafiante_avatar': desafiante.avatar,
        'desafiado_id': desafiado_id,
        'status': 'pendente'
    }
    
    emit('receber_desafio', {
        'desafio_id': desafio_id,
        'desafiante_id': desafiante_id,
        'desafiante_nome': desafiante.nome,
        'desafiante_avatar': desafiante.avatar
    }, room=usuarios_online[desafiado_id]['sid'])
    
    emit('desafio_enviado', {'desafiado_nome': desafiado.nome}, room=request.sid)

@socketio.on('aceitar_desafio')
def handle_aceitar_desafio(data):
    desafio_id = data.get('desafio_id')
    desafiado_id = data.get('desafiado_id')
    
    desafio = desafios_pendentes.get(desafio_id)
    if not desafio or desafio['status'] != 'pendente':
        emit('erro', {'mensagem': 'Desafio expirado'})
        return
    
    desafiante_sid = usuarios_online.get(desafio['desafiante_id'], {}).get('sid')
    desafiado_sid = usuarios_online.get(desafiado_id, {}).get('sid')
    
    if not desafiante_sid or not desafiado_sid:
        emit('erro', {'mensagem': 'Um dos jogadores saiu'})
        return
    
    jogador1 = {
        'id': desafio['desafiante_id'],
        'nome': desafio['desafiante_nome'],
        'avatar': desafio['desafiante_avatar'],
        'sid': desafiante_sid
    }
    jogador2 = {
        'id': desafiado_id,
        'nome': Usuario.query.get(desafiado_id).nome,
        'avatar': Usuario.query.get(desafiado_id).avatar,
        'sid': desafiado_sid
    }
    
    emit('desafio_aceito', {}, room=desafiante_sid)
    emit('desafio_aceito', {}, room=desafiado_sid)
    
    criar_batalha(jogador1, jogador2)
    del desafios_pendentes[desafio_id]

@socketio.on('recusar_desafio')
def handle_recusar_desafio(data):
    desafio_id = data.get('desafio_id')
    desafio = desafios_pendentes.get(desafio_id)
    if desafio:
        desafiante_sid = usuarios_online.get(desafio['desafiante_id'], {}).get('sid')
        if desafiante_sid:
            emit('desafio_recusado', {'mensagem': 'O jogador recusou seu desafio.'}, room=desafiante_sid)
        del desafios_pendentes[desafio_id]

@socketio.on('responder_batalha')
def handle_resposta_batalha(data):
    sala_id = data.get('sala_id')
    usuario_id = data.get('usuario_id')
    resposta = data.get('resposta')
    tempo_resposta = data.get('tempo', 15)
    
    batalha = batalhas_ativas.get(sala_id)
    if not batalha or batalha['vencedor']:
        return
    
    if usuario_id in batalha['responderam']:
        return
    
    rodada = batalha['rodada']
    pergunta = batalha['perguntas'][rodada]
    correta = (resposta and resposta.upper() == pergunta['resposta']) if resposta else False
    
    if not correta:
        batalha['combo'][usuario_id] = 0
    
    dano_total = 0
    combo_ativado = False
    mensagem_combo = ""
    
    if correta:
        batalha['acertos'][usuario_id] += 1
        dano_base = 10
        bonus_rapidez = max(0, (15 - tempo_resposta) * 1.5)
        dano = int(dano_base + bonus_rapidez)
        
        if tempo_resposta <= 6:
            batalha['combo'][usuario_id] += 1
            if batalha['combo'][usuario_id] >= 2:
                dano = int(dano * 1.5)
                mensagem_combo = "⚡ COMBO x2! +50% dano!"
            if batalha['combo'][usuario_id] >= 3:
                dano = int(dano * 2)
                combo_ativado = True
                mensagem_combo = "💥 COMBO MASTER x3! DANO DOBRADO! 💥"
                batalha['combo'][usuario_id] = 0
        else:
            batalha['combo'][usuario_id] = 0
        
        oponente_id = [j['id'] for j in batalha['jogadores'] if j['id'] != usuario_id][0]
        dano_total = min(50, dano)
        batalha['hp'][oponente_id] = max(0, batalha['hp'][oponente_id] - dano_total)
        
        emit('resultado_rodada', {
            'acertou': usuario_id,
            'dano': dano_total,
            'correta': True,
            'combo_ativado': combo_ativado,
            'mensagem_combo': mensagem_combo,
            'hp_jogador1': batalha['hp'][batalha['jogadores'][0]['id']],
            'hp_jogador2': batalha['hp'][batalha['jogadores'][1]['id']]
        }, room=sala_id)
    else:
        emit('resultado_rodada', {
            'acertou': usuario_id,
            'dano': 0,
            'correta': False,
            'combo_ativado': False,
            'mensagem_combo': "",
            'hp_jogador1': batalha['hp'][batalha['jogadores'][0]['id']],
            'hp_jogador2': batalha['hp'][batalha['jogadores'][1]['id']]
        }, room=sala_id)
    
    batalha['responderam'].add(usuario_id)
    
    hp1 = batalha['hp'][batalha['jogadores'][0]['id']]
    hp2 = batalha['hp'][batalha['jogadores'][1]['id']]
    
    if hp1 <= 0:
        finalizar_batalha(sala_id, batalha['jogadores'][1]['id'])
    elif hp2 <= 0:
        finalizar_batalha(sala_id, batalha['jogadores'][0]['id'])
    elif len(batalha['responderam']) == 2:
        batalha['rodada'] += 1
        socketio.sleep(1.5)
        enviar_proxima_pergunta(sala_id)

@socketio.on('disconnect')
def handle_disconnect():
    for i, item in enumerate(fila_matchmaking):
        if item['sid'] == request.sid:
            fila_matchmaking.pop(i)
            break
    for uid, info in list(usuarios_online.items()):
        if info['sid'] == request.sid:
            del usuarios_online[uid]
            emit('lista_online', list(usuarios_online.values()), broadcast=True)
            break

# ==================== INICIALIZAÇÃO ====================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Verificar se existem metas, se não, criar algumas básicas
        if Meta.query.count() == 0:
            print("Criando metas padrão...")
            metas_padrao = [
                Meta(id=1, titulo="Meta 1", descricao="Complete a primeira meta", icone="🌟", ordem=1),
                Meta(id=2, titulo="Meta 2", descricao="Complete a segunda meta", icone="⚔️", ordem=2),
                Meta(id=3, titulo="Meta 3", descricao="Complete a terceira meta", icone="📚", ordem=3),
                Meta(id=4, titulo="Meta 4", descricao="Complete a quarta meta", icone="🏆", ordem=4),
                Meta(id=5, titulo="Meta 5", descricao="Complete a quinta meta", icone="🎯", ordem=5),
                Meta(id=6, titulo="Meta 6", descricao="Complete a sexta meta", icone="👑", ordem=6),
            ]
            for meta in metas_padrao:
                db.session.add(meta)
            db.session.commit()
            print(f"{len(metas_padrao)} metas criadas!")
            
            # Criar algumas questões padrão para cada meta
            print("Criando questões padrão...")
            for meta_id in range(1, 7):
                for i in range(1, 11):
                    questao = Questao(
                        meta_id=meta_id,
                        pergunta=f"Pergunta {i} da Meta {meta_id}?",
                        opcao_a="Opção A",
                        opcao_b="Opção B",
                        opcao_c="Opção C",
                        opcao_d="Opção D",
                        resposta_correta="A",
                        explicacao="Esta é a resposta correta!",
                        dificuldade=1
                    )
                    db.session.add(questao)
            db.session.commit()
            print("Questões padrão criadas!")
    
    print("🚀 Servidor rodando em http://localhost:5030")
    socketio.run(app, debug=True, port=5030, allow_unsafe_werkzeug=True)