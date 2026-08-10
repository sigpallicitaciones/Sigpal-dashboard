// Este endpoint recibe la configuración del dashboard y la sube a GitHub,
// actualizando config.json en el repo licitaciones-bot.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = "sigpallicitaciones";
  const REPO = "licitaciones-bot";
  const FILE_PATH = "config.json";

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: "Falta configurar GITHUB_TOKEN en las variables de entorno de Vercel.",
    });
  }

  let nuevaConfig;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    nuevaConfig = body?.config;
  } catch {
    return res.status(400).json({ error: "No se pudo interpretar la configuración enviada." });
  }

  if (!nuevaConfig) {
    return res.status(400).json({ error: "Falta el campo 'config' en la solicitud." });
  }

  try {
    // Paso 1: obtener el SHA actual del archivo (requerido por GitHub para actualizar)
    const getResp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!getResp.ok) {
      const detalle = await getResp.text();
      return res.status(getResp.status).json({ error: "No se pudo leer config.json actual", detalle });
    }

    const archivoActual = await getResp.json();
    const sha = archivoActual.sha;

    // Paso 2: subir el contenido nuevo, codificado en base64
    const contenidoBase64 = Buffer.from(
      JSON.stringify(nuevaConfig, null, 2),
      "utf-8"
    ).toString("base64");

    const putResp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Actualizar config.json desde el dashboard",
          content: contenidoBase64,
          sha: sha,
        }),
      }
    );

    if (putResp.status === 200 || putResp.status === 201) {
      return res.status(200).json({ ok: true });
    }

    const detalle = await putResp.text();
    return res.status(putResp.status).json({ error: "GitHub rechazó la actualización", detalle });
  } catch (err) {
    return res.status(500).json({ error: "Error al contactar GitHub", detalle: String(err) });
  }
}
