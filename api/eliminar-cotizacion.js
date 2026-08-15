// Elimina una cotización del historial (historial_cotizaciones.json).
// La confirmación de que quien lo pide de verdad tiene permiso se hace
// del lado del navegador (se pide la clave de acceso compartida antes
// de llamar a este endpoint, ver eliminarCotizacionHistorial en
// App.jsx) — este endpoint solo ejecuta el borrado en sí, no vuelve a
// pedir la clave porque el dashboard entero ya está protegido con ella.
//
// No se puede deshacer: la cotización simplemente desaparece del
// historial. El PDF guardado en pdfs/{codigo}_APROBADA.pdf NO se borra
// (se deja como respaldo, por si hace falta consultarlo después).

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ARCHIVO = "historial_cotizaciones.json";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Usa POST para eliminar una cotización." });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return res.status(500).json({ error: "Falta configurar GITHUB_TOKEN en Vercel." });
  }

  const { codigo } = req.body || {};
  if (!codigo) {
    return res.status(400).json({ error: "Falta el código de la cotización a eliminar." });
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
    if (!resp.ok) {
      const detalle = await resp.text();
      return res.status(502).json({ error: `No se pudo leer ${ARCHIVO}: ${resp.status} ${detalle}` });
    }

    const data = await resp.json();
    const historial = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));

    const nuevoHistorial = historial.filter((h) => h.codigo !== codigo);
    if (nuevoHistorial.length === historial.length) {
      return res.status(404).json({ error: `No se encontró la cotización ${codigo} en el historial.` });
    }

    const body = {
      message: `Eliminar cotización ${codigo} del historial (desde el dashboard)`,
      content: Buffer.from(JSON.stringify(nuevoHistorial, null, 2), "utf-8").toString("base64"),
      sha: data.sha,
    };
    const respGuardar = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ARCHIVO}`,
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
    if (!respGuardar.ok) {
      const detalle = await respGuardar.text();
      return res.status(502).json({ error: `No se pudo guardar ${ARCHIVO}: ${respGuardar.status} ${detalle}` });
    }

    return res.status(200).json({ ok: true, eliminado: codigo });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
