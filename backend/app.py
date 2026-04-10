from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Usuario, Meta, Questao, Pontuacao
from datetime import datetime
import random
import time
import os
import sys
import io

# Garante que o console aceite caracteres especiais (emojis de avatar) no Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'hcor-guardioes-2025-game')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# AJUSTE DE COOKIES: Para produção com HTTPS e Domínios cruzados
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = True 

# CORS: Adicionado suporte para métodos e headers específicos
CORS(app, 
     origins=['https://guardiao.nursetec.com.br', 'http://guardiao.nursetec.com.br'], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"])

db.init_app(app)

# CONFIGURAÇÃO SOCKET.IO: 
# Usamos async_mode='threading' (compatível com Windows, sem gevent)
socketio = SocketIO(
    app, 
    cors_allowed_origins=["https://guardiao.nursetec.com.br", "http://guardiao.nursetec.com.br"],
    async_mode='threading', 
    ping_timeout=60,
    ping_interval=25,
    manage_session=False
)

# ==================== VARIÁVEIS GLOBAIS ====================
usuarios_online = {}
fila_matchmaking = []
batalhas_ativas = {}
desafios_pendentes = {}

# ==================== FUNÇÕES AUXILIARES ====================
def criar_batalha(jogador1, jogador2):
    sala_id = f"batalha_{jogador1['id']}_{jogador2['id']}"
    
    # 1. Busca as questões no banco de dados
    todas_questoes = Questao.query.all()
    if len(todas_questoes) < 1:
        print("❌ Nenhuma questão cadastrada! Batalha não pode começar.")
        socketio.emit('erro', {'mensagem': 'Sem questões no banco'}, room=jogador1['sid'])
        socketio.emit('erro', {'mensagem': 'Sem questões no banco'}, room=jogador2['sid'])
        return
    
    # Seleciona até 10 questões aleatórias
    if len(todas_questoes) < 3:
        selecionadas = todas_questoes
    else:
        selecionadas = random.sample(todas_questoes, min(10, len(todas_questoes)))
    
    perguntas = [{
        'id': q.id,
        'pergunta': q.pergunta,
        'opcoes': {'A': q.opcao_a, 'B': q.opcao_b, 'C': q.opcao_c, 'D': q.opcao_d},
        'resposta': q.resposta_correta
    } for q in selecionadas]

    # 2. Estrutura da batalha
    batalhas_ativas[sala_id] = {
        'jogadores': [jogador1, jogador2],
        'hp': {str(jogador1['id']): 100, str(jogador2['id']): 100},
        'acertos': {str(jogador1['id']): 0, str(jogador2['id']): 0},
        'combo': {str(jogador1['id']): 0, str(jogador2['id']): 0},
        'perguntas': perguntas,
        'rodada': 0,
        'responderam': set(),
        'vencedor': None,
        'iniciado': False
    }

    # 3. Adiciona os jogadores à sala (room)
    join_room(sala_id, sid=jogador1['sid'])
    join_room(sala_id, sid=jogador2['sid'])

    socketio.sleep(0.5)  # Pequeno delay para garantir que as rooms foram criadas

    # 4. Envia o evento 'batalha_iniciada' para ambos
    for jogador, oponente in [(jogador1, jogador2), (jogador2, jogador1)]:
        socketio.emit('batalha_iniciada', {
            'sala_id': sala_id,
            'oponente': {'id': oponente['id'], 'nome': oponente['nome'], 'avatar': oponente['avatar']},
            'seu_hp': 100,
            'hp_oponente': 100,
            'total_rodadas': len(perguntas)
        }, room=jogador['sid'])

    batalhas_ativas[sala_id]['iniciado'] = True
    print(f"⚔️ Batalha criada: {jogador1['nome']} vs {jogador2['nome']} (sala {sala_id})")
    
    # 5. Aguarda um pouco e envia a primeira pergunta
    socketio.sleep(2)
    enviar_proxima_pergunta(sala_id)

def enviar_proxima_pergunta(sala_id):
    batalha = batalhas_ativas.get(sala_id)
    if not batalha or batalha['vencedor']:
        return
    
    rodada = batalha['rodada']
    if rodada >= len(batalha['perguntas']):
        # Fim da batalha: determinar vencedor
        j1, j2 = batalha['jogadores']
        hp1 = batalha['hp'][str(j1['id'])]
        hp2 = batalha['hp'][str(j2['id'])]
        acertos1 = batalha['acertos'][str(j1['id'])]
        acertos2 = batalha['acertos'][str(j2['id'])]
        
        if hp1 > hp2:
            vencedor_id = j1['id']
        elif hp2 > hp1:
            vencedor_id = j2['id']
        else:
            vencedor_id = j1['id'] if acertos1 > acertos2 else j2['id']
        
        finalizar_batalha(sala_id, vencedor_id)
        return
    
    pergunta = batalha['perguntas'][rodada]
    batalha['responderam'] = set()
    
    socketio.emit('nova_pergunta', {
        'pergunta': pergunta['pergunta'],
        'opcoes': pergunta['opcoes'],
        'tempo': 15,
        'rodada': rodada + 1,
        'total': len(batalha['perguntas'])
    }, room=sala_id)
    print(f"📤 Pergunta {rodada+1} enviada para sala {sala_id}")

def finalizar_batalha(sala_id, vencedor_id):
    batalha = batalhas_ativas.get(sala_id)
    if not batalha or batalha['vencedor']:
        return
    
    batalha['vencedor'] = vencedor_id
    vencedor_id_str = str(vencedor_id)
    
    for jogador in batalha['jogadores']:
        usuario = Usuario.query.get(jogador['id'])
        if not usuario:
            continue
        if str(jogador['id']) == vencedor_id_str:
            usuario.vitorias_pvp += 1
            usuario.adicionar_xp(50)
            pont = Pontuacao.query.filter_by(usuario_id=jogador['id']).first()
            if pont:
                pont.batalhas_vencidas += 1
                pont.pontuacao_total += 50
        else:
            usuario.derrotas_pvp += 1
            usuario.adicionar_xp(20)
        db.session.commit()
    
    vencedor_nome = next((j['nome'] for j in batalha['jogadores'] if str(j['id']) == vencedor_id_str), "Desconhecido")
    
    socketio.emit('fim_batalha', {
        'vencedor_id': vencedor_id,
        'vencedor_nome': vencedor_nome,
        'hp_final': batalha['hp'],
        'acertos_final': batalha['acertos']
    }, room=sala_id)
    
    socketio.sleep(3)
    if sala_id in batalhas_ativas:
        del batalhas_ativas[sala_id]
    print(f"🏁 Batalha {sala_id} finalizada. Vencedor: {vencedor_nome}")

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
    posicao_ranking = Usuario.query.filter(Usuario.xp > usuario.xp).count() + 1

    return jsonify({
        'id': usuario.id,
        'nome': nome_exibicao,
        'matricula': usuario.matricula,
        'setor': usuario.setor,
        'avatar': usuario.avatar,
        'xp': usuario.xp or 0,
        'level': usuario.level or 1,
        'metas_concluidas': metas_concluidas,
        'batalhas_vencidas': usuario.vitorias_pvp or 0, 
        'derrotas': usuario.derrotas_pvp or 0,
        'ranking_posicao': posicao_ranking,
        'acertos': (usuario.xp // 10) if usuario.xp else 0
    })

@app.route('/api/cadastro', methods=['POST'])
def cadastrar_usuario():
    try:
        data = request.json
        print(f"📥 Recebendo cadastro: {data}")
        
        matricula = data.get('matricula')
        nome = data.get('nome')
        setor = data.get('setor')
        avatar = data.get('avatar', 'guerreiro')
        
        if not matricula or not str(matricula).strip():
            return jsonify({'error': 'Matrícula é obrigatória'}), 400
        if not setor or not str(setor).strip():
            return jsonify({'error': 'Setor é obrigatório'}), 400
        
        existe = Usuario.query.filter_by(matricula=str(matricula).strip()).first()
        if existe:
            return jsonify({'error': 'Matrícula já cadastrada'}), 409
        
        nome_final = str(nome).strip() if nome and str(nome).strip() else f'Jogador {matricula}'
        
        usuario = Usuario(
            matricula=str(matricula).strip(),
            nome=nome_final,
            setor=str(setor).strip(),
            avatar=avatar
        )
        db.session.add(usuario)
        db.session.commit()
        
        pont = Pontuacao(usuario_id=usuario.id)
        db.session.add(pont)
        db.session.commit()
        
        print(f"✅ Usuário criado: {usuario.nome} (ID: {usuario.id})")
        
        return jsonify({
            'success': True,
            'mensagem': 'Cadastro realizado com sucesso!',
            'usuario': {
                'id': usuario.id,
                'nome': usuario.nome,
                'matricula': usuario.matricula,
                'avatar': usuario.avatar,
                'level': usuario.level,
                'xp': usuario.xp,
                'setor': usuario.setor,
                'metas_concluidas': []
            }
        })
    except Exception as e:
        print(f"❌ Erro no cadastro: {str(e)}")
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

    metas_concluidas.append(meta_id)
    metas_concluidas = sorted(list(set(metas_concluidas)))
    usuario.metas_concluidas = ",".join(str(m) for m in metas_concluidas)
    usuario.adicionar_xp(100)
    db.session.commit()

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

# ==================== CONFIGURAÇÃO ADM ====================
ADM_USER = "admin"
ADM_PASS = "UTI 1" 

@app.route('/api/adm/ranking', methods=['POST'])
def get_ranking_adm():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if username != ADM_USER or password != ADM_PASS:
        return jsonify({'error': 'Acesso negado. Credenciais de ADM incorretas.'}), 403

    ranking_detalhado = db.session.query(
        Usuario.id,
        Usuario.nome,
        Usuario.matricula,
        Usuario.setor,
        Pontuacao.pontuacao_total,
        Usuario.level
    ).join(Pontuacao, Usuario.id == Pontuacao.usuario_id)\
     .order_by(Pontuacao.pontuacao_total.desc()).all()
    
    lista_premiação = []
    for idx, r in enumerate(ranking_detalhado):
        lista_premiação.append({
            'posicao': idx + 1,
            'id': r.id,
            'nome': r.nome,
            'matricula': r.matricula,
            'setor': r.setor,
            'pontos': r.pontuacao_total,
            'level': r.level
        })
    return jsonify(lista_premiação)

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
@socketio.on('registrar_usuario_online')
def handle_registro(data):
    usuario_id = str(data.get('usuario_id')) if data.get('usuario_id') else None
    if not usuario_id:
        print("⚠️ Tentativa de registro sem ID de usuário.")
        return
    
    usuario = db.session.get(Usuario, usuario_id)
    if usuario:
        usuarios_online[usuario_id] = {
            'id': usuario_id,
            'nome': usuario.nome,
            'avatar': usuario.avatar,
            'setor': usuario.setor,
            'sid': request.sid
        }
        socketio.emit('lista_online', list(usuarios_online.values()))
        print(f"✅ Guardião Online: {usuario.nome} | SID: {request.sid}")
    else:
        print(f"❌ Usuário ID {usuario_id} não encontrado no banco de dados.")

@socketio.on('buscar_oponente')
def handle_matchmaking(data):
    usuario_id = str(data.get('usuario_id'))
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        emit('erro', {'mensagem': 'Usuário não encontrado'})
        return
    
    # Evita duplicatas na fila e verifica se já está em batalha
    if any(p['id'] == usuario_id for p in fila_matchmaking):
        return
    if any(usuario_id in [str(j['id']) for j in b['jogadores']] for b in batalhas_ativas.values()):
        emit('erro', {'mensagem': 'Você já está em uma batalha'})
        return

    fila_matchmaking.append({
        'id': usuario_id,
        'nome': usuario.nome,
        'avatar': usuario.avatar,
        'sid': request.sid
    })
    print(f"⚔️ {usuario.nome} entrou na fila. Total: {len(fila_matchmaking)}")
    
    if len(fila_matchmaking) >= 2:
        jogador1 = fila_matchmaking.pop(0)
        jogador2 = fila_matchmaking.pop(0)
        criar_batalha(jogador1, jogador2)

@socketio.on('enviar_desafio')
def handle_enviar_desafio(data):
    desafiante_id = str(data.get('desafiante_id'))
    desafiado_id = str(data.get('desafiado_id'))
    
    desafiante = db.session.get(Usuario, desafiante_id)
    desafiado = db.session.get(Usuario, desafiado_id)
    
    if not desafiante or not desafiado:
        emit('erro', {'mensagem': 'Jogador não encontrado'})
        return
    
    if desafiado_id not in usuarios_online:
        emit('desafio_recusado', {'mensagem': f'{desafiado.nome} saiu da arena.'}, room=request.sid)
        return
    
    desafio_id = f"desafio_{desafiante_id}_{desafiado_id}_{int(time.time())}"
    
    desafios_pendentes[desafio_id] = {
        'desafiante_id': desafiante_id,
        'desafiado_id': desafiado_id,
        'desafiante_nome': desafiante.nome,
        'desafiante_avatar': desafiante.avatar
    }
    
    socketio.emit('receber_desafio', {
        'desafio_id': desafio_id,
        'desafiante_id': desafiante_id,
        'desafiante_nome': desafiante.nome,
        'desafiante_avatar': desafiante.avatar
    }, room=usuarios_online[desafiado_id]['sid'])
    
    emit('desafio_enviado', {'desafiado_nome': desafiado.nome}, room=request.sid)
    print(f"📨 Desafio enviado: {desafiante.nome} -> {desafiado.nome}")

@socketio.on('aceitar_desafio')
def handle_aceitar_desafio(data):
    desafio_id = data.get('desafio_id')
    desafiado_id = str(data.get('desafiado_id'))
    
    desafio = desafios_pendentes.get(desafio_id)
    if not desafio:
        emit('erro', {'mensagem': 'Desafio expirado'}, room=request.sid)
        return
    
    if desafio['desafiado_id'] != desafiado_id:
        return
    
    desafiante_id = desafio['desafiante_id']
    desafiante = usuarios_online.get(desafiante_id)
    desafiado = usuarios_online.get(desafiado_id)
    
    if not desafiante or not desafiado:
        emit('erro', {'mensagem': 'Um dos jogadores está offline'}, room=request.sid)
        return
    
    # Remove da fila se estiver
    fila_matchmaking[:] = [p for p in fila_matchmaking if p['id'] not in (desafiante_id, desafiado_id)]
    
    criar_batalha(desafiante, desafiado)
    desafios_pendentes.pop(desafio_id, None)
    print(f"✅ Desafio aceito: {desafiante['nome']} vs {desafiado['nome']}")

@socketio.on('recusar_desafio')
def handle_recusar_desafio(data):
    desafio_id = data.get('desafio_id')
    desafio = desafios_pendentes.get(desafio_id)
    if desafio:
        desafiante_id = desafio['desafiante_id']
        socketio.emit('desafio_recusado', {}, room=usuarios_online.get(desafiante_id, {}).get('sid', ''))
        desafios_pendentes.pop(desafio_id)
        print("❌ Desafio recusado")

@socketio.on('responder_pergunta')
def handle_resposta_batalha(data):
    sala_id = data.get('sala_id')
    usuario_id = str(data.get('usuario_id'))
    resposta = data.get('resposta')
    tempo_resposta = data.get('tempo_resposta', 15000) / 1000 
    
    batalha = batalhas_ativas.get(sala_id)
    if not batalha or batalha.get('vencedor'):
        return
    
    if usuario_id in batalha['responderam']:
        return
    
    batalha['responderam'].add(usuario_id)
    rodada = batalha['rodada']
    if rodada >= len(batalha['perguntas']):
        return
    
    pergunta = batalha['perguntas'][rodada]
    correta = (resposta and str(resposta).upper() == str(pergunta['resposta']).upper())
    
    # Encontra o oponente
    oponente_id = None
    for jid in batalha['hp'].keys():
        if jid != usuario_id:
            oponente_id = jid
            break
    
    dano_causado = 0
    if correta:
        batalha['acertos'][usuario_id] = batalha['acertos'].get(usuario_id, 0) + 1
        bonus = max(0, int(15 - tempo_resposta))
        dano_causado = 15 + bonus
        if oponente_id:
            batalha['hp'][oponente_id] = max(0, batalha['hp'][oponente_id] - dano_causado)
    
    socketio.emit('resultado_rodada', {
        'jogador_id': usuario_id,
        'acertou': correta,
        'dano_causado': dano_causado,
        'hp_atual': batalha['hp'][usuario_id],
        'hp_oponente': batalha['hp'].get(oponente_id, 0)
    }, room=sala_id)
    
    if len(batalha['responderam']) >= 2:
        batalha['rodada'] += 1
        # Verifica se alguém morreu
        hp_values = list(batalha['hp'].values())
        if hp_values[0] <= 0 or hp_values[1] <= 0:
            vencedor_id = None
            for jid, hp in batalha['hp'].items():
                if hp > 0:
                    vencedor_id = jid
                    break
            if vencedor_id:
                finalizar_batalha(sala_id, vencedor_id)
        else:
            socketio.sleep(2)
            enviar_proxima_pergunta(sala_id)

# ==================== ROTA DA ROLETA ====================
@app.route('/api/roleta/girar', methods=['POST', 'OPTIONS'])
def girar_roleta():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    data = request.json
    usuario_id = data.get('usuario_id')
    
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"erro": "Guardião não encontrado"}), 404

    hoje = datetime.now().strftime('%Y-%m-%d')
    if usuario.ultimo_giro == hoje:
        return jsonify({"erro": "Você já girou hoje! Volte amanhã."}), 400

    premios = [
        {"index": 0, "valor": 10},
        {"index": 1, "valor": 50},
        {"index": 2, "valor": 20},
        {"index": 3, "valor": 100},
        {"index": 4, "valor": 30},
        {"index": 5, "valor": 200}
    ]

    ganhou = random.choice(premios)
    usuario.xp += ganhou['valor']
    usuario.ultimo_giro = hoje
    
    try:
        db.session.commit()
        return jsonify({
            "index_ganhador": ganhou['index'],
            "valor": ganhou['valor'],
            "mensagem": f"🛡️ Sorte de Guardião! +{ganhou['valor']} XP!"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"erro": "Erro ao salvar no pergaminho (banco de dados)"}), 500

# ==================== INICIALIZAÇÃO ====================
if __name__ == '__main__':
    with app.app_context():
        # 1. CRIA AS TABELAS
        db.create_all()
        
        # 2. GARANTE A COLUNA 'ultimo_giro' NA TABELA 'usuario' (se não existir)
        try:
            db.session.execute('ALTER TABLE usuario ADD COLUMN ultimo_giro TEXT')
            db.session.commit()
            print("✅ Coluna 'ultimo_giro' adicionada com sucesso.")
        except Exception:
            pass  # coluna já existe
        
        # 3. VERIFICA SE O ADMIN EXISTE
        admin_existe = Usuario.query.filter_by(matricula='admin').first()
        if not admin_existe:
            print("🛡️ Criando usuário Administrador...")
            novo_adm = Usuario(
                matricula='admin',
                nome='Administrador HCOR',
                setor='UTI 1',
                avatar='🛡️',
                level=99,
                xp=9999
            )
            db.session.add(novo_adm)
            db.session.flush() 
            db.session.add(Pontuacao(usuario_id=novo_adm.id))
            db.session.commit()
            print("✅ Administrador pronto!")
    
    print("🚀 Servidor HCOR Guardiões ativo em http://127.0.0.1:5030")
    socketio.run(
        app, 
        host='127.0.0.1', 
        port=5030, 
        debug=False, 
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )