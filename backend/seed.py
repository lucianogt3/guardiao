from app import app, db
from models import Meta, Questao

def seed_database():
    with app.app_context():
        # Limpa dados existentes
        db.drop_all()
        db.create_all()
        
        print("🌱 Inserindo Metas e Questões...")
        
        # ==================== METAS ====================
        metas = [
            {
                'id': 1,
                'titulo': 'Identificação Correta do Paciente',
                'descricao': 'Garanta que cada paciente seja corretamente identificado antes de qualquer procedimento.',
                'lore_rpg': 'O reino está em caos! Muitos heróis foram confundidos com vilões. Você precisa restaurar a ordem garantindo que cada cidadão seja corretamente identificado antes de receber qualquer poção ou tratamento.',
                'icone': '🛡️',
                'ordem': 1,
                'cor': '#FF6B6B'
            },
            {
                'id': 2,
                'titulo': 'Melhorar a Comunicação entre Profissionais',
                'descricao': 'Comunique-se de forma clara e eficaz para evitar erros.',
                'lore_rpg': 'A Torre de Babel amaldiçoou os curandeiros! Agora eles falam línguas diferentes. Você deve estabelecer um código mágico de comunicação (passback) para que as informações de tratamento não se percam.',
                'icone': '💬',
                'ordem': 2,
                'cor': '#4ECDC4'
            },
            {
                'id': 3,
                'titulo': 'Segurança na Prescrição e Administração de Medicamentos',
                'descricao': 'Evite erros com medicamentos através de boas práticas.',
                'lore_rpg': 'Poções falsificadas circulam pelo reino! A cada prescrição, você deve verificar os 5 certos: Paciente certo, poção certa, dose certa, hora certa e via certa.',
                'icone': '⚗️',
                'ordem': 3,
                'cor': '#45B7D1'
            },
            {
                'id': 4,
                'titulo': 'Cirurgia Segura',
                'descricao': 'Procedimentos cirúrgicos com checklist e marcação do local.',
                'lore_rpg': 'Os cavaleiros feridos em batalha precisam de cirurgias precisas. O pergaminho mágico (checklist) deve ser seguido rigorosamente: local correto, procedimento correto, paciente correto.',
                'icone': '⚔️',
                'ordem': 4,
                'cor': '#96CEB4'
            },
            {
                'id': 5,
                'titulo': 'Higienização das Mãos',
                'descricao': 'Lave as mãos nos 5 momentos certos para prevenir infecções.',
                'lore_rpg': 'Um vírus antigo foi despertado! Suas mãos são sua arma mais poderosa. Use o escudo da água e sabão nos 5 momentos mágicos para proteger os pacientes.',
                'icone': '🧼',
                'ordem': 5,
                'cor': '#FFD93D'
            },
            {
                'id': 6,
                'titulo': 'Prevenção de Quedas e Lesões por Pressão',
                'descricao': 'Identifique riscos e previna danos ao paciente.',
                'lore_rpg': 'O castelo tem armadilhas perigosas! Você deve identificar pacientes com alto risco de queda e usar feitiços de proteção (grades, campainha, tapetes antiderrapantes).',
                'icone': '🛡️',
                'ordem': 6,
                'cor': '#6C5CE7'
            }
        ]
        
        for m in metas:
            meta = Meta(
                id=m['id'],
                titulo=m['titulo'],
                descricao=m['descricao'],
                lore_rpg=m['lore_rpg'],
                icone=m['icone'],
                ordem=m['ordem'],
                cor=m['cor']
            )
            db.session.add(meta)
        
        db.session.commit()
        print("✅ Metas inseridas!")
        
        # ==================== QUESTÕES (60 no total) ====================
        questoes = [
            # ========== META 1 - Identificação (10 questões) ==========
            {
                'meta_id': 1,
                'pergunta': 'Quantos identificadores são obrigatórios para a correta identificação do paciente?',
                'opcao_a': '1 identificador',
                'opcao_b': '2 identificadores',
                'opcao_c': '3 identificadores',
                'opcao_d': '4 identificadores',
                'resposta_correta': 'B',
                'explicacao': 'São obrigatórios 2 identificadores: nome completo e data de nascimento (ou prontuário).',
                'dificuldade': 1
            },
            {
                'meta_id': 1,
                'pergunta': 'Qual dos seguintes NÃO é um identificador válido para o paciente?',
                'opcao_a': 'Nome completo',
                'opcao_b': 'Data de nascimento',
                'opcao_c': 'Número do leito',
                'opcao_d': 'Número do prontuário',
                'resposta_correta': 'C',
                'explicacao': 'O número do leito pode mudar, não é um identificador seguro.',
                'dificuldade': 2
            },
            {
                'meta_id': 1,
                'pergunta': 'Quando deve ser feita a identificação do paciente?',
                'opcao_a': 'Apenas na admissão',
                'opcao_b': 'Antes de cada procedimento, medicação ou coleta',
                'opcao_c': 'Apenas na primeira vez',
                'opcao_d': 'Somente se confuso',
                'resposta_correta': 'B',
                'explicacao': 'Antes de cada procedimento, medicação, coleta de exames e administração de sangue.',
                'dificuldade': 1
            },
            {
                'meta_id': 1,
                'pergunta': 'Pacientes com alergia devem usar qual tipo de pulseira?',
                'opcao_a': 'Branca',
                'opcao_b': 'Vermelha',
                'opcao_c': 'Azul',
                'opcao_d': 'Amarela',
                'resposta_correta': 'B',
                'explicacao': 'Pulseira vermelha indica alergia.',
                'dificuldade': 2
            },
            {
                'meta_id': 1,
                'pergunta': 'O que fazer se um paciente não tiver pulseira de identificação?',
                'opcao_a': 'Prosseguir sem identificação',
                'opcao_b': 'Identificar com marcador no leito',
                'opcao_c': 'Suspender até colocar pulseira',
                'opcao_d': 'Perguntar ao acompanhante',
                'resposta_correta': 'C',
                'explicacao': 'Nenhum procedimento deve ser realizado sem identificação correta.',
                'dificuldade': 1
            },
            {
                'meta_id': 1,
                'pergunta': 'Pacientes com risco de queda usam qual pulseira?',
                'opcao_a': 'Vermelha',
                'opcao_b': 'Verde',
                'opcao_c': 'Amarela',
                'opcao_d': 'Azul',
                'resposta_correta': 'C',
                'explicacao': 'Pulseira amarela indica risco de queda.',
                'dificuldade': 2
            },
            {
                'meta_id': 1,
                'pergunta': 'A identificação do paciente deve ser conferida por:',
                'opcao_a': 'Apenas o enfermeiro',
                'opcao_b': 'Dois profissionais',
                'opcao_c': 'Apenas o médico',
                'opcao_d': 'O próprio paciente',
                'resposta_correta': 'B',
                'explicacao': 'Dois profissionais devem conferir a identificação.',
                'dificuldade': 1
            },
            {
                'meta_id': 1,
                'pergunta': 'O que NÃO é aceito como identificador?',
                'opcao_a': 'Documento com foto',
                'opcao_b': 'Número do prontuário',
                'opcao_c': 'Nome do leito',
                'opcao_d': 'Data de nascimento',
                'resposta_correta': 'C',
                'explicacao': 'Nome do leito pode mudar, não é seguro.',
                'dificuldade': 1
            },
            {
                'meta_id': 1,
                'pergunta': 'Paciente confuso e sem acompanhante, como identificar?',
                'opcao_a': 'Aguardar acordar',
                'opcao_b': 'Usar número do prontuário e pulseira',
                'opcao_c': 'Perguntar a outro paciente',
                'opcao_d': 'Adiar procedimento',
                'resposta_correta': 'B',
                'explicacao': 'Sempre usar pulseira e prontuário.',
                'dificuldade': 2
            },
            {
                'meta_id': 1,
                'pergunta': 'Qual a consequência da falha na identificação?',
                'opcao_a': 'Nenhuma',
                'opcao_b': 'Procedimento em paciente errado',
                'opcao_c': 'Apenas atraso',
                'opcao_d': 'Não tem consequência',
                'resposta_correta': 'B',
                'explicacao': 'Pode levar a procedimentos em paciente errado.',
                'dificuldade': 1
            },

            # ========== META 2 - Comunicação (10 questões) ==========
            {
                'meta_id': 2,
                'pergunta': 'O que significa a sigla SBAR?',
                'opcao_a': 'Situação, Background, Avaliação, Recomendação',
                'opcao_b': 'Sintomas, Bula, Alta, Receita',
                'opcao_c': 'Sistema, Banco, Acesso, Rede',
                'opcao_d': 'Solicitação, Burocracia, Ata, Relatório',
                'resposta_correta': 'A',
                'explicacao': 'Técnica de comunicação estruturada.',
                'dificuldade': 2
            },
            {
                'meta_id': 2,
                'pergunta': 'Prescrição verbal deve ser:',
                'opcao_a': 'Anotada e executada',
                'opcao_b': 'Repetida e confirmada',
                'opcao_c': 'Ignorada',
                'opcao_d': 'Apenas anotada',
                'resposta_correta': 'B',
                'explicacao': 'Deve ser repetida em voz alta e confirmada.',
                'dificuldade': 1
            },
            {
                'meta_id': 2,
                'pergunta': 'Documento para transferência segura:',
                'opcao_a': 'Receituário',
                'opcao_b': 'Checklist de transferência',
                'opcao_c': 'Pedido de exame',
                'opcao_d': 'Declaração de óbito',
                'resposta_correta': 'B',
                'explicacao': 'Garante comunicação completa entre setores.',
                'dificuldade': 1
            },
            {
                'meta_id': 2,
                'pergunta': 'O que é "passback" na comunicação?',
                'opcao_a': 'Repetir instrução recebida',
                'opcao_b': 'Ignorar mensagem',
                'opcao_c': 'Anotar rapidamente',
                'opcao_d': 'Falar mais alto',
                'resposta_correta': 'A',
                'explicacao': 'Técnica de repetição para confirmar entendimento.',
                'dificuldade': 2
            },
            {
                'meta_id': 2,
                'pergunta': 'Qual deve ser a postura ao receber uma prescrição por telefone?',
                'opcao_a': 'Anotar e desligar',
                'opcao_b': 'Repetir, confirmar e registrar',
                'opcao_c': 'Pedir para enviar mensagem',
                'opcao_d': 'Ignorar',
                'resposta_correta': 'B',
                'explicacao': 'Sempre repetir e confirmar antes de registrar.',
                'dificuldade': 2
            },
            {
                'meta_id': 2,
                'pergunta': 'Na passagem de plantão, o que NÃO deve faltar?',
                'opcao_a': 'Pacientes críticos',
                'opcao_b': 'Previsão do tempo',
                'opcao_c': 'Escala de folgas',
                'opcao_d': 'Horário do café',
                'resposta_correta': 'A',
                'explicacao': 'Pacientes críticos são prioridade na comunicação.',
                'dificuldade': 1
            },
            {
                'meta_id': 2,
                'pergunta': 'Qual ferramenta ajuda na comunicação entre equipes?',
                'opcao_a': 'Checklist de cirurgia',
                'opcao_b': 'E-mail pessoal',
                'opcao_c': 'WhatsApp',
                'opcao_d': 'Telefone pessoal',
                'resposta_correta': 'A',
                'explicacao': 'Checklist padroniza comunicação.',
                'dificuldade': 1
            },
            {
                'meta_id': 2,
                'pergunta': 'O que significa "read back"?',
                'opcao_a': 'Ler de volta a prescrição',
                'opcao_b': 'Desligar o telefone',
                'opcao_c': 'Anotar rapidamente',
                'opcao_d': 'Ignorar a prescrição',
                'resposta_correta': 'A',
                'explicacao': 'Técnica de ler de volta o que foi prescrito.',
                'dificuldade': 2
            },
            {
                'meta_id': 2,
                'pergunta': 'Em qual situação o SBAR é mais útil?',
                'opcao_a': 'Comunicação rotineira',
                'opcao_b': 'Comunicação urgente entre profissionais',
                'opcao_c': 'Conversa informal',
                'opcao_d': 'E-mail administrativo',
                'resposta_correta': 'B',
                'explicacao': 'Útil em situações urgentes e críticas.',
                'dificuldade': 2
            },
            {
                'meta_id': 2,
                'pergunta': 'A comunicação eficaz entre profissionais ajuda a:',
                'opcao_a': 'Aumentar erros',
                'opcao_b': 'Reduzir eventos adversos',
                'opcao_c': 'Aumentar custos',
                'opcao_d': 'Gerar conflitos',
                'resposta_correta': 'B',
                'explicacao': 'Comunicação clara reduz eventos adversos.',
                'dificuldade': 1
            },

            # ========== META 3 - Medicamentos (10 questões) ==========
            {
                'meta_id': 3,
                'pergunta': 'Quais são os "5 Certos"?',
                'opcao_a': 'Paciente, remédio, dose, hora, via',
                'opcao_b': 'Paciente, médico, enfermeiro, farmácia',
                'opcao_c': 'Nome, leito, diagnóstico, peso',
                'opcao_d': 'Prescrição, dispensação, administração',
                'resposta_correta': 'A',
                'explicacao': 'Os 5 Certos são fundamentais para segurança.',
                'dificuldade': 1
            },
            {
                'meta_id': 3,
                'pergunta': 'Medicamentos de alta vigilância requerem:',
                'opcao_a': 'Administração sem checagem',
                'opcao_b': 'Dupla checagem independente',
                'opcao_c': 'Diluição obrigatória',
                'opcao_d': 'Administração por médico',
                'resposta_correta': 'B',
                'explicacao': 'Sempre dupla checagem independente.',
                'dificuldade': 2
            },
            {
                'meta_id': 3,
                'pergunta': 'Dose acima do máximo seguro: o que fazer?',
                'opcao_a': 'Administrar mesmo assim',
                'opcao_b': 'Reduzir a dose',
                'opcao_c': 'Contatar prescritor',
                'opcao_d': 'Ignorar a medicação',
                'resposta_correta': 'C',
                'explicacao': 'Sempre contate o prescritor para revisão.',
                'dificuldade': 1
            },
            {
                'meta_id': 3,
                'pergunta': 'Como rotular seringas preparadas?',
                'opcao_a': 'Após administrar',
                'opcao_b': 'Não rotular',
                'opcao_c': 'Imediatamente após preparo',
                'opcao_d': 'Usar código de cores',
                'resposta_correta': 'C',
                'explicacao': 'Rotular imediatamente evita erros.',
                'dificuldade': 2
            },
            {
                'meta_id': 3,
                'pergunta': 'O que significa "look-alike" em medicamentos?',
                'opcao_a': 'Nomes ou embalagens parecidas',
                'opcao_b': 'Preços semelhantes',
                'opcao_c': 'Mesma cor',
                'opcao_d': 'Mesmo fabricante',
                'resposta_correta': 'A',
                'explicacao': 'Medicamentos com aparência semelhante causam risco.',
                'dificuldade': 2
            },
            {
                'meta_id': 3,
                'pergunta': 'Como evitar erro com medicamentos look-alike?',
                'opcao_a': 'Tripla checagem',
                'opcao_b': 'Ignorar semelhança',
                'opcao_c': 'Trocar por genérico',
                'opcao_d': 'Armazenar juntos',
                'resposta_correta': 'A',
                'explicacao': 'Checagem rigorosa evita confusão.',
                'dificuldade': 2
            },
            {
                'meta_id': 3,
                'pergunta': 'Horário errado de medicação é considerado:',
                'opcao_a': 'Aceitável',
                'opcao_b': 'Evento adverso',
                'opcao_c': 'Sem importância',
                'opcao_d': 'Normal',
                'resposta_correta': 'B',
                'explicacao': 'Horário errado é um evento adverso.',
                'dificuldade': 1
            },
            {
                'meta_id': 3,
                'pergunta': 'Via de administração errada pode causar:',
                'opcao_a': 'Nenhum dano',
                'opcao_b': 'Dano grave ao paciente',
                'opcao_c': 'Apenas desconforto',
                'opcao_d': 'Retrabalho',
                'resposta_correta': 'B',
                'explicacao': 'Via errada pode ser fatal.',
                'dificuldade': 1
            },
            {
                'meta_id': 3,
                'pergunta': 'Antes de administrar, devemos verificar:',
                'opcao_a': 'Apenas o nome do paciente',
                'opcao_b': 'Os 5 Certos + alergias',
                'opcao_c': 'Apenas a dose',
                'opcao_d': 'Apenas o horário',
                'resposta_correta': 'B',
                'explicacao': 'Verificar 5 Certos e alergias.',
                'dificuldade': 1
            },
            {
                'meta_id': 3,
                'pergunta': 'Paciente com alergia a penicilina: o que fazer?',
                'opcao_a': 'Administrar normalmente',
                'opcao_b': 'Suspender e notificar médico',
                'opcao_c': 'Reduzir a dose',
                'opcao_d': 'Trocar por via oral',
                'resposta_correta': 'B',
                'explicacao': 'Nunca administrar, suspender e comunicar.',
                'dificuldade': 2
            },

            # ========== META 4 - Cirurgia Segura (10 questões) ==========
            {
                'meta_id': 4,
                'pergunta': 'O checklist de cirurgia segura tem quantas fases?',
                'opcao_a': '2',
                'opcao_b': '3',
                'opcao_c': '4',
                'opcao_d': '5',
                'resposta_correta': 'B',
                'explicacao': 'Sign In, Time Out e Sign Out.',
                'dificuldade': 2
            },
            {
                'meta_id': 4,
                'pergunta': 'A marcação do local cirúrgico deve ser feita por:',
                'opcao_a': 'Paciente',
                'opcao_b': 'Anestesista',
                'opcao_c': 'Cirurgião',
                'opcao_d': 'Enfermeiro',
                'resposta_correta': 'C',
                'explicacao': 'Pelo cirurgião ou profissional designado.',
                'dificuldade': 1
            },
            {
                'meta_id': 4,
                'pergunta': 'O que é verificado no Time Out?',
                'opcao_a': 'Identidade, local, consentimento',
                'opcao_b': 'Apenas nome',
                'opcao_c': 'Horário previsto',
                'opcao_d': 'Número de instrumentos',
                'resposta_correta': 'A',
                'explicacao': 'Confirmação final antes da incisão.',
                'dificuldade': 1
            },
            {
                'meta_id': 4,
                'pergunta': 'Local não marcado: o que fazer?',
                'opcao_a': 'Prosseguir',
                'opcao_b': 'Parar e marcar',
                'opcao_c': 'Pedir para anestesista marcar',
                'opcao_d': 'Ignorar',
                'resposta_correta': 'B',
                'explicacao': 'Não iniciar sem marcação.',
                'dificuldade': 1
            },
            {
                'meta_id': 4,
                'pergunta': 'O checklist deve ser preenchido por:',
                'opcao_a': 'Apenas cirurgião',
                'opcao_b': 'Equipe multiprofissional',
                'opcao_c': 'Apenas enfermeiro',
                'opcao_d': 'Paciente',
                'resposta_correta': 'B',
                'explicacao': 'Participação de toda equipe.',
                'dificuldade': 2
            },
            {
                'meta_id': 4,
                'pergunta': 'Qual o objetivo do Sign In?',
                'opcao_a': 'Antes da anestesia',
                'opcao_b': 'Antes da incisão',
                'opcao_c': 'Após cirurgia',
                'opcao_d': 'Na alta',
                'resposta_correta': 'A',
                'explicacao': 'Verificação antes da anestesia.',
                'dificuldade': 2
            },
            {
                'meta_id': 4,
                'pergunta': 'Qual o objetivo do Sign Out?',
                'opcao_a': 'Antes da anestesia',
                'opcao_b': 'Antes do paciente sair da sala',
                'opcao_c': 'Durante a cirurgia',
                'opcao_d': 'Na internação',
                'resposta_correta': 'B',
                'explicacao': 'Verificação final antes da saída.',
                'dificuldade': 2
            },
            {
                'meta_id': 4,
                'pergunta': 'Profilaxia antimicrobiana deve ser verificada em qual fase?',
                'opcao_a': 'Sign In',
                'opcao_b': 'Time Out',
                'opcao_c': 'Sign Out',
                'opcao_d': 'Pós-operatório',
                'resposta_correta': 'A',
                'explicacao': 'Verificada antes da anestesia.',
                'dificuldade': 2
            },
            {
                'meta_id': 4,
                'pergunta': 'Contagem de instrumentos é feita em qual fase?',
                'opcao_a': 'Sign In',
                'opcao_b': 'Time Out',
                'opcao_c': 'Sign Out',
                'opcao_d': 'Todas',
                'resposta_correta': 'C',
                'explicacao': 'Verificada na saída da sala.',
                'dificuldade': 2
            },
            {
                'meta_id': 4,
                'pergunta': 'Qual a cor da caneta para marcação cirúrgica?',
                'opcao_a': 'Azul',
                'opcao_b': 'Vermelha',
                'opcao_c': 'Indelével',
                'opcao_d': 'Qualquer cor',
                'resposta_correta': 'C',
                'explicacao': 'Caneta indelével para não sair com antissepsia.',
                'dificuldade': 1
            },

            # ========== META 5 - Higienização das Mãos (10 questões) ==========
            {
                'meta_id': 5,
                'pergunta': 'Quais os 5 momentos da higienização das mãos?',
                'opcao_a': 'Antes tocar paciente, antes procedimento, após risco biológico, após tocar paciente, após tocar superfícies',
                'opcao_b': 'Antes e depois refeições',
                'opcao_c': 'Ao chegar e sair',
                'opcao_d': 'Apenas antes procedimentos',
                'resposta_correta': 'A',
                'explicacao': 'Os 5 momentos da OMS.',
                'dificuldade': 2
            },
            {
                'meta_id': 5,
                'pergunta': 'Álcool em gel é eficaz contra:',
                'opcao_a': 'Todos microrganismos',
                'opcao_b': 'Bactérias e vírus envelopados',
                'opcao_c': 'Apenas fungos',
                'opcao_d': 'Apenas vírus',
                'resposta_correta': 'B',
                'explicacao': 'Não elimina esporos.',
                'dificuldade': 3
            },
            {
                'meta_id': 5,
                'pergunta': 'Higienização com água e sabão deve durar:',
                'opcao_a': '5 segundos',
                'opcao_b': '15 segundos',
                'opcao_c': '40 segundos',
                'opcao_d': '1 minuto',
                'resposta_correta': 'C',
                'explicacao': '40-60 segundos é o recomendado.',
                'dificuldade': 1
            },
            {
                'meta_id': 5,
                'pergunta': 'Quando NÃO usar álcool em gel?',
                'opcao_a': 'Mãos visivelmente sujas',
                'opcao_b': 'Antes de tocar paciente',
                'opcao_c': 'Após tocar paciente',
                'opcao_d': 'Antes de procedimento',
                'resposta_correta': 'A',
                'explicacao': 'Mãos sujas requerem água e sabão.',
                'dificuldade': 2
            },
            {
                'meta_id': 5,
                'pergunta': 'Qual a técnica correta do álcool em gel?',
                'opcao_a': 'Aplicar e secar com papel',
                'opcao_b': 'Friccionar até secar',
                'opcao_c': 'Enxaguar com água',
                'opcao_d': 'Aplicar e esperar',
                'resposta_correta': 'B',
                'explicacao': 'Friccionar todas as superfícies até secar.',
                'dificuldade': 1
            },
            {
                'meta_id': 5,
                'pergunta': 'O que fazer após contato com sangue?',
                'opcao_a': 'Álcool em gel',
                'opcao_b': 'Água e sabão',
                'opcao_c': 'Apenas luva',
                'opcao_d': 'Nada',
                'resposta_correta': 'B',
                'explicacao': 'Matéria orgânica requer água e sabão.',
                'dificuldade': 1
            },
            {
                'meta_id': 5,
                'pergunta': 'Unhas postiças são permitidas?',
                'opcao_a': 'Sim',
                'opcao_b': 'Não, acumulam microrganismos',
                'opcao_c': 'Apenas curtas',
                'opcao_d': 'Depende do setor',
                'resposta_correta': 'B',
                'explicacao': 'Acumulam fungos e bactérias.',
                'dificuldade': 2
            },
            {
                'meta_id': 5,
                'pergunta': 'Alianças e anéis na assistência:',
                'opcao_a': 'Permitidos',
                'opcao_b': 'Proibidos, acumulam microrganismos',
                'opcao_c': 'Apenas aliança de casamento',
                'opcao_d': 'Depende do material',
                'resposta_correta': 'B',
                'explicacao': 'Acumulam microrganismos, devem ser removidos.',
                'dificuldade': 1
            },
            {
                'meta_id': 5,
                'pergunta': 'Onde o álcool em gel deve ser aplicado?',
                'opcao_a': 'Apenas palmas',
                'opcao_b': 'Todas superfícies das mãos',
                'opcao_c': 'Apenas pontas dos dedos',
                'opcao_d': 'Apenas dorso',
                'resposta_correta': 'B',
                'explicacao': 'Cobrir todas superfícies.',
                'dificuldade': 1
            },
            {
                'meta_id': 5,
                'pergunta': 'Qual a principal infecção prevenida com higienização?',
                'opcao_a': 'Infecção urinária',
                'opcao_b': 'Infecção de corrente sanguínea',
                'opcao_c': 'Infecção por MRSA',
                'opcao_d': 'Todas as anteriores',
                'resposta_correta': 'D',
                'explicacao': 'Higienização previne várias infecções.',
                'dificuldade': 2
            },

            # ========== META 6 - Prevenção de Quedas (10 questões) ==========
            {
                'meta_id': 6,
                'pergunta': 'Qual paciente tem MAIOR risco de queda?',
                'opcao_a': 'Jovem pós-cirurgia',
                'opcao_b': 'Idoso com histórico de queda, usando sedativos',
                'opcao_c': 'Criança acompanhada',
                'opcao_d': 'Paciente com fratura',
                'resposta_correta': 'B',
                'explicacao': 'Idoso + histórico + sedativos = alto risco.',
                'dificuldade': 2
            },
            {
                'meta_id': 6,
                'pergunta': 'Medida NÃO eficaz para prevenir quedas:',
                'opcao_a': 'Grades elevadas',
                'opcao_b': 'Campainha ao alcance',
                'opcao_c': 'Restrição física sem indicação',
                'opcao_d': 'Tapete antiderrapante',
                'resposta_correta': 'C',
                'explicacao': 'Restrição pode causar mais danos.',
                'dificuldade': 3
            },
            {
                'meta_id': 6,
                'pergunta': 'Escala de Morse avalia:',
                'opcao_a': 'Risco de úlcera',
                'opcao_b': 'Risco de queda',
                'opcao_c': 'Risco de infecção',
                'opcao_d': 'Risco de trombose',
                'resposta_correta': 'B',
                'explicacao': 'Principal escala para risco de queda.',
                'dificuldade': 2
            },
            {
                'meta_id': 6,
                'pergunta': 'Paciente com Morse >45: conduta?',
                'opcao_a': 'Nenhuma medida',
                'opcao_b': 'Alto risco, implementar medidas',
                'opcao_c': 'Observar apenas',
                'opcao_d': 'Transferir para UTI',
                'resposta_correta': 'B',
                'explicacao': 'Alto risco, implementar protocolo.',
                'dificuldade': 2
            },
            {
                'meta_id': 6,
                'pergunta': 'Qual medicamento aumenta risco de queda?',
                'opcao_a': 'Dipirona',
                'opcao_b': 'Benzodiazepínicos',
                'opcao_c': 'Paracetamol',
                'opcao_d': 'Omeprazol',
                'resposta_correta': 'B',
                'explicacao': 'Sedativos aumentam risco de queda.',
                'dificuldade': 2
            },
            {
                'meta_id': 6,
                'pergunta': 'Sinalização de risco de queda deve ser:',
                'opcao_a': 'No prontuário apenas',
                'opcao_b': 'Visível no leito',
                'opcao_c': 'Apenas verbal',
                'opcao_d': 'Não necessária',
                'resposta_correta': 'B',
                'explicacao': 'Sinalização visível para toda equipe.',
                'dificuldade': 1
            },
            {
                'meta_id': 6,
                'pergunta': 'Qual a cor da pulseira para risco de queda?',
                'opcao_a': 'Vermelha',
                'opcao_b': 'Amarela',
                'opcao_c': 'Verde',
                'opcao_d': 'Azul',
                'resposta_correta': 'B',
                'explicacao': 'Pulseira amarela = risco de queda.',
                'dificuldade': 1
            },
            {
                'meta_id': 6,
                'pergunta': 'Como prevenir queda no banheiro?',
                'opcao_a': 'Tapete antiderrapante e barras de apoio',
                'opcao_b': 'Deixar paciente sozinho',
                'opcao_c': 'Apagar luz',
                'opcao_d': 'Molhar o piso',
                'resposta_correta': 'A',
                'explicacao': 'Equipamentos de segurança no banheiro.',
                'dificuldade': 1
            },
            {
                'meta_id': 6,
                'pergunta': 'Após queda, o que fazer primeiro?',
                'opcao_a': 'Levantar paciente',
                'opcao_b': 'Avaliar danos e notificar',
                'opcao_c': 'Chamar família',
                'opcao_d': 'Limpar o local',
                'resposta_correta': 'B',
                'explicacao': 'Avaliar e notificar é prioridade.',
                'dificuldade': 1
            },
            {
                'meta_id': 6,
                'pergunta': 'Qual a altura ideal das grades do leito?',
                'opcao_a': 'Metade do leito',
                'opcao_b': 'Totalmente elevadas',
                'opcao_c': 'Abaixadas',
                'opcao_d': 'Apenas um lado',
                'resposta_correta': 'B',
                'explicacao': 'Grades totalmente elevadas para segurança.',
                'dificuldade': 1
            }
        ]
        
        for q in questoes:
            questao = Questao(
                meta_id=q['meta_id'],
                pergunta=q['pergunta'],
                opcao_a=q['opcao_a'],
                opcao_b=q['opcao_b'],
                opcao_c=q['opcao_c'],
                opcao_d=q['opcao_d'],
                resposta_correta=q['resposta_correta'],
                explicacao=q['explicacao'],
                dificuldade=q['dificuldade']
            )
            db.session.add(questao)
        
        db.session.commit()
        print("✅ 60 questões inseridas com sucesso!")
        print("🌱 Seed concluída! Banco de dados pronto para uso.")

if __name__ == '__main__':
    seed_database()