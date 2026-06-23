#!/bin/bash
# Script de instalación de servidor VPN (SSTP compatible)
# Ejecutar con privilegios de superusuario: sudo bash install-sstp.sh

set -e

echo "--- Iniciando instalación de servidor VPN ---"

# 1. Actualizar sistema
apt update && apt upgrade -y

# 2. Instalar herramientas necesarias
apt install -y curl wget git build-essential

# 3. Descargar e instalar SoftEther (una opción robusta y compatible con MikroTik)
# Esta es una versión simplificada, se recomienda configurar mediante el gestor web o herramienta de línea de comandos.
# Nota: La instalación automática completa de una VPN desde cero es altamente compleja.
# Se recomienda usar Docker para aislar la VPN si es posible.

echo "--- Instalación de dependencias completada ---"
echo "Recomendación: Utiliza contenedores Docker para VPN (ej. siacs/softether) para mayor estabilidad en Ubuntu."
echo "Configuración sugerida para tu entorno MikroTik: Habilitar SSTP/L2TP en el servidor."
