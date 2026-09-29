# Política de privacidad de Kavalo (borrador para el lanzamiento)

*Resumen para personas; la versión legal definitiva debe revisarla un profesional antes de publicar.*

1. **Privacidad por defecto.** Sin cuenta, sin anuncios y sin rastreadores. Todo el progreso se
   guarda en tu dispositivo (almacenamiento local del navegador).
2. **Mínima recopilación.** Solo se guardan datos de entrenamiento: partidas, ejercicios,
   errores, progreso, ajustes y, si lo das, un nombre. Nunca ubicación, contactos ni
   identificadores publicitarios. El análisis con Stockfish se hace en tu dispositivo.
3. **Copia en la nube opcional.** Solo con tu consentimiento explícito (Ajustes → Privacidad).
   Se envía tu perfil de entrenamiento al servidor que elijas, con una cuenta de invitado sin
   email. Si vinculas un email, el servidor guarda solo su huella (SHA-256), no el email en claro.
   Los tokens de acceso se guardan cifrados con SHA-256. No se guarda la IP.
4. **Exportación.** Puedes descargar todos tus datos en JSON (y tus partidas en PGN) en
   cualquier momento, desde la app y desde el servidor (`GET /v1/export`).
5. **Eliminación.** «Borrar todos mis datos» borra el dispositivo; «Desactivar y borrar mis datos
   del servidor» borra la cuenta y todo su contenido de inmediato (`DELETE /v1/account`).
6. **Consentimiento.** Nada sale del dispositivo sin tu permiso. Puedes retirarlo cuando quieras.
7. **Protección infantil.** El modo niños no tiene chat ni contacto con desconocidos, no muestra
   publicidad y exige el consentimiento de madre, padre o tutor para activar la copia en la nube.
   Las funciones sociales futuras (amigos, clubes, torneos; brief §88) llegarán con controles
   parentales y moderación antes de abrirse a menores.
8. **Contacto y responsable.** Se completará con los datos del titular antes del lanzamiento.
