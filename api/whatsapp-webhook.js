// Webhook de WhatsApp — recibe mensajes entrantes y confirma la suscripción
// ante Meta. Dos tipos de peticiones:
//   GET  -> Meta llama esto UNA VEZ, al configurar el webhook, para verificar
//           que el endpoint es tuyo.
//   POST -> Meta llama esto cada vez que llega un mensaje nuevo al número
//           de WhatsApp del bot.
//
// Lógica de notificaciones activas/pausadas:
//   - Si el socio toca el botón "No" de la plantilla -> se marca
//     notificaciones_activas = false. El motor deja de mandarle avisos
//     automáticos por WhatsApp hasta que vuelva a escribir algo.
//   - Si el socio toca "Sí", o escribe cualquier texto libre (incluso
//     estando pausado) -> se marca notificaciones_activas = true, y se le
//     avisa al motor (vía repository_dispatch) por si hay un mensaje
//     completo pendiente para mandarle ahora que la ventana de 24h recién
//     se abrió.

const OWNER = "sigpallicitaciones";
const REPO = "licitaciones-bot";
const ESTADO_FILE = "estado_whatsapp.json";
const WHATSAPP_API_VERSION = "v20.0";

// Quita tildes y pasa a minúsculas, para comparar texto de botones sin
// depender de mayúsculas/acentos exactos.
function normalizarTexto(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
    const error = new Error(`No se pudo guardar ${ESTADO_FILE}: ${resp.status} ${detalle}`);
    error.status = resp.status;
    throw error;
  }
}

// Igual que guardarEstado, pero si choca con otro escritor concurrente
// (409, sha desactualizado — típicamente el motor Python guardando al
// mismo tiempo desde GitHub Actions) vuelve a leer el estado más
// reciente, reaplica SOLO los campos indicados en 'actualizarNumero'
// para ese número, y reintenta una vez más antes de rendirse. Evita que
// una interacción de WhatsApp se pierda en silencio por una carrera con
// el motor.
async function guardarEstadoConReintento(githubToken, estado, sha, numero, actualizarNumero) {
  try {
    await guardarEstado(githubToken, estado, sha);
  } catch (e) {
    if (e.status !== 409) throw e;
    console.warn(`Conflicto de sha guardando ${ESTADO_FILE}, reintentando con estado fresco...`);
    const { estado: estadoFresco, sha: shaFresco } = await leerEstado(githubToken);
    if (numero && actualizarNumero) {
      estadoFresco[numero] = { ...(estadoFresco[numero] || {}), ...actualizarNumero };
    }
    await guardarEstado(githubToken, estadoFresco, shaFresco);
  }
}

// Avisa al motor (vía repository_dispatch) que revise si hay un mensaje
// completo pendiente para ese número y lo mande ahora que la ventana de
// 24h está abierta. Es seguro llamar esto siempre: si no hay nada
// pendiente, el motor simplemente no hace nada.
async function dispararMensajePendiente(githubToken, numero) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "enviar_mensaje_pendiente",
        client_payload: { numero },
      }),
    }
  );
  if (!resp.ok) {
    const detalle = await resp.text();
    console.error(
      `No se pudo disparar enviar_mensaje_pendiente para ${numero}: ${resp.status} ${detalle}`
    );
  } else {
    console.log(`Disparo enviar_mensaje_pendiente enviado para ${numero}.`);
  }
}

// --- Envío de mensajes salientes por WhatsApp --------------------------

// Manda un mensaje de texto libre a un número por la API de WhatsApp
// Cloud. No lanza excepción si falla (solo loguea), para no interrumpir
// el resto del procesamiento del webhook por un error de notificación.
async function enviarMensajeWhatsApp(whatsappToken, whatsappPhoneId, numero, texto) {
  if (!whatsappToken || !whatsappPhoneId) {
    console.error("Falta WHATSAPP_TOKEN o WHATSAPP_PHONE_ID, no se pudo enviar respuesta.");
    return;
  }
  try {
    const resp = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: numero,
          type: "text",
          text: { body: texto },
        }),
      }
    );
    if (!resp.ok) {
      const detalle = await resp.text();
      console.error(`Error al enviar respuesta WhatsApp a ${numero}: ${resp.status} ${detalle}`);
    } else {
      console.log(`Respuesta enviada a ${numero}: ${texto}`);
    }
  } catch (err) {
    console.error(`Excepción al enviar respuesta WhatsApp a ${numero}:`, err);
  }
}

// Arma el texto de confirmación que se le manda al socio después de
// aplicar (o intentar aplicar) un cambio sobre la cotización.
// Arma el texto de confirmación que se le manda al socio después de
// aplicar (o intentar aplicar) un cambio sobre la cotización. "seAplico"
// viene de aplicarCambio() — es la única fuente de verdad sobre si el
// cambio realmente se guardó o no, así el mensaje nunca confirma algo
// que en realidad no pasó (ej. modificar un ítem que no existe).
// Arma un texto con la lista de cotizaciones que el socio tiene abiertas
// ahora mismo, marcando cuál está activa (la que se edita si escribe algo
// sin especificar). Se usa tanto para "listar_cotizaciones" como para
// cuando "cambiar_cotizacion_activa" no encuentra el código pedido.
function describirListaCotizaciones(cotizacionesAbiertas, codigoActivo) {
  if (!cotizacionesAbiertas || cotizacionesAbiertas.length === 0) {
    return "No tienes ninguna cotización abierta ahora mismo.";
  }
  const lineas = cotizacionesAbiertas.map((c) => {
    const marca = c.codigo === codigoActivo ? "👉 " : "• ";
    return `${marca}${c.nombre} (${c.codigo})`;
  });
  return `Tus cotizaciones abiertas:\n${lineas.join("\n")}\n\nPara cambiar de foco, dime algo como "cambia a la del generador" o dame el código.`;
}

function describirCambio(cambio, cotizacion, seAplico, cotizacionesAbiertas) {
  // Si hay más de una cotización abierta al mismo tiempo, cada respuesta
  // deja explícito a cuál se refiere — así un desajuste (ej. pedir "la
  // cotización" y que responda sobre una distinta a la que tenías en
  // mente) se nota altiro en el chat, sin tener que abrir el PDF.
  const otras = (cotizacionesAbiertas || []).filter((c) => c.codigo !== cotizacion.codigo);
  const sufijoContexto = otras.length > 0
    ? `\n\n(Sobre: ${cotizacion.nombre} — ${cotizacion.codigo}. Tienes ${otras.length} cotización(es) `
      + `más abierta(s); escribe "cuáles tengo abiertas" para verlas o "cambia a..." para editar otra.)`
    : "";

  if (!cambio || !cambio.accion) {
    return "No entendí bien esa instrucción. Puedes pedirme cosas como "
      + "\"sube la cantidad del ítem 2 a 6\" o \"agrega 10 metros de cable a $5.000 cada uno\"."
      + sufijoContexto;
  }

  if (cambio.accion === "modificar_item") {
    if (!seAplico) {
      const cantidad = (cotizacion[cambio.seccion] || []).length;
      return `No pude modificar el ítem ${cambio.indice + 1} de ${cambio.seccion} porque no existe `
        + `(esa sección tiene ${cantidad} ítem${cantidad === 1 ? "" : "s"} ahora mismo). `
        + `Si quieres agregarlo, dime algo como "agrega [descripción] a ${cambio.seccion}, `
        + `cantidad X, a $Y cada uno".` + sufijoContexto;
    }
    return `✅ Actualicé el campo "${cambio.campo}" del ítem ${cambio.indice + 1} `
      + `de ${cambio.seccion} a: ${cambio.valor_nuevo}.` + sufijoContexto;
  }
  if (cambio.accion === "agregar_item") {
    const desc = cambio.item?.descripcion || "el nuevo ítem";
    return (seAplico
      ? `✅ Agregué "${desc}" a ${cambio.seccion}.`
      : `No pude agregar "${desc}" a ${cambio.seccion}.`) + sufijoContexto;
  }
  if (cambio.accion === "eliminar_item") {
    if (!seAplico) {
      const cantidad = (cotizacion[cambio.seccion] || []).length;
      return `No pude eliminar el ítem ${cambio.indice + 1} de ${cambio.seccion} porque no existe `
        + `(esa sección tiene ${cantidad} ítem${cantidad === 1 ? "" : "s"} ahora mismo).` + sufijoContexto;
    }
    return `✅ Eliminé el ítem ${cambio.indice + 1} de ${cambio.seccion}.` + sufijoContexto;
  }
  if (cambio.accion === "aprobar_cotizacion") {
    return `✅ Cotización marcada como aprobada. Se está procesando el envío/registro.` + sufijoContexto;
  }
  if (cambio.accion === "generar_estimacion") {
    if (!seAplico) {
      return "No pude generar una estimación con esa información. Prueba dándome más detalle "
        + "del proyecto, o agrega los ítems uno por uno." + sufijoContexto;
    }
    const nMat = (cambio.materiales || []).length;
    const nMO = (cambio.mano_obra || []).length;
    return `✅ Armé una propuesta con ${nMat} ítem(s) de materiales y ${nMO} ítem(s) de mano de obra. `
      + `⚠️ Son valores ESTIMADOS de referencia según precios típicos del mercado — no son cotizaciones `
      + `reales de proveedores. Ajústalos si tienes precios concretos. Te reenvío el PDF actualizado.`
      + sufijoContexto;
  }
  if (cambio.accion === "ver_cotizacion") {
    return `📄 Te reenvío la cotización de "${cotizacion.nombre}" (${cotizacion.codigo}) en un momento.`
      + sufijoContexto;
  }
  if (cambio.accion === "sin_cambios") {
    return (cambio.motivo
      ? `No hice cambios: ${cambio.motivo}`
      : "No hice ningún cambio con ese mensaje.") + sufijoContexto;
  }
  return "Recibí tu mensaje, pero no pude aplicar un cambio con eso." + sufijoContexto;
}

// --- Cotizaciones: sesión editable por licitación ---------------------

// Lee el archivo de cotización de una licitación específica desde GitHub.
async function leerCotizacion(githubToken, codigo) {
  const ruta = `cotizaciones/${codigo}.json`;
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
  if (!resp.ok) {
    throw new Error(`No se pudo leer cotización ${codigo}: ${resp.status}`);
  }
  const data = await resp.json();
  const contenido = Buffer.from(data.content, "base64").toString("utf-8");
  return { cotizacion: JSON.parse(contenido), sha: data.sha };
}

// Lee config.json y devuelve solo la lista de precios base configurada en
// el dashboard (pestaña "Precios Base"), o [] si no existe/está vacía. No
// lanza excepción si falla — la estimación puede seguir sin esta referencia.
async function leerPreciosBase(githubToken) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/config.json`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const contenido = Buffer.from(data.content, "base64").toString("utf-8");
    const config = JSON.parse(contenido);
    return Array.isArray(config.precios_base) ? config.precios_base : [];
  } catch (err) {
    console.error("No se pudo leer precios_base de config.json:", err);
    return [];
  }
}

// Guarda la cotización actualizada en GitHub.
async function guardarCotizacion(githubToken, codigo, cotizacion, sha) {
  const ruta = `cotizaciones/${codigo}.json`;
  const contenidoBase64 = Buffer.from(
    JSON.stringify(cotizacion, null, 2),
    "utf-8"
  ).toString("base64");

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
      body: JSON.stringify({
        message: `Actualizar cotización ${codigo} (edición vía WhatsApp)`,
        content: contenidoBase64,
        sha,
      }),
    }
  );
  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error(`No se pudo guardar cotización ${codigo}: ${resp.status} ${detalle}`);
  }
}

// Le pide a Claude que traduzca un mensaje en lenguaje natural a un cambio
// estructurado sobre la cotización actual. Devuelve un objeto JS con la
// acción a aplicar, o null si Claude no pudo interpretar el mensaje como
// una modificación válida (ej. es solo un saludo).
async function interpretarInstruccion(anthropicKey, mensajeUsuario, cotizacion, preciosBase, cotizacionesAbiertas) {
  const bloquePreciosBase = (preciosBase && preciosBase.length > 0)
    ? `\n\nSigpal tiene esta lista de precios base propios (configurada en su dashboard) — 
son precios reales de la empresa, no estimaciones. SIEMPRE que un ítem que vayas a agregar
o estimar coincida (o se parezca) a algo de esta lista, usa este precio en vez de inventar
uno de memoria general:
${JSON.stringify(preciosBase, null, 2)}
Solo estima un precio "de mercado" propio cuando el ítem no tenga nada parecido acá arriba.`
    : "";

  const otrasAbiertas = (cotizacionesAbiertas || []).filter((c) => c.codigo !== cotizacion.codigo);
  const bloqueOtrasCotizaciones = (otrasAbiertas.length > 0)
    ? `\n\nAdemás de esta cotización, el usuario tiene otras abiertas al mismo tiempo:
${JSON.stringify(otrasAbiertas, null, 2)}
Si el mensaje pide cambiar a otra de estas (ej. "cambia a la del generador", "trabajemos la
1058086", "muéstrame la de baterías"), usa "cambiar_cotizacion_activa" con el código exacto de
la que mejor coincida. Si el mensaje pide ver cuáles tiene abiertas en general (ej. "cuáles
tengo pendientes", "qué cotizaciones tengo abiertas"), usa "listar_cotizaciones".`
    : "";

  const systemPrompt = `Eres un asistente que traduce instrucciones en español
sobre una cotización de Sigpal (empresa de metalmecánica/eléctrica/solar en
Chile) a un cambio estructurado en JSON. Responde ÚNICAMENTE con un objeto
JSON válido, sin texto adicional, sin markdown, sin explicaciones.

La cotización actual (la que está en foco ahora mismo) tiene esta forma:
${JSON.stringify(cotizacion, null, 2)}
${bloquePreciosBase}
${bloqueOtrasCotizaciones}

Si el mensaje del usuario pide modificar, agregar o quitar un ítem de
"materiales" o "mano_obra", responde con uno de estos formatos:
{"accion": "modificar_item", "seccion": "materiales", "indice": 0, "campo": "cantidad", "valor_nuevo": 6}
{"accion": "agregar_item", "seccion": "materiales", "item": {"descripcion": "...", "cantidad": 1, "unidad": "Un.", "precio_unitario": 0}}
{"accion": "eliminar_item", "seccion": "mano_obra", "indice": 2}
{"accion": "generar_estimacion", "materiales": [{"descripcion": "...", "cantidad": 1, "unidad": "Un.", "precio_unitario": 0}], "mano_obra": [{"descripcion": "...", "cantidad": 1, "unidad": "hora", "precio_unitario": 0}]}
{"accion": "aprobar_cotizacion"}
{"accion": "descartar_cotizacion", "codigo": "..."}
{"accion": "ver_cotizacion"}
{"accion": "cambiar_cotizacion_activa", "codigo": "..."}
{"accion": "listar_cotizaciones"}
{"accion": "sin_cambios", "motivo": "explica brevemente por qué el mensaje no es una instrucción de edición"}

Usa "descartar_cotizacion" cuando el mensaje pida cerrar, descartar, cancelar
o abandonar una cotización sin enviarla — por ejemplo "cierra esta",
"descarta esta cotización", "cierra la 1234-56-COT26", "cancela la del
generador". Esto es distinto de "eliminar_item" (que solo borra UN ítem de
la lista, no toda la cotización) y de "aprobar_cotizacion" (que sí la
envía). El campo "codigo" es OPCIONAL: si el mensaje menciona un código o
describe cuál (aunque no sea la que está en foco ahora mismo), poné ese
código exacto tal como aparece en la lista de "otras cotizaciones abiertas"
de abajo; si el mensaje dice simplemente "cierra esta" sin especificar
cuál, omití "codigo" y se entiende que es la que está en foco. Si el
mensaje menciona un código que NO aparece en ninguna lista (ni como activa
ni como abierta), usa "sin_cambios" y explica que no encontraste esa
cotización entre las abiertas.

"indice" es 0-based, contando desde el primer ítem de esa sección tal como
aparece en la cotización actual. Antes de usar "modificar_item" o
"eliminar_item", cuenta cuántos ítems tiene esa sección en la cotización
actual — si el índice que necesitarías no existe todavía (por ejemplo, la
sección está vacía y te piden poner un valor "en mano de obra" en general),
usa "agregar_item" en su lugar, creando el ítem con la mejor descripción
posible a partir del mensaje.

Si el mensaje pide que completes, rellenes, generes o propongas TODA la
cotización con "valores de mercado", "precios estimados", "precios
referenciales" o algo similar — es decir, que definas tú una lista completa
de materiales y mano de obra en base a tu conocimiento general del rubro,
en vez de editar un ítem puntual — usa "generar_estimacion". Basa la
lista en el nombre, categoría y motivos de la licitación (ya están arriba,
en la cotización actual). Para cada ítem: si coincide con algo de la lista
de precios base de Sigpal (si te la pasé arriba), usa ESE precio real; si
no coincide con nada de esa lista, estima un precio típico del mercado
chileno para ese tipo de proyecto (metalmecánica, tableros eléctricos,
solar FV, servicios industriales, generadores) — arma una lista razonable
y completa, pero no inventes cifras absurdas ni finjas tener datos de
mercado en tiempo real para lo que no tengas como referencia.

Si el mensaje no menciona claramente qué ítem modificar y no hay
suficiente información para agregarlo ni para generar una estimación
completa, usa "sin_cambios". Si el mensaje dice algo como "aprobada,
súbela" o "esta es la final, envíala", usa "aprobar_cotizacion". Si el
mensaje pide ver, recibir, que le reenvíen, o que le manden de nuevo la
cotización o el PDF actual (sin pedir ningún cambio sobre los datos), usa
"ver_cotizacion".`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: mensajeUsuario }],
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    console.error(`Error llamando a Claude: ${resp.status} ${detalle}`);
    return null;
  }

  const data = await resp.json();
  const textoRespuesta = data?.content?.[0]?.text || "";
  try {
    const limpio = textoRespuesta.replace(/```json|```/g, "").trim();
    return JSON.parse(limpio);
  } catch (err) {
    console.error("No se pudo parsear la respuesta de Claude:", textoRespuesta);
    return null;
  }
}

// Aplica el cambio interpretado por Claude directamente sobre el objeto de
// cotización en memoria. Devuelve true si se aplicó algo, false si no.
function aplicarCambio(cotizacion, cambio) {
  if (!cambio || !cambio.accion) return false;

  if (cambio.accion === "modificar_item") {
    const lista = cotizacion[cambio.seccion];
    if (!lista || !lista[cambio.indice]) return false;
    lista[cambio.indice][cambio.campo] = cambio.valor_nuevo;
    return true;
  }
  if (cambio.accion === "agregar_item") {
    if (!cotizacion[cambio.seccion]) cotizacion[cambio.seccion] = [];
    cotizacion[cambio.seccion].push(cambio.item);
    return true;
  }
  if (cambio.accion === "eliminar_item") {
    const lista = cotizacion[cambio.seccion];
    if (!lista || !lista[cambio.indice]) return false;
    lista.splice(cambio.indice, 1);
    return true;
  }
  if (cambio.accion === "aprobar_cotizacion") {
    cotizacion.estado = "aprobada";
    return true;
  }
  if (cambio.accion === "generar_estimacion") {
    const materiales = Array.isArray(cambio.materiales) ? cambio.materiales : [];
    const manoObra = Array.isArray(cambio.mano_obra) ? cambio.mano_obra : [];
    if (materiales.length === 0 && manoObra.length === 0) return false;
    cotizacion.materiales = materiales;
    cotizacion.mano_obra = manoObra;
    return true;
  }
  return false; // "sin_cambios" u otra acción no reconocida
}

// Avisa al motor que regenere el PDF de una cotización (tras un cambio) o
// que la procese como aprobada (para el envío/registro final).
async function dispararEventoCotizacion(githubToken, tipoEvento, codigo, numero) {
  const resp = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: tipoEvento,
        client_payload: { codigo, numero },
      }),
    }
  );
  if (!resp.ok) {
    const detalle = await resp.text();
    console.error(`No se pudo disparar ${tipoEvento} para ${codigo}: ${resp.status} ${detalle}`);
  } else {
    console.log(`Disparo ${tipoEvento} enviado para ${codigo} (${numero}).`);
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
      const cambioWebhook = entry?.changes?.[0]?.value;
      const mensajes = cambioWebhook?.messages;

      // Meta también manda actualizaciones de ESTADO de los mensajes que
      // nosotros mandamos (enviado/entregado/leído/fallido), en un campo
      // "statuses" separado de "messages". Antes esto se ignoraba en
      // silencio; ahora se imprime en el log, para poder ver la razón
      // exacta si un envío falla del lado de Meta (ej. destinatario sin
      // WhatsApp, número inválido, plantilla rechazada, etc.).
      const estados = cambioWebhook?.statuses;
      if (estados && estados.length > 0) {
        for (const est of estados) {
          const errores = (est.errors || [])
            .map((e) => `${e.code}: ${e.title}${e.error_data?.details ? " — " + e.error_data.details : ""}`)
            .join(" | ");
          console.log(
            `Estado de mensaje a ${est.recipient_id}: ${est.status}` +
            (errores ? ` — ERRORES: ${errores}` : "")
          );
        }
      }

      if (mensajes && mensajes.length > 0) {
        const mensaje = mensajes[0];
        const numero = mensaje.from; // número del que escribió, sin '+'
        const tipo = mensaje.type; // "text", "button", "interactive", etc.
        const ahoraISO = new Date().toISOString();

        // Determina qué pasó: texto libre normal, o respuesta a un botón
        // de la plantilla (Quick Reply "Sí" / "No"), o un botón "Ver" /
        // "Descartar" del mensaje interactivo de licitación nueva.
        let texto = "(mensaje sin texto, ej. imagen o audio)";
        let esRespuestaNo = false;
        let botonLicitacion = null; // { accion: "ver"|"descartar", codigo }

        if (tipo === "text") {
          texto = mensaje.text?.body || texto;
        } else if (tipo === "button") {
          // Respuesta a un botón de una plantilla de mensaje.
          texto = mensaje.button?.text || "(botón sin texto)";
          const payloadNorm = normalizarTexto(mensaje.button?.payload);
          const textoNorm = normalizarTexto(mensaje.button?.text);
          if (payloadNorm.includes("no") || textoNorm === "no") {
            esRespuestaNo = true;
          }
        } else if (tipo === "interactive") {
          // Respuesta a un botón de un mensaje interactivo (no plantilla).
          const buttonId = mensaje.interactive?.button_reply?.id || "";
          texto = mensaje.interactive?.button_reply?.title || "(respuesta interactiva)";
          const tituloNorm = normalizarTexto(texto);
          if (tituloNorm === "no") {
            esRespuestaNo = true;
          }
          if (buttonId.startsWith("ver_")) {
            botonLicitacion = { accion: "ver", codigo: buttonId.slice(4) };
          } else if (buttonId.startsWith("descartar_")) {
            botonLicitacion = { accion: "descartar", codigo: buttonId.slice(10) };
          }
        }

        console.log(`Mensaje entrante de ${numero} (${tipo}): ${texto}`);

        const githubToken = process.env.GITHUB_TOKEN;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const whatsappToken = process.env.WHATSAPP_TOKEN;
        const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;

        // --- Botón "Ver" / "Descartar" de una licitación nueva -----------
        // Se atiende antes que cualquier otra cosa: no tiene relación con
        // el flujo de edición de cotizaciones ni con el de reactivación.
        if (botonLicitacion && githubToken) {
          const tipoEvento = botonLicitacion.accion === "ver"
            ? "confirmar_licitacion"
            : "descartar_licitacion";

          // Aviso INMEDIATO (responde en <1s, sin esperar a que arranque
          // GitHub Actions — eso puede tardar 1-2 minutos en frío). No
          // reemplaza el trabajo pesado (crear la cotización, armar el
          // PDF con ReportLab en Python) — eso lo sigue haciendo el motor
          // como siempre, este mensaje solo evita que la persona sienta
          // que no pasó nada durante esa espera.
          try {
            const { estado: estadoActual } = await leerEstado(githubToken);
            const item = estadoActual?.[numero]?.notificadas?.[botonLicitacion.codigo];
            const nombreItem = item?.nombre ? `"${item.nombre}"` : "esa licitación";
            const mensajeAck = botonLicitacion.accion === "ver"
              ? `📋 Dale, armando la cotización de ${nombreItem}. En un momento te mando el PDF.`
              : `Ok, descartada ${nombreItem}.`;
            await enviarMensajeWhatsApp(whatsappToken, whatsappPhoneId, numero, mensajeAck);
          } catch (e) {
            // Si el aviso instantáneo falla por lo que sea (ej. no se
            // encontró el item en 'notificadas'), no es grave — el motor
            // en GitHub Actions igual va a mandar su propio mensaje al
            // procesar la confirmación. Este aviso es solo una mejora de
            // percepción de velocidad, no una parte crítica del flujo.
            console.warn(`No se pudo mandar el aviso instantáneo: ${e}`);
          }

          await dispararEventoCotizacion(githubToken, tipoEvento, botonLicitacion.codigo, numero);
          return res.status(200).send("OK");
        }

        if (githubToken) {
          const { estado, sha } = await leerEstado(githubToken);
          const entradaPrevia = estado[numero] || {};

          // --- ¿Hay una licitación esperando "sí"/"no"? -------------------
          // Máxima prioridad: si el motor mandó una licitación nueva como
          // texto libre pidiendo confirmación (en vez de botones — la
          // cuenta no tiene el permiso de Meta habilitado para mensajes
          // interactivos), cualquier texto que responda ahora se interpreta
          // como esa respuesta, antes que cualquier otra cosa.
          const licitacionEnConfirmacion = entradaPrevia.licitacion_en_confirmacion;
          if (licitacionEnConfirmacion && (tipo === "text" || tipo === "button")) {
            let esSi, esNo;
            if (tipo === "button") {
              // Ya se determinó esRespuestaNo arriba a partir de
              // mensaje.button (payload/texto del botón tocado en la
              // plantilla). Si no fue "No", en este flujo de
              // confirmación cualquier botón que no sea "No" se toma
              // como "Sí" — la plantilla solo tiene esos dos botones.
              esNo = esRespuestaNo;
              esSi = !esRespuestaNo;
            } else {
              const textoNorm = normalizarTexto(texto);
              esSi = /^s[ií]\b|^ver\b|^cotiza|^dale\b|^ok\b|^vamos\b/.test(textoNorm);
              esNo = /^no\b|^descart|^paso\b/.test(textoNorm);
            }

            if (esSi || esNo) {
              const tipoEvento = esSi ? "confirmar_licitacion" : "descartar_licitacion";
              await dispararEventoCotizacion(githubToken, tipoEvento, licitacionEnConfirmacion.codigo, numero);
            } else {
              await enviarMensajeWhatsApp(
                whatsappToken, whatsappPhoneId, numero,
                `No entendí. Responde *sí* para cotizar "${licitacionEnConfirmacion.nombre}" `
                + `o *no* para descartarla.`
              );
            }

            // OJO: NO usamos 'estado'/'entradaPrevia' leídos al principio de
            // esta función para escribir de vuelta acá. Ese snapshot puede
            // estar desactualizado para cuando llegamos a este punto: el
            // motor Python (disparado arriba, corre en GitHub Actions y
            // puede tardar varios minutos) es el único responsable de
            // limpiar 'licitacion_en_confirmacion' y avanzar la cola.
            // Si escribiéramos acá con el snapshot viejo, podríamos pisar
            // ese cambio (o chocar de sha) y dejar la cola trabada con una
            // licitación que el socio ya respondió. Por eso releemos el
            // estado fresco justo antes de escribir, y solo tocamos los
            // campos que le corresponden a esta interacción (nunca
            // 'licitacion_en_confirmacion' ni 'cola_licitaciones').
            const { estado: estadoFresco, sha: shaFresco } = await leerEstado(githubToken);
            const entradaFresca = estadoFresco[numero] || {};
            const camposActualizados = {
              "última_interacción": ahoraISO,
              "último_mensaje": texto,
              "notificaciones_activas": true,
            };
            estadoFresco[numero] = { ...entradaFresca, ...camposActualizados };
            await guardarEstadoConReintento(githubToken, estadoFresco, shaFresco, numero, camposActualizados);
            return res.status(200).send("OK");
          }

          // --- ¿Hay una cotización en revisión para este número? ---------
          // Si es así, y el mensaje es texto libre (no un botón de la
          // plantilla de alerta de licitación), lo tratamos como una
          // instrucción de edición en vez de como interacción normal.
          //
          // OJO: si además hay un mensaje_pendiente esperando (el detalle
          // completo de la licitación, que se manda recién cuando el
          // socio escribe algo por primera vez tras la plantilla), hay que
          // entregarlo primero — si no, un socio que nunca había escrito
          // antes quedaría atrapado en modo edición sin haber visto nunca
          // el detalle de la licitación que originó todo esto.
          const codigoActivo = entradaPrevia.cotizacion_activa;
          const hayMensajePendiente = !!entradaPrevia.mensaje_pendiente;

          if (codigoActivo && hayMensajePendiente && tipo === "text") {
            await dispararMensajePendiente(githubToken, numero);
            const nuevaEntrada = {
              ...entradaPrevia,
              "última_interacción": ahoraISO,
              "último_mensaje": texto,
              "notificaciones_activas": true,
            };
            estado[numero] = nuevaEntrada;
            await guardarEstado(githubToken, estado, sha);
            return res.status(200).send("OK");
          }

          if (codigoActivo && tipo === "text" && anthropicKey) {
            let nuevoCodigoActivo = codigoActivo;
            const cotizacionesAbiertas = entradaPrevia.cotizaciones_abiertas || [];
            try {
              const { cotizacion, sha: shaCotizacion } = await leerCotizacion(githubToken, codigoActivo);
              const preciosBase = await leerPreciosBase(githubToken);
              const cambio = await interpretarInstruccion(
                anthropicKey, texto, cotizacion, preciosBase, cotizacionesAbiertas
              );

              let textoConfirmacion;

              if (cambio?.accion === "listar_cotizaciones") {
                textoConfirmacion = describirListaCotizaciones(cotizacionesAbiertas, codigoActivo);
              } else if (cambio?.accion === "cambiar_cotizacion_activa") {
                const existe = cotizacionesAbiertas.find((c) => c.codigo === cambio.codigo);
                if (existe) {
                  nuevoCodigoActivo = cambio.codigo;
                  textoConfirmacion = `✅ Cambié el foco a: ${existe.nombre} (${existe.codigo}). `
                    + `Ahora tus mensajes van a editar esta cotización.`;
                } else {
                  textoConfirmacion = "No encontré esa cotización entre las que tienes abiertas. "
                    + describirListaCotizaciones(cotizacionesAbiertas, codigoActivo);
                }
              } else if (cambio?.accion === "descartar_cotizacion") {
                const codigoADescartar = cambio.codigo || codigoActivo;
                const existe = cotizacionesAbiertas.find((c) => c.codigo === codigoADescartar);
                if (!existe && codigoADescartar !== codigoActivo) {
                  textoConfirmacion = "No encontré esa cotización entre las que tienes abiertas. "
                    + describirListaCotizaciones(cotizacionesAbiertas, codigoActivo);
                } else {
                  const nombreDescartada = existe?.nombre || "";
                  await dispararEventoCotizacion(githubToken, "descartar_cotizacion_activa", codigoADescartar, numero);
                  // Si se descartó la que estaba en foco, el foco pasa a
                  // la siguiente abierta (o queda sin ninguna) — eso lo
                  // resuelve cerrar_cotizacion() del lado de Python, así
                  // que acá solo reflejamos localmente cuál va a quedar,
                  // para no perder el estado hasta la próxima interacción.
                  if (codigoADescartar === codigoActivo) {
                    const restantes = cotizacionesAbiertas.filter((c) => c.codigo !== codigoADescartar);
                    nuevoCodigoActivo = restantes.length > 0 ? restantes[0].codigo : null;
                  }
                  textoConfirmacion = `🗑️ Descartada${nombreDescartada ? `: ${nombreDescartada}` : ""} `
                    + `(${codigoADescartar}). No se envió ni queda en el historial.`;
                }
              } else {
                const seAplico = aplicarCambio(cotizacion, cambio);

                if (seAplico) {
                  await guardarCotizacion(githubToken, codigoActivo, cotizacion, shaCotizacion);
                  if (cambio.accion === "aprobar_cotizacion") {
                    await dispararEventoCotizacion(githubToken, "cotizacion_aprobada", codigoActivo, numero);
                  } else {
                    await dispararEventoCotizacion(githubToken, "regenerar_cotizacion", codigoActivo, numero);
                  }
                } else if (cambio?.accion === "ver_cotizacion") {
                  // No hay ningún dato que guardar (no se modificó nada),
                  // pero igual le pedimos al motor que regenere el PDF con
                  // los datos actuales y lo reenvíe por WhatsApp y correo.
                  await dispararEventoCotizacion(githubToken, "regenerar_cotizacion", codigoActivo, numero);
                } else {
                  console.log(`Mensaje de ${numero} no se interpretó como cambio válido para ${codigoActivo}.`);
                }

                // Confirmamos por WhatsApp qué se hizo (o por qué no se
                // hizo nada), tanto si aplicó el cambio como si no.
                textoConfirmacion = describirCambio(cambio, cotizacion, seAplico, cotizacionesAbiertas);
              }

              await enviarMensajeWhatsApp(whatsappToken, whatsappPhoneId, numero, textoConfirmacion);
            } catch (err) {
              console.error(`Error procesando edición de cotización ${codigoActivo}:`, err);
              await enviarMensajeWhatsApp(
                whatsappToken,
                whatsappPhoneId,
                numero,
                "Hubo un problema procesando tu instrucción. Intenta de nuevo en un momento."
              );
            }

            // Igual guardamos la interacción básica (última_interacción,
            // etc.) como en el flujo normal, pero sin disparar el chequeo
            // de mensaje_pendiente — ese flujo es para licitaciones nuevas,
            // no para ediciones de cotización. Si el mensaje cambió el
            // foco a otra cotización abierta, eso también se guarda acá.
            const nuevaEntrada = {
              ...entradaPrevia,
              "última_interacción": ahoraISO,
              "último_mensaje": texto,
              "notificaciones_activas": true,
              "cotizacion_activa": nuevoCodigoActivo,
            };
            estado[numero] = nuevaEntrada;
            await guardarEstado(githubToken, estado, sha);
            return res.status(200).send("OK");
          }

          // OJO: se arma la entrada nueva explícitamente (sin usar spread
          // de entradaPrevia completa) para no arrastrar campos viejos sin
          // tilde ("ultima_interaccion", "ultimo_mensaje") que quedaron de
          // una versión anterior de este webhook. Así el archivo se va
          // "limpiando solo" a medida que cada número vuelve a interactuar.
          const nuevaEntrada = {
            "última_interacción": ahoraISO,
            "último_mensaje": texto,
            "notificaciones_activas": !esRespuestaNo,
          };
          // Si el motor había dejado un mensaje completo pendiente para
          // este número, lo conservamos tal cual hasta que el motor lo
          // envíe y lo limpie él mismo.
          if (entradaPrevia.mensaje_pendiente !== undefined) {
            nuevaEntrada.mensaje_pendiente = entradaPrevia.mensaje_pendiente;
          }

          estado[numero] = nuevaEntrada;
          await guardarEstado(githubToken, estado, sha);

          // Si tocó "No", no avisamos al motor — no queremos mandarle el
          // mensaje pendiente justo después de que dijo que no quería.
          // Para cualquier otra interacción (botón "Sí" o texto libre),
          // avisamos al motor por si hay algo pendiente para enviar ahora.
          if (!esRespuestaNo) {
            await dispararMensajePendiente(githubToken, numero);
          }
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
