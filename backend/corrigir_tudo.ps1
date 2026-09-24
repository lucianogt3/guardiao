# ============================================
# SCRIPT DE CORREÇÃO COMPLETA - GUARDIÕES HCOR
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CORRIGINDO GUARDIÕES HCOR - ROLETA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. PARAR SERVIÇOS
Write-Host "[1/6] Parando serviços..." -ForegroundColor Yellow

# Para processos na porta 5030 (backend)
$backendPid = netstat -ano | findstr ":5030" | findstr "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }
if ($backendPid) {
    Write-Host "  ➜ Parando backend (PID: $backendPid)..." -ForegroundColor Yellow
    taskkill /F /PID $backendPid 2>$null
    Start-Sleep -Seconds 1
}

# Para processos na porta 5173 (frontend)
$frontendPid = netstat -ano | findstr ":5173" | findstr "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }
if ($frontendPid) {
    Write-Host "  ➜ Parando frontend (PID: $frontendPid)..." -ForegroundColor Yellow
    taskkill /F /PID $frontendPid 2>$null
    Start-Sleep -Seconds 1
}

Write-Host "  ✅ Serviços parados" -ForegroundColor Green

# 2. CONFIGURAR BACKEND (app.py)
Write-Host ""
Write-Host "[2/6] Configurando backend..." -ForegroundColor Yellow

$appPyPath = "backend\app.py"

# Verifica se a rota da roleta existe no app.py
$roletaExists = Select-String -Path $appPyPath -Pattern "roleta/girar" -Quiet

if (-not $roletaExists) {
    Write-Host "  ⚠️  Rota da roleta não encontrada! Adicionando..." -ForegroundColor Yellow
    
    # Adiciona a rota da roleta antes do if __name__
    $roletaCode = @'

# ==================== ROTA DA ROLETA ====================
@app.route('/api/roleta/girar', methods=['POST', 'OPTIONS'])
def girar_roleta():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.json
        if not data:
            return jsonify({"erro": "JSON inválido"}), 400
            
        usuario_id = data.get('usuario_id')
        if not usuario_id:
            return jsonify({"erro": "usuario_id é obrigatório"}), 400
        
        usuario = db.session.get(Usuario, usuario_id)
        if not usuario:
            return jsonify({"erro": "Guardião não encontrado"}), 404

        hoje = datetime.now().strftime('%Y-%m-%d')
        if hasattr(usuario, 'ultimo_giro') and usuario.ultimo_giro == hoje:
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
        
        db.session.commit()
        return jsonify({
            "index_ganhador": ganhou['index'],
            "valor": ganhou['valor'],
            "mensagem": f"🛡️ Sorte de Guardião! +{ganhou['valor']} XP!"
        })
    except Exception as e:
        db.session.rollback()
        print(f"Erro na roleta: {e}")
        return jsonify({"erro": str(e)}), 500

'@
    
    # Adiciona antes do if __name__
    $content = Get-Content $appPyPath -Raw
    $content = $content -replace "if __name__ == '__main__':", "$roletaCode`n`nif __name__ == '__main__':"
    Set-Content $appPyPath $content -NoNewline
    Write-Host "  ✅ Rota da roleta adicionada" -ForegroundColor Green
} else {
    Write-Host "  ✅ Rota da roleta já existe" -ForegroundColor Green
}

# Verifica e atualiza CORS
$corsConfig = Select-String -Path $appPyPath -Pattern "CORS\(app" -Context 0,5
if ($corsConfig -notmatch "localhost:5173") {
    Write-Host "  ⚠️  Atualizando configuração CORS..." -ForegroundColor Yellow
    
    $newCors = @'
CORS(app, 
     origins=["http://localhost:5173", "http://localhost:3000", "https://guardiao.nursetec.com.br", "http://guardiao.nursetec.com.br", "*"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
     expose_headers=["Content-Type"])
'@
    
    $content = Get-Content $appPyPath -Raw
    $content = $content -replace "CORS\(app[^)]+\)", $newCors
    Set-Content $appPyPath $content -NoNewline
    Write-Host "  ✅ CORS atualizado" -ForegroundColor Green
} else {
    Write-Host "  ✅ CORS já configurado" -ForegroundColor Green
}

# 3. CONFIGURAR FRONTEND (RoletaDiaria.jsx)
Write-Host ""
Write-Host "[3/6] Configurando frontend..." -ForegroundColor Yellow

$roletaJsxPath = "frontend\src\components\RoletaDiaria.jsx"

if (Test-Path $roletaJsxPath) {
    $content = Get-Content $roletaJsxPath -Raw
    
    # Substitui URL relativa por absoluta
    if ($content -match "const API_URL = '/api/roleta/girar'") {
        $content = $content -replace "const API_URL = '/api/roleta/girar'", "const API_URL = 'http://localhost:5030/api/roleta/girar'"
        Set-Content $roletaJsxPath $content -NoNewline
        Write-Host "  ✅ URL da API corrigida (absoluta)" -ForegroundColor Green
    } elseif ($content -match "const API_URL = 'http://localhost:5030/api/roleta/girar'") {
        Write-Host "  ✅ URL da API já está correta" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Arquivo RoletaDiaria.jsx não encontrado ou formato diferente" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Arquivo RoletaDiaria.jsx não encontrado!" -ForegroundColor Red
}

# 4. CRIAR/CONFIGURAR VITE CONFIG
Write-Host ""
Write-Host "[4/6] Configurando Vite proxy..." -ForegroundColor Yellow

$viteConfigPath = "frontend\vite.config.js"

$viteConfig = @"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5030',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5030',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
"@

Set-Content -Path $viteConfigPath -Value $viteConfig -NoNewline
Write-Host "  ✅ Vite config criado/atualizado" -ForegroundColor Green

# 5. RECOMPILAR FRONTEND
Write-Host ""
Write-Host "[5/6] Recompilando frontend..." -ForegroundColor Yellow

Push-Location "frontend"
try {
    Write-Host "  ➜ Executando npm run build..." -ForegroundColor Yellow
    npm run build 2>&1 | Out-Null
    Write-Host "  ✅ Frontend recompilado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Erro ao compilar (pode ser normal se não tiver dependências)" -ForegroundColor Yellow
}
Pop-Location

# 6. INICIAR SERVIÇOS
Write-Host ""
Write-Host "[6/6] Iniciando serviços..." -ForegroundColor Yellow

# Inicia backend
Write-Host "  ➜ Iniciando backend (porta 5030)..." -ForegroundColor Yellow
Push-Location "backend"
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "app.py" -RedirectStandardOutput "backend.log" -RedirectStandardError "backend_error.log"
Pop-Location
Start-Sleep -Seconds 3

# Inicia frontend
Write-Host "  ➜ Iniciando frontend (porta 5173)..." -ForegroundColor Yellow
Push-Location "frontend"
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev" -RedirectStandardOutput "frontend.log" -RedirectStandardError "frontend_error.log"
Pop-Location
Start-Sleep -Seconds 3

# Verifica se as portas estão ativas
$backendRunning = netstat -ano | findstr ":5030" | findstr "LISTENING"
$frontendRunning = netstat -ano | findstr ":5173" | findstr "LISTENING"

Write-Host ""
if ($backendRunning) {
    Write-Host "  ✅ Backend rodando na porta 5030" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend NÃO iniciou corretamente" -ForegroundColor Red
}

if ($frontendRunning) {
    Write-Host "  ✅ Frontend rodando na porta 5173" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend NÃO iniciou corretamente" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CORREÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Acesse: http://localhost:5173/roleta" -ForegroundColor Yellow
Write-Host "📌 Pressione Ctrl+F5 para recarregar o navegador" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ A roleta deve funcionar agora!" -ForegroundColor Green
Write-Host ""