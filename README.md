# 💈 YerysBarber - Progressive Web App (PWA) de Gestión de Citas

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Telegram API](https://img.shields.io/badge/Telegram_API-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

YerysBarber es una aplicación web progresiva (PWA) desarrollada a medida para la digitalización y automatización de las reservas de una barbería profesional. Diseñada bajo una arquitectura Serverless, elimina la necesidad de gestión manual de la agenda, optimizando el tiempo del negocio y mejorando la experiencia del cliente.

## 🚀 Características Principales

### Para el Cliente (Experiencia de Usuario)
* **Instalable (PWA):** Posibilidad de instalar la aplicación directamente en el escritorio del móvil (iOS y Android) ofreciendo una experiencia de App Nativa.
* **Autenticación Segura:** Sistema de login y registro gestionado mediante Firebase Auth.
* **Reserva Dinámica:** Calendario interactivo (Angular Material) que consulta en tiempo real la disponibilidad de la base de datos, bloqueando días pasados y limitando la reserva a un máximo de 2 meses vista.
* **Control Anti-Spam:** Regla de negocio implementada que limita a 6 el número máximo de citas activas por usuario para prevenir bloqueos malintencionados de la agenda.

### Para el Administrador (Yeray)
* **Notificaciones Push Inmediatas:** Integración directa con la API de Telegram. Cada nueva reserva genera una alerta instantánea en el dispositivo móvil del administrador.
* **Panel de Gestión (Dashboard):** Interfaz exclusiva para el rol de administrador (`ADMIN_EMAIL`) con control total sobre las citas (confirmar, cancelar, completar).
* **Control Horario:** Capacidad de modificar el horario semanal, establecer días de vacaciones y bloquear tramos horarios específicos desde la propia aplicación.
* **Analíticas de Negocio:** Contador en tiempo real del número total de servicios completados.

## 🛠️ Stack Tecnológico

* **Frontend:** Angular 21 (Standalone Components), HTML5, SCSS, Angular Material.
* **Backend as a Service (BaaS):** Firebase (Firestore Database, Authentication).
* **Integraciones:** Telegram Bot API (HttpClient).
* **Despliegue:** Vercel (Configurado con `vercel.json` para enrutamiento SPA).

## ⚙️ Reglas de Seguridad (Firestore Rules)
El proyecto cuenta con un sistema estricto de reglas de seguridad en la nube:
* Los usuarios solo pueden visualizar las horas disponibles (lectura pública limitada) y crear sus propias citas.
* Solo el rol de Administrador tiene privilegios de escritura sobre la configuración global de la barbería (`settings/general`) y capacidad de alterar el estado de las citas de terceros.

## 💻 Instalación y Despliegue en Local

Para clonar y ejecutar este proyecto en un entorno local:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/yerysbarber.git](https://github.com/tu-usuario/yerysbarber.git)
   cd yerysbarber

   npm install

   Configurar Variables de Entorno:
Debes crear tus propios archivos environment.ts y environment.development.ts en src/environments/ e incluir tus credenciales de Firebase y el Token de tu Bot de Telegram:

TypeScript
export const environment = {
  production: false,
  firebase: {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
  },
  telegram: {
    botToken: "TU_TELEGRAM_BOT_TOKEN",
    chatId: "TU_ADMIN_CHAT_ID"
  }
};
Ejecutar el servidor de desarrollo:

Bash
ng serve -o
🌐 Despliegue en Producción
Este proyecto está optimizado para su despliegue en Vercel. Asegúrate de incluir el archivo vercel.json en el directorio compilado (browser) para el correcto manejo de las rutas en la Single Page Application (SPA):

JSON
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
Comando de despliegue directo con Vercel CLI:

Bash
vercel deploy dist/yerysbarber/browser --prod