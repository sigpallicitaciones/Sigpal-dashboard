// Esta función corre en el servidor de Vercel (no en el navegador del
// usuario), así que puede usar el token de GitHub sin exponerlo nunca al
// público. El dashboard le llama desde el botón "Buscar ahora".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = "sigpallicitaciones";
  const REPO = "licitaciones-bot";
  const WORKFLOW_FILE = "motor.yml";

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: "Falta configurar GITHUB_TOKEN en las variables de entorno de Vercel.",
    });
  }

  let fecha = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    fecha = body?.fecha || "";
  } catch {
    fecha = "";
  }

  // Validación básica del formato ddmmaaaa, si es que se especificó una fecha
  if (fecha && !/^\d{8}$/.test(fecha)) {
    return res.status(400).json({ error: "Formato de fecha inválido. Usa ddmmaaaa, ej. 05082026." });
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: { fecha },
        }),
      }
    );

    if (resp.status === 204) {
      return res.status(200).json({ ok: true, fecha: fecha || "hoy" });
    }

    const detalle = await resp.text();
    return res.status(resp.status).json({ error: "GitHub rechazó la solicitud", detalle });
  } catch (err) {
    return res.status(500).json({ error: "Error al contactar a GitHub", detalle: String(err) });
  }
}
