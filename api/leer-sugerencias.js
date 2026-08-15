// api/leer-sugerencias.js
//
// Lee sugerencias.json del repo licitaciones-bot y lo devuelve tal cual.
// No llama a Claude ni hace ningún análisis — eso lo hace
// /api/generar-sugerencias, que es el que efectivamente escribe este
// archivo. Este endpoint es solo para que la pestaña "Sugerencias" del
// dashboard muestre lo último generado sin tener que re-analizar todo
// cada vez que alguien abre la pestaña (eso costaría una llamada a
// Claude por cada carga, innecesario).

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ARCHIVO = "sugerencias.json";

module.exports = async (req, res) => {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return res.status(500).json({ error: "Falta configurar GITHUB_TOKEN en Vercel." });
  }

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARCHIVO}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (resp.status === 404) {
      // Todavía no se generó ninguna sugerencia — no es un error, es el
      // estado inicial normal antes del primer "Generar sugerencias".
      return res.status(200).json({ sugerencias: [], generadas_en: null, nunca_generadas: true });
    }
    if (!resp.ok) {
      const detalle = await resp.text();
      return res.status(502).json({ error: `No se pudo leer ${ARCHIVO}: ${resp.status} ${detalle}` });
    }

    const data = await resp.json();
    const contenido = Buffer.from(data.content, "base64").toString("utf-8");
    const parsed = JSON.parse(contenido);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
