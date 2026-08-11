// Webhook de WhatsApp — recibe mensajes entrantes y confirma la suscripción
// ante Meta. Dos tipos de peticiones:
//   GET  -> Meta llama esto UNA VEZ, al configurar el webhook, para verificar
//           que el endpoint es tuyo.
//   POST -> Meta llama esto cada vez que llega un mensaje nuevo al número
//           de WhatsApp del bot.
//
// Lógica de notificaciones activas/pausadas:
//   - Si el socio toca el botón "No" de la plantilla -> se marca
//     notificaciones_activas = false. El motor deja de mandarle avisos
//     automáticos por WhatsApp hasta que vuelva a escribir algo.
//   - Si el socio toca "Sí", o escribe cualquier texto libre (incluso
//     estando pausado) -> se marca notificaciones_activas = true, y se le
//     avisa al motor (vía repository_dispatch) por si hay un mensaje
//     completo pendiente para mandarle ahora que la ventana de 24h recién
//     se abrió.

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ESTADO_FILE = "estado_whatsapp.json";

// Quita tildes y pasa a minúsculas, para comparar texto de botones sin
// depender de mayúsculas/acentos exactos.
function normalizarTexto(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Lee el archivo de estado actual desde GitHub (o devuelve uno vacío si
// todavía no existe).
async function leerEstado(githubToken) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ESTADO_FILE}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (resp.status === 404) {
    return { estado: {}, sha: null }; // el archivo aún no existe
  }
  if (!resp.ok) {
    throw new Error(`No se pudo leer ${ESTADO_FILE}: ${resp.status}`);
  }
  const data = await resp.json();
  const contenido = Buffer.from(data.content, "base64").toString("utf-8");
  return { estado: JSON.parse(contenido), sha: data.sha };
}

// Sube el archivo de estado actualizado a GitHub.
async function guardarEstado(githubToken, estado, sha) {
  const contenidoBase64 = Buffer.from(
    JSON.stringify(estado, null, 2),
    "utf-8"
  ).toString("base64");

  const body = {
    message: "Actualizar estado_whatsapp.json (interacción entrante)",
    content: contenidoBase64,
  };
  if (sha) body.sha = sha;

  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ESTADO_FILE}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`No se pudo guardar ${ESTADO_FILE}: ${resp.status} ${detalle}`);
  }
}

// Avisa al motor (vía repository_dispatch) que revise si hay un mensaje
// completo pendiente para ese número y lo mande ahora que la ventana de
// 24h está abierta. Es seguro llamar esto siempre: si no hay nada
// pendiente, el motor simplemente no hace nada.
async function dispararMensajePendiente(githubToken, numero) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "enviar_mensaje_pendiente",
        client_payload: { numero },
      }),
    }
  );
  if (!resp.ok) {
    const detalle = await resp.text();
    console.error(
      `No se pudo disparar enviar_mensaje_pendiente para ${numero}: ${resp.status} ${detalle}`
    );
  } else {
    console.log(`Disparo enviar_mensaje_pendiente enviado para ${numero}.`);
  }
}

export default async function handler(req, res) {
  // --- Verificación del webhook (Meta llama esto solo al configurarlo) ---
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Token de verificación inválido.");
  }

  // --- Mensajes entrantes ---
  if (req.method === "POST") {
    try {
      const body = req.body;
      const entry = body?.entry?.[0];
      const cambio = entry?.changes?.[0]?.value;
      const mensajes = cambio?.messages;

      if (mensajes && mensajes.length > 0) {
        const mensaje = mensajes[0];
        const numero = mensaje.from; // número del que escribió, sin '+'
        const tipo = mensaje.type; // "text", "button", "interactive", etc.
        const ahoraISO = new Date().toISOString();

        // Determina qué pasó: texto libre normal, o respuesta a un botón
        // de la plantilla (Quick Reply "Sí" / "No").
        let texto = "(mensaje sin texto, ej. imagen o audio)";
        let esRespuestaNo = false;

        if (tipo === "text") {
          texto = mensaje.text?.body || texto;
        } else if (tipo === "button") {
          // Respuesta a un botón de una plantilla de mensaje.
          texto = mensaje.button?.text || "(botón sin texto)";
          const payloadNorm = normalizarTexto(mensaje.button?.payload);
          const textoNorm = normalizarTexto(mensaje.button?.text);
          if (payloadNorm.includes("no") || textoNorm === "no") {
            esRespuestaNo = true;
          }
        } else if (tipo === "interactive") {
          // Respuesta a un botón de un mensaje interactivo (no plantilla).
          texto = mensaje.interactive?.button_reply?.title || "(respuesta interactiva)";
          const tituloNorm = normalizarTexto(texto);
          if (tituloNorm === "no") {
            esRespuestaNo = true;
          }
        }

        console.log(`Mensaje entrante de ${numero} (${tipo}): ${texto}`);

        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
          const { estado, sha } = await leerEstado(githubToken);
          const entradaPrevia = estado[numero] || {};

          const nuevaEntrada = {
            ...entradaPrevia,
            "última_interacción": ahoraISO,
            "último_mensaje": texto,
            "notificaciones_activas": !esRespuestaNo,
          };

          estado[numero] = nuevaEntrada;
          await guardarEstado(githubToken, estado, sha);

          // Si tocó "No", no avisamos al motor — no queremos mandarle el
          // mensaje pendiente justo después de que dijo que no quería.
          // Para cualquier otra interacción (botón "Sí" o texto libre),
          // avisamos al motor por si hay algo pendiente para enviar ahora.
          if (!esRespuestaNo) {
            await dispararMensajePendiente(githubToken, numero);
          }
        }
      }

      // WhatsApp exige responder 200 rápido, o reintenta el envío del webhook.
      return res.status(200).send("OK");
    } catch (err) {
      console.error("Error procesando webhook de WhatsApp:", err);
      return res.status(200).send("OK"); // igual respondemos 200 para que Meta no reintente en loop
    }
  }

  return res.status(405).send("Método no permitido");
}
