// Webhook de WhatsApp — recibe mensajes entrantes y confirma la suscripción
// ante Meta. Dos tipos de peticiones:
//   GET  -> Meta llama esto UNA VEZ, al configurar el webhook, para verificar
//           que el endpoint es tuyo.
//   POST -> Meta llama esto cada vez que llega un mensaje nuevo al número
//           de WhatsApp del bot.

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ESTADO_FILE = "estado_whatsapp.json";

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
        const texto = mensaje.text?.body || "(mensaje sin texto, ej. imagen o audio)";
        const ahoraISO = new Date().toISOString();

        console.log(`Mensaje entrante de ${numero}: ${texto}`);

        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
          const { estado, sha } = await leerEstado(githubToken);
          estado[numero] = {
            ultima_interaccion: ahoraISO,
            ultimo_mensaje: texto,
          };
          await guardarEstado(githubToken, estado, sha);
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
