# Guía de Despliegue en Ubuntu Server

Esta guía explica cómo desplegar la aplicación utilizando Docker, la forma más robusta y segura de instalarla en producción.

## 1. Solución de errores comunes

### Firebase: Firestore API Denied
El error `PERMISSION_DENIED: Cloud Firestore API has not been used` indica que la API necesaria de base de datos no está activada en tu proyecto.
1. Visita [Google Cloud Console - APIs](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview).
2. Selecciona tu proyecto.
3. Haz clic en **Habilitar**.

### Conectividad MikroTik (Timeouts)
Si recibes `RosException: Timed out`, es probable que la IP de gestión del MikroTik sea privada (detrás de NAT) y no sea accesible desde el servidor Cloud.
*   **Solución**: Configura el **Túnel VPN (SSTP)** siguiendo la sección a continuación.

---

## 2. Automatización de VPN (SSTP)
Para permitir la gestión de dispositivos tras NAT, se requiere un concentrador VPN integrado en tu servidor Ubuntu. He proporcionado un script base en `/scripts/install-sstp.sh`.

### Pasos:
1. **Accede al servidor**: SSH en tu VPS.
2. **Ejecuta la instalación**:
   ```bash
   sudo bash /scripts/install-sstp.sh
   ```
3. **Recomendación de arquitectura**: Dada la complejidad de configurar un concentrador VPN desde cero en un entorno de producción compartido, se recomienda encarecidamente utilizar contenedores Docker aislados (ej. `siacs/softether`) para manejar las conexiones SSTP de tus MikroTiks.

---

## 3. Despliegue de la Aplicación

### Construcción y ejecución
```bash
sudo docker build -t mi-app-mikrotik .
sudo docker run -d -p 3000:3000 --env-file .env --name mikrotik-app --restart unless-stopped mi-app-mikrotik
```
