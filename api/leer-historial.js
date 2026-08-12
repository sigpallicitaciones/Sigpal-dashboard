// Este endpoint lee historial_cotizaciones.json desde el repo
// licitaciones-bot en GitHub, para que el dashboard pueda mostrar el
// historial real de cotizaciones (enviadas, ganadas, perdidas).
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = "sigpallicitaciones";
  const REPO = "licitaciones-bot";
  const FILE_PATH = "historial_cotizaciones.json";

  if (!GITHUB_TOKEN) {
    return res.status(500).json({
      error: "Falta configurar GITHUB_TOKEN en las variables de entorno de Vercel.",
    });
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    // Si el archivo todavía no existe (no se ha aprobado ninguna
    // cotización todavía), devolvemos una lista vacía en vez de un error.
    if (resp.status === 404) {
      return res.status(200).json({ historial: [] });
    }

    if (!resp.ok) {
      const detalle = await resp.text();
      return res.status(resp.status).json({ error: "No se pudo leer el historial", detalle });
    }

    const data = await resp.json();
    const contenido = Buffer.from(data.content, "base64").toString("utf-8");
    const historial = JSON.parse(contenido);

    return res.status(200).json({ historial });
  } catch (err) {
    return res.status(500).json({ error: "Error al contactar GitHub", detalle: String(err) });
  }
}
