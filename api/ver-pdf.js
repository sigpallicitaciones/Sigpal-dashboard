// api/ver-pdf.js
//
// Sirve el PDF de una cotización guardado en pdfs/{codigo}.pdf (o
// pdfs/{codigo}_APROBADA.pdf) del repo licitaciones-bot. Antes esto no
// existía: el PDF se generaba en /tmp de GitHub Actions y se perdía
// apenas terminaba la corrida — nunca quedaba nada permanente que el
// dashboard pudiera mostrar. Ahora motor_licitaciones.py sube una copia
// al repo cada vez que genera un PDF (ver _persistir_pdf), y este
// endpoint la lee de ahí y la devuelve como PDF real, no como JSON.
//
// Uso: /api/ver-pdf?codigo=682968-13-COT26           (borrador)
//      /api/ver-pdf?codigo=682968-13-COT26&aprobada=1 (versión aprobada)

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";

export default async function handler(req, res) {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return res.status(500).json({ error: "Falta configurar GITHUB_TOKEN en Vercel." });
  }

  const codigo = req.query.codigo;
  if (!codigo) {
    return res.status(400).json({ error: "Falta el parámetro 'codigo'." });
  }
  const sufijo = req.query.aprobada ? "_APROBADA" : "";
  const ruta = `pdfs/${codigo}${sufijo}.pdf`;

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(ruta)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (resp.status === 404) {
      return res.status(404).json({
        error: `Todavía no hay un PDF guardado para ${codigo}${sufijo ? " (aprobada)" : ""}. `
          + "Puede ser una cotización de antes de este cambio — regenérala por WhatsApp "
          + "(escribe 'muéstrame la cotización') para que quede guardada.",
      });
    }
    if (!resp.ok) {
      const detalle = await resp.text();
      return res.status(502).json({ error: `No se pudo leer ${ruta}: ${resp.status} ${detalle}` });
    }

    const data = await resp.json();
    const bufferPdf = Buffer.from(data.content, "base64");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Cotizacion_${codigo}${sufijo}.pdf"`);
    return res.status(200).send(bufferPdf);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
