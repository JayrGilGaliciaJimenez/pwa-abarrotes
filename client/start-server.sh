#!/bin/bash

# Script para iniciar servidor HTTP simple para PWA
# Funciona mejor que Live Server para Service Workers

echo "🚀 Iniciando servidor HTTP en puerto 8000..."
echo "📱 Abre: http://localhost:8000"
echo "⏹️  Presiona Ctrl+C para detener"
echo ""

# Verificar si Python 3 está disponible
if command -v python3 &> /dev/null
then
    python3 -m http.server 8000
elif command -v python &> /dev/null
then
    python -m http.server 8000
else
    echo "❌ Python no está instalado"
    echo "Por favor instala Python o usa Live Server"
    exit 1
fi
