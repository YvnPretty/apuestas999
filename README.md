# 🚀 South Park Prediction Market MVP

Un mercado de predicciones en tiempo real inspirado en South Park, donde los usuarios pueden apostar sobre eventos futuros utilizando una interfaz premium con estética **Glassmorphism**.

## 🛠️ Tecnologías
- **Frontend:** React + Vite + Recharts (Gráficos en tiempo real).
- **Backend:** Node.js + WebSockets (Transmisión de datos en vivo).
- **Motor de Emparejamiento:** Python (Algoritmo de Prioridad Precio-Tiempo).

## 🚀 Despliegue
La interfaz está desplegada en:
[https://YvnPretty.github.io/apuestas999/](https://YvnPretty.github.io/apuestas999/)

> **Nota:** Para que el trading funcione, el backend debe estar corriendo localmente o en un servidor compatible con WebSockets.

## 📦 Estructura del Proyecto
- `/frontend`: Código fuente de la interfaz React.
- `/backend`: Servidor Node.js y lógica de WebSockets.
- `motor_apuestas.py`: Prototipo del motor de emparejamiento con resolución de saldos.

## 🔧 Instalación Local
1. Clona el repo.
2. En `/backend`: `npm install && node server.js`
3. En `/frontend`: `npm install && npm run dev`
4. Ejecuta el motor: `python motor_apuestas.py`
