// Gemelo de api/buscar.js, pero para el mecanismo de Compra Ágil (API
// distinta a la de Licitaciones — ver motor_licitaciones.py). Dispara el
// mismo workflow de GitHub Actions, pasando mecanismo=compra_agil para
// que el motor busque solo ahí (no en licitaciones).

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
          inputs: { fecha, mecanismo: "compra_agil" },
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
