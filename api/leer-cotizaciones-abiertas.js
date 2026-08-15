// api/leer-cotizaciones-abiertas.js
//
// Lee estado_whatsapp.json y devuelve las cotizaciones que están
// "abiertas" (en curso, ya se les dijo "Ver" pero todavía no se
// aprobaron/enviaron) — esto vivía solo en el estado de WhatsApp y nunca
// se mostraba en el dashboard. Deduplica por código: si la misma
// cotización aparece abierta para más de un socio (normalmente van a
// coincidir, ya que las notificaciones les llegan a todos), se muestra
// una sola vez con la lista de a quién(es) les figura abierta.

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ARCHIVO = "estado_whatsapp.json";

export default async function handler(req, res) {
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
      return res.status(200).json({ abiertas: [] });
    }
    if (!resp.ok) {
      const detalle = await resp.text();
      return res.status(502).json({ error: `No se pudo leer ${ARCHIVO}: ${resp.status} ${detalle}` });
    }

    const data = await resp.json();
    const estado = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));

    const porCodigo = {};
    for (const [numero, entrada] of Object.entries(estado || {})) {
      const abiertas = entrada?.cotizaciones_abiertas || [];
      const activa = entrada?.cotizacion_activa || null;
      for (const c of abiertas) {
        if (!c?.codigo) continue;
        if (!porCodigo[c.codigo]) {
          porCodigo[c.codigo] = { codigo: c.codigo, nombre: c.nombre || "", socios: [] };
        }
        porCodigo[c.codigo].socios.push({ numero, es_activa: c.codigo === activa });
      }
    }

    const abiertas = Object.values(porCodigo);
    return res.status(200).json({ abiertas });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
