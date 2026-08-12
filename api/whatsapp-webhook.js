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
    throw new Error(`No se pudo guardar ${ESTADO_FILE}: ${resp.status} ${detalle}`);
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
function describirCambio(cambio, cotizacion) {
  if (!cambio || !cambio.accion) {
    return "No entendí bien esa instrucción. Puedes pedirme cosas como "
      + "\"sube la cantidad del ítem 2 a 6\" o \"agrega 10 metros de cable a $5.000 cada uno\".";
  }

  if (cambio.accion === "modificar_item") {
    return `✅ Actualicé el campo "${cambio.campo}" del ítem ${cambio.indice + 1} `
      + `de ${cambio.seccion} a: ${cambio.valor_nuevo}.`;
  }
  if (cambio.accion === "agregar_item") {
    const desc = cambio.item?.descripcion || "el nuevo ítem";
    return `✅ Agregué "${desc}" a ${cambio.seccion}.`;
  }
  if (cambio.accion === "eliminar_item") {
    return `✅ Eliminé el ítem ${cambio.indice + 1} de ${cambio.seccion}.`;
  }
  if (cambio.accion === "aprobar_cotizacion") {
    return "✅ Cotización marcada como aprobada. Se está procesando el envío/registro.";
  }
  if (cambio.accion === "ver_cotizacion") {
    return "📄 Te reenvío la cotización actualizada en un momento.";
  }
  if (cambio.accion === "sin_cambios") {
    return cambio.motivo
      ? `No hice cambios: ${cambio.motivo}`
      : "No hice ningún cambio con ese mensaje.";
  }
  return "Recibí tu mensaje, pero no pude aplicar un cambio con eso.";
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
async function interpretarInstruccion(anthropicKey, mensajeUsuario, cotizacion) {
  const systemPrompt = `Eres un asistente que traduce instrucciones en español
sobre una cotización de Sigpal (empresa de metalmecánica/eléctrica/solar en
Chile) a un cambio estructurado en JSON. Responde ÚNICAMENTE con un objeto
JSON válido, sin texto adicional, sin markdown, sin explicaciones.

La cotización actual tiene esta forma:
${JSON.stringify(cotizacion, null, 2)}

Si el mensaje del usuario pide modificar, agregar o quitar un ítem de
"materiales" o "mano_obra", responde con uno de estos formatos:
{"accion": "modificar_item", "seccion": "materiales", "indice": 0, "campo": "cantidad", "valor_nuevo": 6}
{"accion": "agregar_item", "seccion": "materiales", "item": {"descripcion": "...", "cantidad": 1, "unidad": "Un.", "precio_unitario": 0}}
{"accion": "eliminar_item", "seccion": "mano_obra", "indice": 2}
{"accion": "aprobar_cotizacion"}
{"accion": "ver_cotizacion"}
{"accion": "sin_cambios", "motivo": "explica brevemente por qué el mensaje no es una instrucción de edición"}

"indice" es 0-based, contando desde el primer ítem de esa sección tal como
aparece en la cotización actual. Si el mensaje no menciona claramente qué
ítem modificar, usa "sin_cambios". Si el mensaje dice algo como "aprobada,
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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
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

      if (mensajes && mensajes.length > 0) {
        const mensaje = mensajes[0];
        const numero = mensaje.from; // número del que escribió, sin '+'
        const tipo = mensaje.type; // "text", "button", "interactive", etc.
        const ahoraISO = new Date().toISOString();

        // Determina qué pasó: texto libre normal, o respuesta a un botón
        // de la plantilla (Quick Reply "Sí" / "No").
        let texto = "(mensaje sin texto, ej. imagen o audio)";
        let esRespuestaNo = false;

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
          texto = mensaje.interactive?.button_reply?.title || "(respuesta interactiva)";
          const tituloNorm = normalizarTexto(texto);
          if (tituloNorm === "no") {
            esRespuestaNo = true;
          }
        }

        console.log(`Mensaje entrante de ${numero} (${tipo}): ${texto}`);

        const githubToken = process.env.GITHUB_TOKEN;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const whatsappToken = process.env.WHATSAPP_TOKEN;
        const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;

        if (githubToken) {
          const { estado, sha } = await leerEstado(githubToken);
          const entradaPrevia = estado[numero] || {};

          // --- ¿Hay una cotización en revisión para este número? ---------
          // Si es así, y el mensaje es texto libre (no un botón de la
          // plantilla de alerta de licitación), lo tratamos como una
          // instrucción de edición en vez de como interacción normal.
          const codigoActivo = entradaPrevia.cotizacion_activa;
          if (codigoActivo && tipo === "text" && anthropicKey) {
            try {
              const { cotizacion, sha: shaCotizacion } = await leerCotizacion(githubToken, codigoActivo);
              const cambio = await interpretarInstruccion(anthropicKey, texto, cotizacion);
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

              // Confirmamos por WhatsApp qué se hizo (o por qué no se hizo
              // nada), tanto si aplicó el cambio como si no.
              const textoConfirmacion = describirCambio(cambio, cotizacion);
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
            // no para ediciones de cotización.
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
