import React, { useState, useEffect } from "react";
import {
  Zap,
  MapPin,
  DollarSign,
  Clock,
  SlidersHorizontal,
  Plus,
  X,
  Check,
  Factory,
  Sun,
  Wrench,
  PlugZap,
  Fuel,
  Save,
  ChevronRight,
  History,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  ArrowRight,
  Bell,
  Mail,
  Phone,
  Lock,
  Search,
  Calendar,
  Loader2,
  LayoutDashboard,
  Trophy,
  ListChecks,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg: "#EEF2F8",
  panel: "#FFFFFF",
  panelAlt: "#F4F7FB",
  raised: "#E7EDF6",
  line: "#D6DEE9",
  lineSoft: "#E3E9F1",
  amber: "#2F6FED",
  amberDim: "#8FB0F5",
  amberSoft: "#E8F0FE",
  cyan: "#0EA5B7",
  cyanSoft: "#E1F5F7",
  text: "#1B2434",
  textMute: "#5C6B7E",
  textFaint: "#94A1B3",
  green: "#2FA860",
  greenSoft: "#E5F6EC",
  red: "#E4433F",
  redSoft: "#FCEAEA",
  purple: "#7C5CE0",
  purpleSoft: "#EFEAFC",
  sidebarBg: "#123B8F",
  sidebarBgRaised: "#1B4BAA",
  sidebarLine: "#2A57AC",
  sidebarText: "#FFFFFF",
  sidebarMute: "#AFC5EF",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

const REGIONS = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

const ICONS = { Factory, PlugZap, Sun, Wrench, Fuel };

const DEFAULT_CATEGORIES = [
  {
    id: "metalmecanica",
    name: "Metalmecánica / Fabricación",
    icon: "Factory",
    active: true,
    montoMin: 3,
    montoMax: 2000,
    keywords: ["estructuras metálicas", "maestranza", "soldadura", "galpón", "cubierta", "fabricación de piezas"],
  },
  {
    id: "tableros",
    name: "Tableros Eléctricos",
    icon: "PlugZap",
    active: true,
    montoMin: 10,
    montoMax: 5000,
    keywords: ["tablero eléctrico", "panel de control", "PLC", "subestación", "media tensión", "baja tensión", "IP65"],
  },
  {
    id: "solar",
    name: "Energía Solar FV",
    icon: "Sun",
    active: true,
    montoMin: 20,
    montoMax: 3000,
    keywords: ["fotovoltaico", "paneles solares", "sistema híbrido", "inversor", "energía renovable", "kWp"],
  },
  {
    id: "servicios",
    name: "Servicios Industriales",
    icon: "Wrench",
    active: true,
    montoMin: 5,
    montoMax: 1000,
    keywords: ["mantenimiento industrial", "lavado de tableros energizados", "gran minería", "inspección eléctrica"],
  },
  {
    id: "generadores",
    name: "Generadores y Equipos",
    icon: "Fuel",
    active: false,
    montoMin: 5,
    montoMax: 500,
    keywords: ["grupo electrógeno", "generador diésel", "kit mina", "cabina insonorizada"],
  },
];

const DEFAULT_PRICES = [
  { id: 1, item: "HH técnico eléctrico industrial", unit: "hora", price: 20000 },
  { id: 2, item: "HH soldador calificado", unit: "hora", price: 17000 },
  { id: 3, item: "Mano de obra fabricación estructura metálica", unit: "kg", price: 950 },
  { id: 4, item: "Tablero eléctrico IP65 (base)", unit: "unidad", price: 850000 },
  { id: 5, item: "Instalación sistema FV comercial/industrial", unit: "kWp", price: 700000 },
  { id: 6, item: "Lavado tablero energizado", unit: "punto", price: 95000 },
];

// Tipos de aviso que dispara el bot y por qué canal(es) puede llegar cada
// uno. El id de cada evento coincide 1 a 1 con lo que revisa
// canal_activo() en motor_licitaciones.py — si se agrega un evento nuevo
// acá, hay que agregar el mismo id en el backend.
const NOTIF_EVENTOS = [
  {
    id: "licitacion_nueva",
    label: "Licitación nueva encontrada",
    desc: "Cuando el bot detecta una licitación o Compra Ágil que calza con tus rubros.",
  },
  {
    id: "cotizacion_aprobada",
    label: "Cotización aprobada",
    desc: "Confirmación con el PDF cuando marcas una cotización como aprobada por WhatsApp.",
  },
  {
    id: "adjudicacion",
    label: "Adjudicación (ganada o perdida)",
    desc: "Cuando se resuelve una licitación en la que Sigpal cotizó.",
  },
  {
    id: "heartbeat",
    label: "Bot activo (sin novedades)",
    desc: "Aviso de que el bot corrió bien aunque no haya encontrado nada nuevo.",
  },
];

const DEFAULT_NOTIF_PREFS = {
  licitacion_nueva: { correo: true, whatsapp: true },
  cotizacion_aprobada: { correo: true, whatsapp: true },
  adjudicacion: { correo: true, whatsapp: true },
  heartbeat: { correo: true, whatsapp: true },
};

const TABS_GENERAL = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
];

const TABS = [
  { id: "rubros", label: "Rubros", icon: SlidersHorizontal },
  { id: "zonas", label: "Montos y Zonas", icon: MapPin },
  { id: "precios", label: "Precios Base", icon: DollarSign },
  { id: "horarios", label: "Horarios", icon: Clock },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
];

const TABS_ANALISIS = [
  { id: "busqueda", label: "Búsqueda manual", icon: Search },
  { id: "historial", label: "Historial", icon: History },
  { id: "sugerencias", label: "Sugerencias", icon: Lightbulb },
];

// Datos de ejemplo — se reemplazan por actividad real del bot una vez conectado
const SAMPLE_HISTORY = [
  {
    id: 1,
    fecha: "07-08-2026",
    nombre: "Suministro e instalación tablero MT subestación",
    rubro: "Tableros Eléctricos",
    score: 91,
    decision: "enviada",
    resultado: "pendiente",
  },
  {
    id: 2,
    fecha: "06-08-2026",
    nombre: "Mantenimiento sistema FV edificio municipal",
    rubro: "Energía Solar FV",
    score: 78,
    decision: "aprobada",
    resultado: "pendiente",
  },
  {
    id: 3,
    fecha: "05-08-2026",
    nombre: "Fabricación de estructura galpón industrial",
    rubro: "Metalmecánica / Fabricación",
    score: 84,
    decision: "enviada",
    resultado: "ganada",
  },
  {
    id: 4,
    fecha: "04-08-2026",
    nombre: "Arriendo de grúas para evento municipal",
    rubro: "—",
    score: 22,
    decision: "descartada",
    resultado: "—",
  },
  {
    id: 5,
    fecha: "02-08-2026",
    nombre: "Lavado de tableros energizados planta Los Bronces",
    rubro: "Servicios Industriales",
    score: 88,
    decision: "rechazada",
    resultado: "—",
  },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function Rivet() {
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: C.line,
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.6), 0 1px 0 rgba(0,0,0,0.06)",
      }}
    />
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 42,
        height: 22,
        borderRadius: 999,
        background: on ? C.amberSoft : C.raised,
        border: `1px solid ${on ? C.amberDim : C.line}`,
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background .15s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 21 : 2,
          width: 17,
          height: 17,
          borderRadius: 999,
          background: on ? C.amber : C.textFaint,
          boxShadow: on ? `0 0 8px ${C.amber}66` : "none",
          transition: "left .15s ease, background .15s ease",
        }}
      />
    </button>
  );
}

function SectionNote({ children }) {
  return (
    <div
      style={{
        marginTop: 28,
        padding: "12px 14px",
        background: C.panelAlt,
        border: `1px dashed ${C.line}`,
        borderRadius: 6,
        fontFamily: "Inter, sans-serif",
        fontSize: 12.5,
        color: C.textMute,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 10.5,
        letterSpacing: "0.08em",
        color: C.textFaint,
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, soft }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.lineSoft}`,
        borderRadius: 8,
        padding: 16,
        flex: "1 1 160px",
        minWidth: 150,
        boxShadow: "0 1px 2px rgba(20,30,60,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: soft || C.amberSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={color || C.amber} strokeWidth={2.2} />
        </div>
        <span
          style={{
            fontSize: 11,
            color: C.textMute,
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 30, fontWeight: 700, lineHeight: 1, color: C.text }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function DonutEstados({ enCurso, pendientes, ganadas, perdidas }) {
  const total = enCurso + pendientes + ganadas + perdidas;
  const segmentos = [
    { label: "En curso", valor: enCurso, color: C.amber },
    { label: "Enviadas (pendiente)", valor: pendientes, color: C.purple },
    { label: "Ganadas", valor: ganadas, color: C.green },
    { label: "Perdidas", valor: perdidas, color: C.red },
  ].filter((s) => s.valor > 0);

  let acumulado = 0;
  const stops = segmentos.map((s) => {
    const desde = total > 0 ? (acumulado / total) * 360 : 0;
    acumulado += s.valor;
    const hasta = total > 0 ? (acumulado / total) * 360 : 0;
    return `${s.color} ${desde}deg ${hasta}deg`;
  });

  const gradiente = total > 0 ? `conic-gradient(${stops.join(", ")})` : C.raised;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: gradiente,
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: "50%",
            background: C.panel,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 700 }}>
            {total}
          </div>
          <div style={{ fontSize: 9, color: C.textFaint, fontFamily: "JetBrains Mono, monospace" }}>
            TOTAL
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {segmentos.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.textMute }}>Todavía no hay datos suficientes.</div>
        )}
        {segmentos.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ color: C.textMute }}>{s.label}</span>
            <span style={{ color: C.text, fontFamily: "JetBrains Mono, monospace", marginLeft: 2 }}>
              {s.valor}
              {total > 0 && (
                <span style={{ color: C.textFaint }}> ({Math.round((s.valor / total) * 100)}%)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumenGeneral({
  historial,
  historialCargando,
  cotizacionesAbiertas,
  cotizacionesAbiertasCargando,
  setTab,
}) {
  const enCurso = cotizacionesAbiertas.length;
  const ganadas = historial.filter((h) => h.resultado === "ganada").length;
  const perdidas = historial.filter((h) => h.resultado === "perdida").length;
  const pendientes = historial.filter((h) => h.resultado === "pendiente" || !h.resultado).length;
  const tasaExito =
    ganadas + perdidas > 0 ? Math.round((ganadas / (ganadas + perdidas)) * 100) : null;

  const destacadas = cotizacionesAbiertas.slice(0, 5);
  const recientes = historial
    .slice()
    .sort((a, b) => new Date(b.fecha_envio || 0) - new Date(a.fecha_envio || 0))
    .slice(0, 5);

  const cargando = historialCargando || cotizacionesAbiertasCargando;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 24, fontWeight: 600 }}>
          Resumen general
        </div>
        <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
          Estado actual del bot: cotizaciones en curso, resultados y actividad reciente.
        </div>
      </div>

      {cargando ? (
        <div style={{ padding: "20px 0", fontSize: 13, color: C.textMute }}>Cargando datos...</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <KpiCard
              icon={ListChecks}
              label="EN CURSO"
              value={enCurso}
              sub="Cotizaciones listas, aún sin cargar"
              color={C.amber}
              soft={C.amberSoft}
            />
            <KpiCard
              icon={Clock}
              label="EN RESULTADO PENDIENTE"
              value={pendientes}
              sub="Cargadas, esperando adjudicación"
              color={C.purple}
              soft={C.purpleSoft}
            />
            <KpiCard
              icon={Trophy}
              label="GANADAS"
              value={ganadas}
              sub={tasaExito !== null ? `${tasaExito}% de tasa de éxito` : "Sin resultados aún"}
              color={C.green}
              soft={C.greenSoft}
            />
            <KpiCard
              icon={X}
              label="PERDIDAS"
              value={perdidas}
              sub="Adjudicadas a otro proveedor"
              color={C.red}
              soft={C.redSoft}
            />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div
              style={{
                flex: "2 1 320px",
                background: C.panel,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                padding: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Cotizaciones destacadas</div>
                <span
                  onClick={() => setTab("historial")}
                  style={{ fontSize: 11.5, color: C.cyan, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}
                >
                  Ver todas →
                </span>
              </div>
              {destacadas.length === 0 && (
                <div style={{ fontSize: 12.5, color: C.textMute }}>
                  No hay cotizaciones en curso ahora mismo.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {destacadas.map((c, i) => (
                  <div
                    key={c.codigo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 0",
                      borderTop: i === 0 ? "none" : `1px solid ${C.lineSoft}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: 11,
                        color: C.amber,
                        flexShrink: 0,
                      }}
                    >
                      {c.codigo}
                    </span>
                    <span style={{ fontSize: 12.5, color: C.text, flex: 1 }}>{c.nombre}</span>
                    {c.socios?.some((s) => s.es_activa) && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                          color: C.cyan,
                          background: C.panelAlt,
                          borderRadius: 999,
                          padding: "2px 8px",
                          flexShrink: 0,
                        }}
                      >
                        en foco
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: "1 1 260px",
                background: C.panel,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                padding: 18,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Licitaciones por estado</div>
              <DonutEstados enCurso={enCurso} pendientes={pendientes} ganadas={ganadas} perdidas={perdidas} />
            </div>
          </div>

          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.lineSoft}`,
              borderRadius: 6,
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Actividad reciente</div>
              <span
                onClick={() => setTab("historial")}
                style={{ fontSize: 11.5, color: C.cyan, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}
              >
                Ver historial completo →
              </span>
            </div>
            {recientes.length === 0 && (
              <div style={{ fontSize: 12.5, color: C.textMute }}>
                Todavía no hay cotizaciones registradas.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recientes.map((h, i) => (
                <div
                  key={h.codigo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 0",
                    borderTop: i === 0 ? "none" : `1px solid ${C.lineSoft}`,
                  }}
                >
                  <span style={{ fontSize: 11.5, color: C.textFaint, fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>
                    {fmtFechaHistorial(h.fecha_envio)}
                  </span>
                  <span style={{ fontSize: 12.5, color: C.text, flex: 1 }}>{h.nombre}</span>
                  <span style={{ fontSize: 11.5 }}>
                    {h.resultado === "ganada" && <span style={{ color: C.green }}>Ganada</span>}
                    {h.resultado === "perdida" && <span style={{ color: C.red }}>Perdida</span>}
                    {(h.resultado === "pendiente" || !h.resultado) && (
                      <span style={{ color: C.textMute }}>Pendiente</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
const STORAGE_KEY = "sigpal-dashboard-config-v1";

function cargarConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // si falla el guardado (ej. modo privado del navegador), no interrumpe la app
  }
}

function fmtFechaHistorial(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function App() {
  const guardado = cargarConfig();

  const [tab, setTab] = useState("resumen");
  const [categories, setCategories] = useState(guardado?.categories ?? DEFAULT_CATEGORIES);
  const [regions, setRegions] = useState(guardado?.regions ?? ["Metropolitana", "Valparaíso", "O'Higgins"]);
  const [prices, setPrices] = useState(guardado?.prices ?? DEFAULT_PRICES);
  const [horarios, setHorarios] = useState(guardado?.horarios ?? ["08:00", "13:00", "18:30"]);
  const [sensitivity, setSensitivity] = useState(guardado?.sensitivity ?? 62);
  const [socios, setSocios] = useState(
    guardado?.socios ?? [{ nombre: "Bryan", email: "sigpallicitaciones@gmail.com", whatsapp: "" }]
  );
  const [notifPrefs, setNotifPrefs] = useState(
    guardado?.notifPrefs ?? DEFAULT_NOTIF_PREFS
  );
  const [newHorario, setNewHorario] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Guarda automáticamente cada vez que cambia cualquier parte de la configuración
  useEffect(() => {
    guardarConfig({ categories, regions, prices, horarios, sensitivity, socios, notifPrefs });
  }, [categories, regions, prices, horarios, sensitivity, socios, notifPrefs]);

  const toggleNotifCanal = (evento, canal) =>
    setNotifPrefs((prev) => ({
      ...prev,
      [evento]: { ...prev[evento], [canal]: !prev[evento][canal] },
    }));

  const flashSave = () => {
  setSavedFlash(true);
  setTimeout(() => setSavedFlash(false), 1600);

  // Envía la configuración al bot en GitHub, para que quede sincronizada
  fetch("/api/guardar-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: {
        sensibilidad: sensitivity,
        regiones: regions,
        horarios: horarios,
        socios: socios.map((s) => ({
          nombre: s.nombre,
          email: s.email,
          whatsapp: s.whatsapp,
        })),
        categorias: categories.map((c) => ({
          id: c.id,
          nombre: c.name,
          activo: c.active,
          monto_min_utm: c.montoMin,
          monto_max_utm: c.montoMax,
          keywords: c.keywords,
        })),
        precios_base: prices.map((p) => ({
          item: p.item,
          unidad: p.unit,
          precio: p.price,
        })),
        notificaciones: notifPrefs,
      },
    }),
  }).catch((err) => {
    console.error("No se pudo sincronizar con GitHub:", err);
  });
};

  const toggleCategory = (id) =>
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));

  const updateCategoryField = (id, field, value) =>
    setCategories((cs) => cs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const removeKeyword = (catId, kw) =>
    setCategories((cs) =>
      cs.map((c) => (c.id === catId ? { ...c, keywords: c.keywords.filter((k) => k !== kw) } : c))
    );

  const addKeyword = (catId, kw) => {
    if (!kw.trim()) return;
    setCategories((cs) =>
      cs.map((c) => (c.id === catId ? { ...c, keywords: [...c.keywords, kw.trim()] } : c))
    );
  };

  const addCategory = () => {
    const nombre = window.prompt("Nombre del nuevo rubro (ej. Mantención Industrial):");
    if (!nombre || !nombre.trim()) return;
    const id = nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    setCategories((cs) => [
      ...cs,
      {
        id,
        name: nombre.trim(),
        icon: "Wrench",
        active: true,
        montoMin: 5,
        montoMax: 1000,
        keywords: [],
      },
    ]);
  };

  const removeCategory = (id) => {
    if (!window.confirm("¿Eliminar este rubro? Se perderán sus palabras clave.")) return;
    setCategories((cs) => cs.filter((c) => c.id !== id));
  };

  const addSocio = () => {
    setSocios((s) => [...s, { nombre: "", email: "", whatsapp: "" }]);
  };

  const updateSocio = (index, field, value) => {
    setSocios((s) => s.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const removeSocio = (index) => {
    setSocios((s) => s.filter((_, i) => i !== index));
  };

  // --- Historial real de cotizaciones (enviadas/ganadas/perdidas) ---------
  const [historial, setHistorial] = useState([]);
  const [historialCargando, setHistorialCargando] = useState(true);
  const [historialError, setHistorialError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/leer-historial")
      .then((r) => r.json())
      .then((data) => {
        if (cancelado) return;
        if (data?.error) {
          setHistorialError(data.error);
        } else {
          setHistorial(data?.historial ?? []);
        }
      })
      .catch((err) => {
        if (!cancelado) setHistorialError(String(err));
      })
      .finally(() => {
        if (!cancelado) setHistorialCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // --- Sugerencias reales (generadas por análisis del historial) ----------
  const [sugerencias, setSugerencias] = useState([]);
  const [sugerenciasCargando, setSugerenciasCargando] = useState(true);
  const [sugerenciasError, setSugerenciasError] = useState(null);
  const [sugerenciasMeta, setSugerenciasMeta] = useState(null); // { generadas_en, datos_insuficientes, mensaje }
  const [generandoSugerencias, setGenerandoSugerencias] = useState(false);
  const [sugerenciasDescartadas, setSugerenciasDescartadas] = useState([]); // ids descartadas localmente (👎)

  const cargarSugerencias = () => {
    setSugerenciasCargando(true);
    setSugerenciasError(null);
    fetch("/api/leer-sugerencias")
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) {
          setSugerenciasError(data.error);
        } else {
          setSugerencias(data?.sugerencias ?? []);
          setSugerenciasMeta(data ?? null);
        }
      })
      .catch((err) => setSugerenciasError(String(err)))
      .finally(() => setSugerenciasCargando(false));
  };

  useEffect(() => {
    cargarSugerencias();
  }, []);

  // --- Cotizaciones abiertas (en curso, todavía no aprobadas) -------------
  const [cotizacionesAbiertas, setCotizacionesAbiertas] = useState([]);
  const [cotizacionesAbiertasCargando, setCotizacionesAbiertasCargando] = useState(true);

  useEffect(() => {
    fetch("/api/leer-cotizaciones-abiertas")
      .then((r) => r.json())
      .then((data) => setCotizacionesAbiertas(data?.abiertas ?? []))
      .catch(() => setCotizacionesAbiertas([]))
      .finally(() => setCotizacionesAbiertasCargando(false));
  }, []);

  const generarSugerencias = async () => {
    setGenerandoSugerencias(true);
    setSugerenciasError(null);
    try {
      const resp = await fetch("/api/generar-sugerencias", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) {
        setSugerenciasError(data.error || "No se pudieron generar las sugerencias.");
      } else {
        setSugerencias(data?.sugerencias ?? []);
        setSugerenciasMeta(data ?? null);
        setSugerenciasDescartadas([]);
      }
    } catch (err) {
      setSugerenciasError(String(err));
    } finally {
      setGenerandoSugerencias(false);
    }
  };


  const [fechaBusqueda, setFechaBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null); // { ok, mensaje }

  const [buscandoCompraAgil, setBuscandoCompraAgil] = useState(false);
  const [resultadoBusquedaCompraAgil, setResultadoBusquedaCompraAgil] = useState(null); // { ok, mensaje }

  const dispararBusquedaCompraAgil = async () => {
    setBuscandoCompraAgil(true);
    setResultadoBusquedaCompraAgil(null);
    try {
      const fechaFormateada = fechaBusqueda
        ? fechaBusqueda.split("-").reverse().join("") // yyyy-mm-dd -> ddmmaaaa
        : "";
      const resp = await fetch("/api/buscar-compra-agil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: fechaFormateada }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setResultadoBusquedaCompraAgil({
          ok: true,
          mensaje: `Búsqueda de Compra Ágil lanzada para ${data.fecha === "hoy" ? "hoy" : fechaBusqueda}. Revisa la pestaña "Actions" en GitHub en 1-2 minutos, o tu correo si encuentra algo.`,
        });
      } else {
        setResultadoBusquedaCompraAgil({ ok: false, mensaje: data.error || "Error desconocido." });
      }
    } catch (err) {
      setResultadoBusquedaCompraAgil({ ok: false, mensaje: "No se pudo contactar al servidor: " + String(err) });
    } finally {
      setBuscandoCompraAgil(false);
    }
  };

  const dispararBusqueda = async () => {
    setBuscando(true);
    setResultadoBusqueda(null);
    try {
      const fechaFormateada = fechaBusqueda
        ? fechaBusqueda.split("-").reverse().join("") // yyyy-mm-dd -> ddmmaaaa
        : "";
      const resp = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: fechaFormateada }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setResultadoBusqueda({
          ok: true,
          mensaje: `Búsqueda lanzada para ${data.fecha === "hoy" ? "hoy" : fechaBusqueda}. Revisa la pestaña "Actions" en GitHub en 1-2 minutos, o tu correo si encuentra algo.`,
        });
      } else {
        setResultadoBusqueda({ ok: false, mensaje: data.error || "Error desconocido." });
      }
    } catch (err) {
      setResultadoBusqueda({ ok: false, mensaje: "No se pudo contactar al servidor: " + String(err) });
    } finally {
      setBuscando(false);
    }
  };

  const toggleRegion = (r) =>
    setRegions((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));

  const updatePrice = (id, field, value) =>
    setPrices((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const removePrice = (id) => setPrices((ps) => ps.filter((p) => p.id !== id));

  const addPrice = () =>
    setPrices((ps) => [...ps, { id: Date.now(), item: "Nuevo ítem", unit: "unidad", price: 0 }]);

  const removeHorario = (h) => setHorarios((hs) => hs.filter((x) => x !== h));

  const addHorario = () => {
    if (!/^\d{2}:\d{2}$/.test(newHorario)) return;
    setHorarios((hs) => [...hs, newHorario].sort());
    setNewHorario("");
  };

  const sensitivityLabel =
    sensitivity < 34 ? "AMPLIO" : sensitivity < 67 ? "MEDIO" : "ESTRICTO";

  // --- Protección con clave compartida ------------------------------------
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem("sigpal-unlocked") === "true"
  );
  const [claveInput, setClaveInput] = useState("");
  const [claveError, setClaveError] = useState(false);
  const CLAVE_ACCESO = "sigpal2026"; // <-- cambia esto por la clave que acuerden los 3 socios

  const intentarDesbloquear = (e) => {
    e.preventDefault();
    if (claveInput === CLAVE_ACCESO) {
      sessionStorage.setItem("sigpal-unlocked", "true");
      setUnlocked(true);
      setClaveError(false);
    } else {
      setClaveError(true);
    }
  };

  // Eliminar una cotización aprobada del historial — pide la clave de
  // acceso de nuevo como confirmación extra, aunque la sesión ya esté
  // desbloqueada, justo para que un clic accidental no borre nada. No
  // se puede deshacer: se saca de historial_cotizaciones.json.
  const eliminarCotizacionHistorial = async (codigo, nombre) => {
    const clave = window.prompt(
      `Para eliminar "${nombre}" del historial, ingresa la clave de acceso:`
    );
    if (clave === null) return; // canceló el prompt
    if (clave !== CLAVE_ACCESO) {
      window.alert("Clave incorrecta. No se eliminó nada.");
      return;
    }
    if (!window.confirm(
      `¿Confirmas eliminar "${nombre}" del historial? Esta acción no se puede deshacer.`
    )) return;

    try {
      const resp = await fetch("/api/eliminar-cotizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        window.alert(data.error || "No se pudo eliminar la cotización.");
        return;
      }
      setHistorial((h) => h.filter((item) => item.codigo !== codigo));
    } catch (err) {
      window.alert("Error al eliminar: " + err);
    }
  };

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          color: C.text,
          fontFamily: "Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <style>{FONTS}</style>
        <form
          onSubmit={intentarDesbloquear}
          style={{
            width: "100%",
            maxWidth: 340,
            background: C.panel,
            border: `1px solid ${C.lineSoft}`,
            borderRadius: 8,
            padding: 28,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              margin: "0 auto 16px",
              borderRadius: 8,
              background: C.raised,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={20} color={C.amber} />
          </div>
          <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 6 }}>
            Panel de Sigpal
          </div>
          <div style={{ fontSize: 12.5, color: C.textMute, marginBottom: 18 }}>
            Ingresa la clave compartida entre los socios para continuar.
          </div>
          <input
            type="password"
            autoFocus
            value={claveInput}
            onChange={(e) => {
              setClaveInput(e.target.value);
              setClaveError(false);
            }}
            placeholder="Clave de acceso"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: C.panelAlt,
              border: `1px solid ${claveError ? C.red : C.lineSoft}`,
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 14,
              color: C.text,
              outline: "none",
              marginBottom: 10,
              textAlign: "center",
            }}
          />
          {claveError && (
            <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>Clave incorrecta.</div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 6,
              border: `1px solid ${C.amberDim}`,
              background: C.amberSoft,
              color: C.amber,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "Inter, sans-serif",
        display: "flex",
      }}
    >
      <style>{FONTS}</style>

      {/* ---------------------------------------------------------- Sidebar */}
      <div
        className="hidden md:flex"
        style={{
          width: 240,
          flexShrink: 0,
          background: C.sidebarBg,
          color: C.sidebarText,
          borderRight: `1px solid ${C.sidebarLine}`,
          flexDirection: "column",
          padding: "22px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 34, paddingLeft: 4 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: C.sidebarBgRaised,
              border: `1px solid ${C.sidebarLine}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={16} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontWeight: 700,
                fontSize: 16.5,
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              SIGPAL
            </div>
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 9.5,
                color: C.sidebarMute,
                letterSpacing: "0.1em",
                marginTop: 2,
              }}
            >
              LICITACIONES BOT
            </div>
          </div>
        </div>

        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: C.sidebarMute,
            letterSpacing: "0.08em",
            marginBottom: 10,
            paddingLeft: 4,
          }}
        >
          GENERAL
        </div>

        {TABS_GENERAL.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 6,
                border: "none",
                marginBottom: 4,
                background: active ? "rgba(255,255,255,0.16)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: active ? 18 : 0,
                  background: "#FFFFFF",
                  borderRadius: 2,
                  transition: "height .15s ease",
                }}
              />
              <Icon size={15} color={active ? "#FFFFFF" : C.sidebarMute} strokeWidth={2} />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? "#FFFFFF" : C.sidebarMute,
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}

        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: C.sidebarMute,
            letterSpacing: "0.08em",
            margin: "18px 0 10px",
            paddingLeft: 4,
          }}
        >
          CONFIGURACIÓN
        </div>

        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 6,
                border: "none",
                marginBottom: 4,
                background: active ? "rgba(255,255,255,0.16)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: active ? 18 : 0,
                  background: "#FFFFFF",
                  borderRadius: 2,
                  transition: "height .15s ease",
                }}
              />
              <Icon size={15} color={active ? "#FFFFFF" : C.sidebarMute} strokeWidth={2} />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? "#FFFFFF" : C.sidebarMute,
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}

        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            color: C.sidebarMute,
            letterSpacing: "0.08em",
            margin: "18px 0 10px",
            paddingLeft: 4,
          }}
        >
          ANÁLISIS
        </div>

        {TABS_ANALISIS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 6,
                border: "none",
                marginBottom: 4,
                background: active ? "rgba(255,255,255,0.16)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: active ? 18 : 0,
                  background: "#FFFFFF",
                  borderRadius: 2,
                  transition: "height .15s ease",
                }}
              />
              <Icon size={15} color={active ? "#FFFFFF" : C.sidebarMute} strokeWidth={2} />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? "#FFFFFF" : C.sidebarMute,
                }}
              >
                {t.label}
              </span>
              {t.id === "sugerencias" && sugerencias.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#FFFFFF",
                    color: C.sidebarBg,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "1px 6px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {sugerencias.length}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: 20 }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: C.sidebarMute, letterSpacing: "0.06em" }}>
              ESTADO
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: "#6FE39A" }} />
              <span style={{ fontSize: 12, color: "#FFFFFF" }}>Guardado en este navegador</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ Main */}
      <div style={{ flex: 1, padding: "24px 28px 60px", maxWidth: 980 }}>
        {/* Nameplate header */}
        <div
          style={{
            position: "relative",
            background: `linear-gradient(180deg, ${C.panelAlt}, ${C.panel})`,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ position: "absolute", top: 8, left: 8 }}><Rivet /></div>
          <div style={{ position: "absolute", top: 8, right: 8 }}><Rivet /></div>
          <div style={{ position: "absolute", bottom: 8, left: 8 }}><Rivet /></div>
          <div style={{ position: "absolute", bottom: 8, right: 8 }}><Rivet /></div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <FieldLabel>Proyecto</FieldLabel>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 19, fontWeight: 600 }}>
                Panel de Configuración
              </div>
            </div>
            <div>
              <FieldLabel>Rubros activos</FieldLabel>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, color: C.amber }}>
                {categories.filter((c) => c.active).length} / {categories.length}
              </div>
            </div>
            <div>
              <FieldLabel>Regiones</FieldLabel>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, color: C.cyan }}>
                {regions.length}
              </div>
            </div>
            <div>
              <FieldLabel>Sensibilidad</FieldLabel>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15 }}>
                {sensitivityLabel}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              title="Cotizaciones en curso"
              style={{
                position: "relative",
                width: 38,
                height: 38,
                borderRadius: 8,
                background: C.panelAlt,
                border: `1px solid ${C.lineSoft}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bell size={16} color={C.textMute} />
              {cotizacionesAbiertas.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: C.red,
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {cotizacionesAbiertas.length}
                </span>
              )}
            </div>
            <button
              onClick={flashSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 6,
                border: `1px solid ${savedFlash ? C.green : C.amberDim}`,
                background: savedFlash ? C.greenSoft : C.amberSoft,
                color: savedFlash ? C.green : C.amber,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .15s ease",
              }}
            >
              {savedFlash ? <Check size={15} /> : <Save size={15} />}
              {savedFlash ? "Guardado" : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex md:hidden" style={{ gap: 6, marginBottom: 20, overflowX: "auto" }}>
          {[...TABS, ...TABS_ANALISIS].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: `1px solid ${tab === t.id ? C.amberDim : C.line}`,
                background: tab === t.id ? C.amberSoft : "transparent",
                color: tab === t.id ? C.amber : C.textMute,
                fontSize: 12.5,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------- RUBROS TAB */}
        {/* ------------------------------------------------------ RESUMEN TAB */}
        {tab === "resumen" && (
          <ResumenGeneral
            historial={historial}
            historialCargando={historialCargando}
            cotizacionesAbiertas={cotizacionesAbiertas}
            cotizacionesAbiertasCargando={cotizacionesAbiertasCargando}
            setTab={setTab}
          />
        )}

        {tab === "rubros" && (
          <div>
            <div style={{ marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                  Rubros y palabras clave
                </div>
                <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                  Activa o desactiva rubros y ajusta las palabras que el bot busca en cada licitación.
                </div>
              </div>
              <button
                onClick={addCategory}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 14px",
                  borderRadius: 6,
                  border: `1px solid ${C.amberDim}`,
                  background: C.amberSoft,
                  color: C.amber,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={14} /> Agregar rubro
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categories.map((cat) => {
                const Icon = ICONS[cat.icon] || Wrench;
                return (
                  <div
                    key={cat.id}
                    style={{
                      background: C.panel,
                      border: `1px solid ${cat.active ? C.lineSoft : C.lineSoft}`,
                      borderLeft: `3px solid ${cat.active ? C.amber : C.line}`,
                      borderRadius: 6,
                      padding: 16,
                      opacity: cat.active ? 1 : 0.55,
                      transition: "opacity .15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            background: C.raised,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={15} color={cat.active ? C.amber : C.textFaint} />
                        </div>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{cat.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Toggle on={cat.active} onClick={() => toggleCategory(cat.id)} />
                        <X
                          size={15}
                          color={C.textFaint}
                          style={{ cursor: "pointer" }}
                          onClick={() => removeCategory(cat.id)}
                        />
                      </div>
                    </div>

                    <FieldLabel>Palabras clave</FieldLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {cat.keywords.map((kw) => (
                        <span
                          key={kw}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: C.panelAlt,
                            border: `1px solid ${C.lineSoft}`,
                            fontSize: 12,
                            color: C.textMute,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {kw}
                          <X
                            size={11}
                            style={{ cursor: "pointer" }}
                            onClick={() => removeKeyword(cat.id, kw)}
                          />
                        </span>
                      ))}
                      <KeywordAdder onAdd={(v) => addKeyword(cat.id, v)} />
                    </div>

                    <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                      <div>
                        <FieldLabel>Monto mín. (UTM)</FieldLabel>
                        <input
                          type="number"
                          value={cat.montoMin}
                          onChange={(e) => updateCategoryField(cat.id, "montoMin", Number(e.target.value))}
                          style={inputStyle(80)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Monto máx. (UTM)</FieldLabel>
                        <input
                          type="number"
                          value={cat.montoMax}
                          onChange={(e) => updateCategoryField(cat.id, "montoMax", Number(e.target.value))}
                          style={inputStyle(80)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionNote>
              Estas palabras clave y rangos son lo que el motor de análisis usará para calcular el
              "match" de cada licitación nueva. Aún no está conectado al bot — este dashboard guarda la
              configuración que usaremos cuando programemos el motor de búsqueda.
            </SectionNote>
          </div>
        )}

        {/* ----------------------------------------------------- ZONAS TAB */}
        {tab === "zonas" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Regiones donde opera Sigpal
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Selecciona las regiones donde el bot debe buscar licitaciones.
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 8,
              }}
            >
              {REGIONS.map((r) => {
                const on = regions.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleRegion(r)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${on ? C.amberDim : C.lineSoft}`,
                      background: on ? C.amberSoft : C.panel,
                      color: on ? C.amber : C.textMute,
                      fontSize: 12.5,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <MapPin size={13} />
                    {r}
                  </button>
                );
              })}
            </div>

            <SectionNote>
              Recomendación: parte con las regiones donde Sigpal ya tiene logística instalada (traslado
              de materiales, técnicos disponibles). Agregar regiones lejanas sin cobertura solo generará
              notificaciones de licitaciones que después descartarás igual.
            </SectionNote>
          </div>
        )}

        {/* ---------------------------------------------------- PRECIOS TAB */}
        {tab === "precios" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                  Precios base
                </div>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    color: C.red,
                    border: `1px solid ${C.red}55`,
                    borderRadius: 4,
                    padding: "2px 7px",
                  }}
                >
                  PROVISORIO
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Tarifas referenciales que el motor usará para armar el borrador de cotización.
              </div>
            </div>

            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 140px 32px",
                  padding: "10px 14px",
                  background: C.panelAlt,
                  borderBottom: `1px solid ${C.lineSoft}`,
                }}
              >
                <FieldLabel>Ítem</FieldLabel>
                <FieldLabel>Unidad</FieldLabel>
                <FieldLabel>Precio CLP</FieldLabel>
                <span />
              </div>
              {prices.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px 140px 32px",
                    padding: "8px 14px",
                    alignItems: "center",
                    borderBottom: `1px solid ${C.lineSoft}`,
                  }}
                >
                  <input
                    value={p.item}
                    onChange={(e) => updatePrice(p.id, "item", e.target.value)}
                    style={inputStyle("100%", true)}
                  />
                  <input
                    value={p.unit}
                    onChange={(e) => updatePrice(p.id, "unit", e.target.value)}
                    style={inputStyle(90, true)}
                  />
                  <input
                    type="number"
                    value={p.price}
                    onChange={(e) => updatePrice(p.id, "price", Number(e.target.value))}
                    style={inputStyle(120, true)}
                  />
                  <X
                    size={14}
                    color={C.textFaint}
                    style={{ cursor: "pointer", justifySelf: "center" }}
                    onClick={() => removePrice(p.id)}
                  />
                </div>
              ))}
              <button
                onClick={addPrice}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  border: "none",
                  background: "transparent",
                  color: C.amber,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Agregar ítem
              </button>
            </div>

            <SectionNote>
              Estos valores son <strong style={{ color: C.text }}>provisorios</strong>, recopilados de
              referencias de mercado chileno de agosto 2026 (instaladoras solares, tarifas de
              electricistas y mano de obra de estructuras metálicas). No son precios de Sigpal — son un
              punto de partida para que el bot pueda funcionar mientras defines los valores reales con tu
              socio. Reemplázalos apenas los tengan cerrados; el resto de la configuración no depende de
              esto.
            </SectionNote>
          </div>
        )}

        {/* --------------------------------------------------- HORARIOS TAB */}
        {tab === "horarios" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Ventanas de revisión
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Horarios del día en que el bot entra a revisar y analizar licitaciones nuevas.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {horarios.map((h) => (
                <span
                  key={h}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: C.panel,
                    border: `1px solid ${C.lineSoft}`,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 14,
                  }}
                >
                  <Clock size={13} color={C.amber} />
                  {h}
                  <X size={12} style={{ cursor: "pointer" }} color={C.textFaint} onClick={() => removeHorario(h)} />
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 28 }}>
              <input
                placeholder="HH:MM"
                value={newHorario}
                onChange={(e) => setNewHorario(e.target.value)}
                style={inputStyle(90)}
              />
              <button
                onClick={addHorario}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: `1px solid ${C.amberDim}`,
                  background: C.amberSoft,
                  color: C.amber,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Agregar horario
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Sensibilidad del filtro
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Qué tan exigente es el bot antes de notificarte una licitación como oportunidad.
              </div>
            </div>

            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.textMute, fontFamily: "JetBrains Mono, monospace" }}>
                  AMPLIO
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.amber,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {sensitivityLabel} ({sensitivity})
                </span>
                <span style={{ fontSize: 12, color: C.textMute, fontFamily: "JetBrains Mono, monospace" }}>
                  ESTRICTO
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                style={{ width: "100%", accentColor: C.amber }}
              />
              <div style={{ fontSize: 12.5, color: C.textMute, marginTop: 12, lineHeight: 1.6 }}>
                {sensitivity < 34
                  ? "El bot te avisará de casi todo lo que roce tus rubros, aunque el calce no sea perfecto. Más notificaciones, más revisión manual."
                  : sensitivity < 67
                  ? "Equilibrio entre no perderte oportunidades y no saturarte de avisos poco relevantes."
                  : "Solo te notificará cuando el calce con tus rubros, montos y zonas sea muy claro. Menos avisos, mayor precisión."}
              </div>
            </div>

            <SectionNote>
              Estas ventanas horarias son las que después configuraremos como tareas programadas (cron)
              para que el bot entre, revise, y te notifique — sin quedar conectado todo el día.
            </SectionNote>
          </div>
        )}

        {/* ----------------------------------------------- NOTIFICACIONES TAB */}
        {tab === "notificaciones" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Socios y notificaciones
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                A quién le llegan los avisos cuando el bot encuentra una oportunidad. Cada socio puede
                recibirlo por correo, WhatsApp, o ambos.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {socios.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.lineSoft}`,
                    borderLeft: `3px solid ${C.cyan}`,
                    borderRadius: 6,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <input
                      value={s.nombre}
                      onChange={(e) => updateSocio(i, "nombre", e.target.value)}
                      placeholder="Nombre del socio"
                      style={{ ...inputStyle(220), fontWeight: 600, fontSize: 14 }}
                    />
                    <X
                      size={15}
                      color={C.textFaint}
                      style={{ cursor: "pointer" }}
                      onClick={() => removeSocio(i)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <FieldLabel>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Mail size={11} /> Correo
                        </span>
                      </FieldLabel>
                      <input
                        value={s.email}
                        onChange={(e) => updateSocio(i, "email", e.target.value)}
                        placeholder="correo@ejemplo.com"
                        style={inputStyle("100%")}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <FieldLabel>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Phone size={11} /> WhatsApp (con código de país)
                        </span>
                      </FieldLabel>
                      <input
                        value={s.whatsapp}
                        onChange={(e) => updateSocio(i, "whatsapp", e.target.value)}
                        placeholder="+56 9 1234 5678"
                        style={inputStyle("100%")}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addSocio}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "12px",
                  borderRadius: 6,
                  border: `1px dashed ${C.line}`,
                  background: "transparent",
                  color: C.textMute,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Plus size={14} /> Agregar socio
              </button>
            </div>

            <SectionNote>
              El correo (vía Gmail) y WhatsApp (vía WhatsApp Business API) ya están conectados y
              funcionando para todos los socios de arriba.
            </SectionNote>

            <div style={{ marginTop: 32, marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Preferencias por tipo de aviso
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Qué avisos quieres recibir por cada canal. Se aplica a todos los socios de arriba.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {NOTIF_EVENTOS.map((ev) => {
                const pref = notifPrefs[ev.id] ?? { correo: true, whatsapp: true };
                return (
                  <div
                    key={ev.id}
                    style={{
                      background: C.panel,
                      border: `1px solid ${C.lineSoft}`,
                      borderRadius: 6,
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.label}</div>
                      <div style={{ fontSize: 12.5, color: C.textMute, marginTop: 3, lineHeight: 1.5 }}>
                        {ev.desc}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 22 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            color: C.textMute,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          <Mail size={12} /> Correo
                        </span>
                        <Toggle on={pref.correo} onClick={() => toggleNotifCanal(ev.id, "correo")} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            color: C.textMute,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          <Phone size={12} /> WhatsApp
                        </span>
                        <Toggle on={pref.whatsapp} onClick={() => toggleNotifCanal(ev.id, "whatsapp")} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionNote>
              Si apagas ambos canales de un aviso, ese aviso simplemente no se manda — no queda
              registrado en ningún lado. Por ejemplo, para recibir solo el correo de confirmación
              cuando apruebas una cotización, deja "Cotización aprobada" con Correo activado y
              WhatsApp apagado, y apaga los demás avisos por correo si no los quieres.
            </SectionNote>
          </div>
        )}

        {/* --------------------------------------------------- BÚSQUEDA TAB */}
        {tab === "busqueda" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Búsqueda manual por fecha
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Lanza al bot ahora mismo para que revise un día específico, en vez de esperar a las
                ventanas horarias automáticas.
              </div>
            </div>

            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                padding: 20,
                maxWidth: 420,
              }}
            >
              <FieldLabel>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={11} /> Fecha a revisar
                </span>
              </FieldLabel>
              <input
                type="date"
                value={fechaBusqueda}
                onChange={(e) => setFechaBusqueda(e.target.value)}
                style={{ ...inputStyle("100%"), marginBottom: 6 }}
              />
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 16 }}>
                Déjalo vacío para revisar el día de hoy.
              </div>

              <button
                onClick={dispararBusqueda}
                disabled={buscando}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px",
                  borderRadius: 6,
                  border: `1px solid ${C.amberDim}`,
                  background: C.amberSoft,
                  color: C.amber,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: buscando ? "default" : "pointer",
                  opacity: buscando ? 0.7 : 1,
                }}
              >
                {buscando ? (
                  <>
                    <Loader2 size={15} /> Lanzando búsqueda...
                  </>
                ) : (
                  <>
                    <Search size={15} /> Buscar ahora
                  </>
                )}
              </button>

              {resultadoBusqueda && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    background: resultadoBusqueda.ok ? C.greenSoft : C.redSoft,
                    border: `1px solid ${resultadoBusqueda.ok ? C.green : C.red}55`,
                    color: resultadoBusqueda.ok ? C.green : C.red,
                  }}
                >
                  {resultadoBusqueda.mensaje}
                </div>
              )}

              <div style={{ height: 1, background: C.lineSoft, margin: "18px 0" }} />

              <FieldLabel>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Search size={11} /> Compra Ágil
                </span>
              </FieldLabel>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginBottom: 10 }}>
                Busca por separado en el mecanismo de Compra Ágil (usa la misma fecha de arriba).
              </div>

              <button
                onClick={dispararBusquedaCompraAgil}
                disabled={buscandoCompraAgil}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px",
                  borderRadius: 6,
                  border: `1px solid ${C.amberDim}`,
                  background: C.amberSoft,
                  color: C.amber,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: buscandoCompraAgil ? "default" : "pointer",
                  opacity: buscandoCompraAgil ? 0.7 : 1,
                }}
              >
                {buscandoCompraAgil ? (
                  <>
                    <Loader2 size={15} /> Lanzando búsqueda...
                  </>
                ) : (
                  <>
                    <Search size={15} /> Buscar en Compra Ágil
                  </>
                )}
              </button>

              {resultadoBusquedaCompraAgil && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    background: resultadoBusquedaCompraAgil.ok ? C.greenSoft : C.redSoft,
                    border: `1px solid ${resultadoBusquedaCompraAgil.ok ? C.green : C.red}55`,
                    color: resultadoBusquedaCompraAgil.ok ? C.green : C.red,
                  }}
                >
                  {resultadoBusquedaCompraAgil.mensaje}
                </div>
              )}
            </div>

            <SectionNote>
              Esto dispara el mismo motor que corre automáticamente, pero para la fecha que elijas. El
              resultado (si hay licitaciones que calcen) te llega por correo, igual que siempre — este
              panel solo confirma que la orden se envió, no te muestra los resultados en vivo. Las
              corridas automáticas ya revisan ambos mecanismos (Licitaciones y Compra Ágil) juntas; estos
              botones son solo para forzar una revisión puntual de uno u otro por separado.
            </SectionNote>
          </div>
        )}

        {/* --------------------------------------------------- HISTORIAL TAB */}
        {tab === "historial" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Historial de licitaciones
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Todo lo que el bot detectó, analizó y en qué terminó cada caso.
              </div>
            </div>

            {!cotizacionesAbiertasCargando && cotizacionesAbiertas.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8, color: C.text }}>
                  Cotizaciones en curso ({cotizacionesAbiertas.length}) — todavía no enviadas
                </div>
                <div
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.lineSoft}`,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  {cotizacionesAbiertas.map((c, i) => (
                    <div
                      key={c.codigo}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderTop: i === 0 ? "none" : `1px solid ${C.lineSoft}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11.5,
                          color: C.amber,
                          flexShrink: 0,
                        }}
                      >
                        {c.codigo}
                      </span>
                      <span style={{ fontSize: 12.5, color: C.text, flex: 1 }}>{c.nombre}</span>
                      <a
                        href={`/api/ver-pdf?codigo=${encodeURIComponent(c.codigo)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 10.5,
                          fontFamily: "JetBrains Mono, monospace",
                          color: C.cyan,
                          textDecoration: "none",
                          flexShrink: 0,
                        }}
                      >
                        Ver PDF
                      </a>
                      {c.socios?.some((s) => s.es_activa) && (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "JetBrains Mono, monospace",
                            color: C.cyan,
                            background: C.panelAlt,
                            borderRadius: 999,
                            padding: "2px 8px",
                          }}
                        >
                          en foco
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 6 }}>
                  Para descartar una sin enviarla, escribí por WhatsApp "cierra la [código]" o "descarta
                  esta". Para aprobarla y enviarla, escribí "aprobada".
                </div>
              </div>
            )}

            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.lineSoft}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 150px 60px 110px 100px 60px 70px",
                  padding: "10px 14px",
                  background: C.panelAlt,
                  borderBottom: `1px solid ${C.lineSoft}`,
                  gap: 10,
                }}
              >
                <FieldLabel>Fecha</FieldLabel>
                <FieldLabel>Licitación</FieldLabel>
                <FieldLabel>Rubro</FieldLabel>
                <FieldLabel>Score</FieldLabel>
                <FieldLabel>Decisión</FieldLabel>
                <FieldLabel>Resultado</FieldLabel>
                <FieldLabel>PDF</FieldLabel>
                <FieldLabel></FieldLabel>
              </div>
              {historialCargando && (
                <div style={{ padding: "24px 14px", fontSize: 13, color: C.textMute }}>
                  Cargando historial...
                </div>
              )}

              {!historialCargando && historialError && (
                <div style={{ padding: "24px 14px", fontSize: 13, color: C.red }}>
                  No se pudo cargar el historial: {historialError}
                </div>
              )}

              {!historialCargando && !historialError && historial.length === 0 && (
                <div style={{ padding: "24px 14px", fontSize: 13, color: C.textMute }}>
                  Todavía no hay cotizaciones registradas. Aparecerán acá apenas apruebes la primera
                  cotización por WhatsApp.
                </div>
              )}

              {!historialCargando &&
                !historialError &&
                historial
                  .slice()
                  .sort((a, b) => new Date(b.fecha_envio || 0) - new Date(a.fecha_envio || 0))
                  .map((h) => (
                    <div
                      key={h.codigo}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "90px 1fr 150px 60px 110px 100px 60px 70px",
                        padding: "12px 14px",
                        gap: 10,
                        alignItems: "center",
                        borderBottom: `1px solid ${C.lineSoft}`,
                      }}
                    >
                      <span style={{ fontSize: 12, color: C.textMute, fontFamily: "JetBrains Mono, monospace" }}>
                        {fmtFechaHistorial(h.fecha_envio)}
                      </span>
                      <span style={{ fontSize: 13 }}>{h.nombre}</span>
                      <span style={{ fontSize: 12, color: C.textMute }}>{h.rubro}</span>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontFamily: "JetBrains Mono, monospace",
                          color: h.score >= 70 ? C.green : h.score >= 40 ? C.amber : C.red,
                        }}
                      >
                        {h.score ?? "—"}
                      </span>
                      <DecisionBadge value={h.decision} />
                      <span style={{ fontSize: 12, color: C.textMute }}>
                        {h.resultado === "ganada" && <span style={{ color: C.green }}>Ganada</span>}
                        {h.resultado === "perdida" && <span style={{ color: C.red }}>Perdida</span>}
                        {h.resultado === "pendiente" && "Pendiente"}
                        {!h.resultado && "—"}
                      </span>
                      {h.codigo ? (
                        <a
                          href={`/api/ver-pdf?codigo=${encodeURIComponent(h.codigo)}&aprobada=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            fontFamily: "JetBrains Mono, monospace",
                            color: C.cyan,
                            textDecoration: "none",
                          }}
                        >
                          Ver
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textFaint }}>—</span>
                      )}
                      <button
                        onClick={() => eliminarCotizacionHistorial(h.codigo, h.nombre)}
                        style={{
                          fontSize: 11,
                          fontFamily: "JetBrains Mono, monospace",
                          color: C.red,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textAlign: "left",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
            </div>

            <SectionNote>
              Acá queda cada cotización que se aprueba por WhatsApp. Cuando la licitación se adjudica, el
              bot revisa automáticamente si Sigpal ganó o no, y actualiza el resultado — avisando por
              correo y WhatsApp si se ganó. Eliminar del historial pide la clave de acceso de nuevo como
              confirmación extra — es una acción que no se puede deshacer.
            </SectionNote>
          </div>
        )}

        {/* ------------------------------------------------- SUGERENCIAS TAB */}
        {tab === "sugerencias" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                  Sugerencias para mejorar el criterio
                </div>
                <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                  {sugerenciasMeta?.generadas_en
                    ? `Última actualización: ${new Date(sugerenciasMeta.generadas_en).toLocaleString("es-CL")}`
                    : "Ideas generadas a partir de tu historial real, para ajustar rubros, precios o zonas."}
                </div>
              </div>
              <button
                onClick={generarSugerencias}
                disabled={generandoSugerencias}
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: generandoSugerencias ? C.textFaint : C.cyan,
                  background: C.panel,
                  border: `1px solid ${C.lineSoft}`,
                  borderRadius: 6,
                  padding: "8px 14px",
                  cursor: generandoSugerencias ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {generandoSugerencias ? "Analizando..." : "Generar sugerencias"}
              </button>
            </div>

            {sugerenciasError && (
              <div
                style={{
                  background: "rgba(220,80,80,0.08)",
                  border: `1px solid ${C.red}`,
                  borderRadius: 6,
                  padding: 14,
                  fontSize: 13,
                  color: C.text,
                  marginBottom: 14,
                }}
              >
                No se pudo generar/leer sugerencias: {sugerenciasError}
              </div>
            )}

            {sugerenciasCargando && !sugerenciasError && (
              <div style={{ fontSize: 13, color: C.textMute }}>Cargando sugerencias…</div>
            )}

            {!sugerenciasCargando && !sugerenciasError && sugerenciasMeta?.nunca_generadas && (
              <div
                style={{
                  background: C.panel,
                  border: `1px solid ${C.lineSoft}`,
                  borderRadius: 6,
                  padding: 20,
                  fontSize: 13,
                  color: C.textMute,
                  lineHeight: 1.6,
                }}
              >
                Todavía no se generó ninguna sugerencia. Tocá "Generar sugerencias" para que el bot
                analice tu historial real de cotizaciones (ganadas, perdidas, pendientes) y te proponga
                ajustes concretos.
              </div>
            )}

            {!sugerenciasCargando && !sugerenciasError && sugerenciasMeta?.datos_insuficientes && (
              <div
                style={{
                  background: C.panel,
                  border: `1px solid ${C.lineSoft}`,
                  borderRadius: 6,
                  padding: 20,
                  fontSize: 13,
                  color: C.textMute,
                  lineHeight: 1.6,
                }}
              >
                {sugerenciasMeta.mensaje ||
                  "Todavía hay muy pocos datos con resultado conocido para generar sugerencias confiables."}
              </div>
            )}

            {!sugerenciasCargando &&
              !sugerenciasError &&
              !sugerenciasMeta?.nunca_generadas &&
              !sugerenciasMeta?.datos_insuficientes &&
              sugerencias.length === 0 && (
                <div style={{ fontSize: 13, color: C.textMute }}>
                  El último análisis no encontró ninguna sugerencia para proponer por ahora.
                </div>
              )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sugerencias
                .filter((s) => !sugerenciasDescartadas.includes(s.id))
                .map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: C.panel,
                      border: `1px solid ${C.lineSoft}`,
                      borderLeft: `3px solid ${C.cyan}`,
                      borderRadius: 6,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: C.panelAlt,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {s.tipo === "ajuste" && <SlidersHorizontal size={13} color={C.cyan} />}
                        {s.tipo === "oportunidad" && <TrendingUp size={13} color={C.green} />}
                        {s.tipo === "precio" && <DollarSign size={13} color={C.amber} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{s.titulo}</div>
                        <div style={{ fontSize: 12.5, color: C.textMute, lineHeight: 1.55, marginBottom: 10 }}>
                          {s.detalle}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11.5,
                              color: C.cyan,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {s.accion} <ArrowRight size={11} />
                          </span>
                          <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                            <ThumbsUp
                              size={13}
                              color={C.textFaint}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSugerenciasDescartadas((d) => [...d, s.id])}
                            />
                            <ThumbsDown
                              size={13}
                              color={C.textFaint}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSugerenciasDescartadas((d) => [...d, s.id])}
                            />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <SectionNote>
              El bot compara tus decisiones reales (qué aprobaste, y de eso qué ganaste o perdiste) contra
              el criterio configurado y te propone ajustes concretos — tú decidís si aplicarlos en la
              sección correspondiente, nunca se cambian solos. 👍/👎 solo ocultan la tarjeta en esta
              sesión, no modifican ninguna configuración.
            </SectionNote>
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionBadge({ value }) {
  const map = {
    enviada: { color: C.cyan, label: "Enviada" },
    aprobada: { color: C.green, label: "Aprobada" },
    rechazada: { color: C.red, label: "Rechazada" },
    descartada: { color: C.textFaint, label: "Descartada" },
  };
  const cfg = map[value] || { color: C.textFaint, label: value };
  return (
    <span
      style={{
        fontSize: 11,
        color: cfg.color,
        fontFamily: "JetBrains Mono, monospace",
        border: `1px solid ${cfg.color}55`,
        borderRadius: 4,
        padding: "2px 6px",
        width: "fit-content",
      }}
    >
      {cfg.label}
    </span>
  );
}

function KeywordAdder({ onAdd }) {
  const [v, setV] = useState("");
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(v);
            setV("");
          }
        }}
        placeholder="+ palabra"
        style={{
          background: "transparent",
          border: `1px dashed ${C.line}`,
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 12,
          color: C.text,
          fontFamily: "JetBrains Mono, monospace",
          width: 90,
          outline: "none",
        }}
      />
    </span>
  );
}

function inputStyle(width, ghost) {
  return {
    width,
    background: ghost ? "transparent" : C.panelAlt,
    border: `1px solid ${ghost ? "transparent" : C.lineSoft}`,
    borderRadius: 4,
    padding: "6px 8px",
    fontSize: 13,
    color: C.text,
    fontFamily: "Inter, sans-serif",
    outline: "none",
  };
}
