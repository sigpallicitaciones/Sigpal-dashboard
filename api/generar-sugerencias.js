// api/generar-sugerencias.js
//
// Genera sugerencias REALES (ya no de ejemplo) para la pestaña
// "Sugerencias" del dashboard. Lee el historial real de cotizaciones
// (historial_cotizaciones.json — solo tiene cotizaciones que llegaron a
// "aprobada", con su resultado ganada/perdida/pendiente), las
// descartadas (licitaciones_descartadas.json — solo código y fecha, sin
// detalle de rubro/score) y la configuración actual (config.json), y le
// pide a Claude que compare eso contra el criterio configurado y
// proponga ajustes concretos.
//
// OJO — esto NO cambia nada solo: guarda las sugerencias en
// sugerencias.json para que el dashboard las muestre, pero la decisión
// de aplicar cualquier ajuste (rubro, precio, sensibilidad) la sigue
// tomando la persona a mano en su sección correspondiente. Ver nota en
// la pestaña del dashboard.

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ARCHIVO_HISTORIAL = "historial_cotizaciones.json";
const ARCHIVO_DESCARTADAS = "licitaciones_descartadas.json";
const ARCHIVO_CONFIG = "config.json";
const ARCHIVO_SUGERENCIAS = "sugerencias.json";

async function leerArchivoGithub(githubToken, ruta) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ruta}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  if (resp.status === 404) return { contenido: null, sha: null };
  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`No se pudo leer ${ruta}: ${resp.status} ${detalle}`);
  }
  const data = await resp.json();
  const contenido = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
  return { contenido, sha: data.sha };
}

async function guardarArchivoGithub(githubToken, ruta, contenidoObj, sha, mensaje) {
  const body = {
    message: mensaje,
    content: Buffer.from(JSON.stringify(contenidoObj, null, 2), "utf-8").toString("base64"),
  };
  if (sha) body.sha = sha;
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ruta}`,
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
    throw new Error(`No se pudo guardar ${ruta}: ${resp.status} ${detalle}`);
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Usa POST para generar sugerencias." });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!githubToken || !anthropicKey) {
    return res.status(500).json({ error: "Falta configurar GITHUB_TOKEN o ANTHROPIC_API_KEY en Vercel." });
  }

  try {
    const [{ contenido: historial }, { contenido: descartadas }, { contenido: config }] = await Promise.all([
      leerArchivoGithub(githubToken, ARCHIVO_HISTORIAL),
      leerArchivoGithub(githubToken, ARCHIVO_DESCARTADAS),
      leerArchivoGithub(githubToken, ARCHIVO_CONFIG),
    ]);

    const historialLista = historial || [];
    const descartadasLista = descartadas || [];
    const conResultado = historialLista.filter((r) => r.resultado === "ganada" || r.resultado === "perdida");

    // Con muy pocos datos, cualquier sugerencia que arme un LLM va a ser
    // básicamente inventada. Mejor decirlo derecho que fingir análisis.
    if (conResultado.length < 3) {
      const resultadoPobre = {
        sugerencias: [],
        generadas_en: new Date().toISOString(),
        datos_insuficientes: true,
        mensaje: `Todavía hay muy pocas licitaciones con resultado conocido (${conResultado.length} de ${historialLista.length} cotizaciones enviadas) para sacar patrones confiables. Con más historial (licitaciones ganadas o perdidas), las sugerencias van a ser mucho más útiles.`,
      };
      await guardarArchivoGithub(
        githubToken, ARCHIVO_SUGERENCIAS, resultadoPobre, null,
        "Sugerencias: datos insuficientes"
      );
      return res.status(200).json(resultadoPobre);
    }

    const resumenHistorial = historialLista.map((r) => ({
      nombre: r.nombre,
      rubro: r.rubro,
      score: r.score,
      decision: r.decision,
      resultado: r.resultado,
    }));

    const systemPrompt = `Eres un analista que ayuda a Sigpal Soluciones SpA (empresa chilena de \
metalmecánica, tableros eléctricos, energía solar FV, servicios industriales \
y generadores) a mejorar el criterio de su bot de detección de licitaciones \
en Mercado Público.

Te paso tres cosas:
1. El historial real de cotizaciones que se enviaron (con su rubro, el \
puntaje que les dio el bot, y si al final se ganaron, se perdieron, o \
siguen pendientes).
2. La cantidad de licitaciones descartadas recientemente (sin detalle de \
rubro, es solo un conteo — no asumas nada específico sobre por qué se \
descartaron más allá del número).
3. La configuración actual del bot (rubros, palabras clave, precios base, \
sensibilidad, zonas), tal como está guardada.

Tu tarea: proponer entre 2 y 5 sugerencias CONCRETAS y basadas ÚNICAMENTE \
en los datos reales que te paso — nunca inventes cifras de mercado, \
licitaciones específicas que no estén en los datos, ni asumas cosas que no \
puedas respaldar con lo que ves. Si los datos no alcanzan para una \
categoría de sugerencia (por ejemplo, no hay suficiente info de precios \
para comentar precios), simplemente no la incluyas.

Responde SOLO con un array JSON (nada de texto antes o después, sin \
bloques de código markdown), donde cada elemento tiene esta forma exacta:
{"id": <número>, "tipo": "ajuste" | "oportunidad" | "precio", "titulo": \
"<frase corta>", "detalle": "<1-3 oraciones explicando el patrón real \
detectado y por qué importa>", "accion": "<dónde revisar esto en el \
dashboard, ej. 'Revisar en Rubros' o 'Revisar en Precios Base'>"}`;

    const mensajeUsuario = JSON.stringify({
      historial_cotizaciones: resumenHistorial,
      cantidad_descartadas_recientes: descartadasLista.length,
      configuracion_actual: config || {},
    });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: mensajeUsuario }],
      }),
    });

    if (!resp.ok) {
      const detalle = await resp.text();
      return res.status(502).json({ error: `Error llamando a Claude: ${resp.status} ${detalle}` });
    }

    const data = await resp.json();
    const textoRespuesta = data?.content?.[0]?.text || "[]";
    const limpio = textoRespuesta.replace(/```json|```/g, "").trim();

    let sugerenciasGeneradas;
    try {
      sugerenciasGeneradas = JSON.parse(limpio);
    } catch (e) {
      return res.status(502).json({ error: "Claude no devolvió JSON válido.", crudo: textoRespuesta });
    }

    const resultado = {
      sugerencias: sugerenciasGeneradas,
      generadas_en: new Date().toISOString(),
      datos_insuficientes: false,
      basado_en: { cotizaciones_con_resultado: conResultado.length, total_historial: historialLista.length },
    };

    const { sha: shaActual } = await leerArchivoGithub(githubToken, ARCHIVO_SUGERENCIAS);
    await guardarArchivoGithub(
      githubToken, ARCHIVO_SUGERENCIAS, resultado, shaActual,
      "Regenerar sugerencias (dashboard)"
    );

    return res.status(200).json(resultado);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
};
