#!/bin/bash
# Script de despliegue optimizado para Ubuntu Server
# Uso: sudo bash deploy.sh

set -e

echo "--- Iniciando Despliegue en Ubuntu Server ---"

# 1. Instalar dependencias base
apt update
apt install -y docker.io nginx git

# 2. Configurar Nginx
echo "Configurando Nginx como proxy inverso..."
cp ./nginx.conf /etc/nginx/sites-available/mikrotik-app
ln -sf /etc/nginx/sites-available/mikrotik-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
echo "Nginx configurado correctamente."

# 3. Preparar estructura VPN
echo "Preparando estructura para servicios VPN..."
mkdir -p /etc/ppp/peers
mkdir -p /opt/mikrotik-app/vpn-configs
# Aquí puedes agregar lógica futura para configurar interfaces de túneles
echo "Estructura para servicios VPN creada en /opt/mikrotik-app/vpn-configs"

echo "--- Despliegue finalizado ---"
echo "Recuerda ejecutar: docker build -t mi-app-mikrotik . && docker run -d -p 3000:3000 --env-file .env --name mikrotik-app mi-app-mikrotik"
