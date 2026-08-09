# Dashboard Sigpal — Licitaciones Bot

## Qué es esto
La app web del dashboard de configuración (rubros, montos, precios, horarios,
historial y sugerencias). Guarda tu configuración en el navegador
automáticamente (localStorage) — no necesitas backend para empezar a usarla.

## Cómo publicarla (gratis, con Vercel)

1. Sube esta carpeta completa a un repositorio de GitHub (igual como hicimos
   con `licitaciones-bot`, pero este es un proyecto nuevo — puedes llamarlo
   `sigpal-dashboard`).
2. Ve a vercel.com y crea una cuenta (puedes usar tu cuenta de GitHub para
   entrar directo, sin crear otra contraseña).
3. Clic en "Add New..." → "Project".
4. Elige el repositorio `sigpal-dashboard` que acabas de subir.
5. Vercel detecta automáticamente que es un proyecto Vite/React — no toques
   nada de la configuración, solo clic en "Deploy".
6. En 1-2 minutos te da una URL como `sigpal-dashboard.vercel.app` — esa es
   tu dashboard, accesible desde cualquier navegador, PC o celular.

## Importante sobre la configuración
- Los cambios que hagas en el dashboard se guardan en el navegador donde lo
  abras. Si entras desde otro dispositivo o borras el caché, no vas a ver los
  mismos datos — todavía no hay una base de datos compartida entre el
  dashboard y el motor del bot.
- Próximo paso pendiente: conectar esto a una base de datos real para que el
  motor (`motor_licitaciones.py` en GitHub Actions) lea automáticamente lo
  que configures acá, en vez de tener que copiar los valores a mano.
