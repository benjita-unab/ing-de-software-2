#!/bin/bash
# 🚀 SCRIPT DE INICIO RÁPIDO - Sistema de Monitoreo de Licencias
# 
# Este script automatiza los primeros pasos de instalación
# Uso: bash ./INIT_SETUP.sh
#
# ⚠️ IMPORTANTE: Edita este script y agrega tus credenciales Supabase

echo "════════════════════════════════════════════════════════"
echo "    🚀 INICIALIZACIÓN DEL SISTEMA DE MONITOREO"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────
# PASO 1: Backend Setup
# ─────────────────────────────────────────────────────────

echo -e "${BLUE}📦 PASO 1: Configurando Backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Creando archivo .env desde .env.example${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 IMPORTANTE: Edita backend/.env con tus credenciales de Supabase${NC}"
    echo -e "${YELLOW}   - SUPABASE_URL: Tu URL de proyecto${NC}"
    echo -e "${YELLOW}   - SUPABASE_SERVICE_KEY: Tu service key${NC}"
    read -p "Presiona ENTER cuando hayas completado backend/.env"
fi

echo -e "${GREEN}✅ Backend .env configurado${NC}"
echo ""
echo -e "${BLUE}📚 Instalando dependencias del backend...${NC}"
npm install
echo -e "${GREEN}✅ Dependencias del backend instaladas${NC}"
echo ""

# ─────────────────────────────────────────────────────────
# PASO 2: Frontend Setup
# ─────────────────────────────────────────────────────────

echo -e "${BLUE}📦 PASO 2: Configurando Frontend...${NC}"
cd ..

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Creando archivo .env en raíz${NC}"
    cat > .env << EOF
# Configuración del Frontend
REACT_APP_SUPABASE_URL=https://TU-PROYECTO.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...TU-KEY...
REACT_APP_BACKEND_URL=http://localhost:3001
EOF
    echo -e "${YELLOW}📝 IMPORTANTE: Edita ./.env con tus credenciales${NC}"
    read -p "Presiona ENTER cuando hayas completado ./.env"
fi

echo -e "${GREEN}✅ Frontend .env configurado${NC}"
echo ""
echo -e "${BLUE}📚 Instalando dependencias del frontend...${NC}"
npm install
echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"
echo ""

# ─────────────────────────────────────────────────────────
# PASO 3: Information
# ─────────────────────────────────────────────────────────

echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ INSTALACIÓN COMPLETADA${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📋 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1️⃣  EJECUTAR MIGRACIONES EN SUPABASE:"
echo "   • Ve a: https://supabase.com → Tu Proyecto → SQL Editor"
echo "   • Abre: ./MIGRACIONES_ALERTAS.sql"
echo "   • Copia y pega el contenido"
echo "   • Hit: Ejecutar"
echo ""
echo "2️⃣  INICIAR BACKEND (Terminal 1):"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "3️⃣  INICIAR FRONTEND (Terminal 2):"
echo "   npm start"
echo ""
echo "4️⃣  INTEGRAR COMPONENTE EN App.js:"
echo "   Abre: ./EJEMPLO_INTEGRACION_APP.jsx para ver cómo"
echo ""
echo -e "${BLUE}📚 DOCUMENTACIÓN:${NC}"
echo "   • RESUMEN_IMPLEMENTACION.md - Resumen ejecutivo"
echo "   • GUIA_INSTALACION.md - Guía completa"
echo "   • INDICE_ARCHIVOS.md - Índice de archivos"
echo ""
echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 ¡Sistema listo para usar!${NC}"
echo "════════════════════════════════════════════════════════"
