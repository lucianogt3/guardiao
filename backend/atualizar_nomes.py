import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# Lista todas as tabelas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tabelas = cursor.fetchall()
print("Tabelas encontradas:", [t[0] for t in tabelas])

# Tenta acessar 'usuario' (singular)
try:
    cursor.execute("SELECT id, nome, matricula FROM usuario")
    usuarios = cursor.fetchall()
    print(f"\nTabela 'usuario' tem {len(usuarios)} registros:")
    for u in usuarios:
        print(f"  ID {u[0]}: nome='{u[1]}', matrícula='{u[2]}'")
except sqlite3.OperationalError as e:
    print(f"Erro na tabela 'usuario': {e}")

# Tenta acessar 'usuarios' (plural)
try:
    cursor.execute("SELECT id, nome, matricula FROM usuarios")
    usuarios = cursor.fetchall()
    print(f"\nTabela 'usuarios' tem {len(usuarios)} registros:")
    for u in usuarios:
        print(f"  ID {u[0]}: nome='{u[1]}', matrícula='{u[2]}'")
except sqlite3.OperationalError as e:
    print(f"Erro na tabela 'usuarios': {e}")

conn.close()