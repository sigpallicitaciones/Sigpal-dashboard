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
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  bg: "#17191C",
  panel: "#1F2226",
  panelAlt: "#262A2F",
  raised: "#2D3238",
  line: "#383D44",
  lineSoft: "#2A2E34",
  amber: "#E6A339",
  amberDim: "#8A6B2E",
  cyan: "#4FAFC4",
  text: "#EDEAE4",
  textMute: "#9AA0A8",
  textFaint: "#666B72",
  green: "#6FA875",
  red: "#CC5B45",
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

const SAMPLE_SUGGESTIONS = [
  {
    id: 1,
    tipo: "ajuste",
    titulo: "La palabra clave \"mantenimiento industrial\" trae mucho ruido",
    detalle:
      "De 14 licitaciones detectadas por esta palabra en el último mes, descartaste 11 manualmente. Considera reemplazarla por términos más específicos como \"mantenimiento eléctrico industrial\" o \"mantenimiento de tableros\".",
    accion: "Revisar en Rubros → Servicios Industriales",
  },
  {
    id: 2,
    tipo: "oportunidad",
    titulo: "Podrías estar perdiendo licitaciones en Coquimbo",
    detalle:
      "Se detectaron 6 licitaciones de tableros eléctricos en Coquimbo en los últimos 30 días, fuera de tu zona actual. Si tienes forma de cubrir esa logística, ampliar la región podría abrir oportunidades.",
    accion: "Revisar en Montos y Zonas",
  },
  {
    id: 3,
    tipo: "precio",
    titulo: "Tu precio de HH técnico eléctrico está bajo el promedio de mercado detectado",
    detalle:
      "En licitaciones adjudicadas similares a las tuyas, el valor promedio ofertado fue de $21.500 por HH técnico eléctrico, versus los $18.000 que tienes configurados.",
    accion: "Revisar en Precios Base",
  },
  {
    id: 4,
    tipo: "ajuste",
    titulo: "El filtro está en modo estricto y puede estar dejando pasar oportunidades chicas",
    detalle:
      "Con sensibilidad alta, licitaciones bajo 20 UTM casi nunca alcanzan el puntaje mínimo, aunque calcen en rubro. Si te interesan también proyectos pequeños, prueba bajar la sensibilidad unos puntos.",
    accion: "Revisar en Horarios → Sensibilidad",
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
        background: "#0F1113",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.4)",
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
        background: on ? "#3A2F16" : C.raised,
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
          boxShadow: on ? `0 0 8px ${C.amber}99` : "none",
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

export default function App() {
  const guardado = cargarConfig();

  const [tab, setTab] = useState("rubros");
  const [categories, setCategories] = useState(guardado?.categories ?? DEFAULT_CATEGORIES);
  const [regions, setRegions] = useState(guardado?.regions ?? ["Metropolitana", "Valparaíso", "O'Higgins"]);
  const [prices, setPrices] = useState(guardado?.prices ?? DEFAULT_PRICES);
  const [horarios, setHorarios] = useState(guardado?.horarios ?? ["08:00", "13:00", "18:30"]);
  const [sensitivity, setSensitivity] = useState(guardado?.sensitivity ?? 62);
  const [socios, setSocios] = useState(
    guardado?.socios ?? [{ nombre: "Bryan", email: "sigpallicitaciones@gmail.com", whatsapp: "" }]
  );
  const [newHorario, setNewHorario] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // Guarda automáticamente cada vez que cambia cualquier parte de la configuración
  useEffect(() => {
    guardarConfig({ categories, regions, prices, horarios, sensitivity, socios });
  }, [categories, regions, prices, horarios, sensitivity, socios]);

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
        categorias: categories.map((c) => ({
          id: c.id,
          nombre: c.name,
          activo: c.active,
          monto_min_utm: c.montoMin,
          monto_max_utm: c.montoMax,
          keywords: c.keywords,
        })),
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

  // --- Búsqueda manual (dispara el bot en GitHub Actions) -----------------
  const [fechaBusqueda, setFechaBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null); // { ok, mensaje }

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
              background: "#2E2412",
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
          background: C.panel,
          borderRight: `1px solid ${C.line}`,
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
              background: C.raised,
              border: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={16} color={C.amber} strokeWidth={2.4} />
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
                color: C.textFaint,
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
            color: C.textFaint,
            letterSpacing: "0.08em",
            marginBottom: 10,
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
                background: active ? C.raised : "transparent",
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
                  background: C.amber,
                  borderRadius: 2,
                  transition: "height .15s ease",
                }}
              />
              <Icon size={15} color={active ? C.amber : C.textMute} strokeWidth={2} />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? C.text : C.textMute,
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
            color: C.textFaint,
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
                background: active ? C.raised : "transparent",
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
                  background: C.cyan,
                  borderRadius: 2,
                  transition: "height .15s ease",
                }}
              />
              <Icon size={15} color={active ? C.cyan : C.textMute} strokeWidth={2} />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: active ? C.text : C.textMute,
                }}
              >
                {t.label}
              </span>
              {t.id === "sugerencias" && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: C.cyan,
                    color: "#0F1113",
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "1px 6px",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {SAMPLE_SUGGESTIONS.length}
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
              background: C.panelAlt,
              border: `1px solid ${C.lineSoft}`,
            }}
          >
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: C.textFaint, letterSpacing: "0.06em" }}>
              ESTADO
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: C.green }} />
              <span style={{ fontSize: 12, color: C.textMute }}>Guardado en este navegador</span>
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

          <button
            onClick={flashSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 6,
              border: `1px solid ${savedFlash ? C.green : C.amberDim}`,
              background: savedFlash ? "#20301F" : "#2E2412",
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
                background: tab === t.id ? "#2E2412" : "transparent",
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
                  background: "#2E2412",
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
                      background: on ? "#2E2412" : C.panel,
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
                  background: "#2E2412",
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
              El envío por correo ya está conectado y funcionando (vía Gmail). El envío por WhatsApp
              todavía es un paso pendiente de configurar (requiere WhatsApp Business API) — por ahora
              estos números quedan guardados aquí, listos para cuando conectemos ese canal.
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
                  background: "#2E2412",
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
                    background: resultadoBusqueda.ok ? "#1E2A20" : "#2A1E1E",
                    border: `1px solid ${resultadoBusqueda.ok ? C.green : C.red}55`,
                    color: resultadoBusqueda.ok ? C.green : C.red,
                  }}
                >
                  {resultadoBusqueda.mensaje}
                </div>
              )}
            </div>

            <SectionNote>
              Esto dispara el mismo motor que corre automáticamente, pero para la fecha que elijas. El
              resultado (si hay licitaciones que calcen) te llega por correo, igual que siempre — este
              panel solo confirma que la orden se envió, no te muestra los resultados en vivo.
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
                  gridTemplateColumns: "90px 1fr 150px 60px 110px 100px",
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
              </div>
              {SAMPLE_HISTORY.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr 150px 60px 110px 100px",
                    padding: "12px 14px",
                    gap: 10,
                    alignItems: "center",
                    borderBottom: `1px solid ${C.lineSoft}`,
                  }}
                >
                  <span style={{ fontSize: 12, color: C.textMute, fontFamily: "JetBrains Mono, monospace" }}>
                    {h.fecha}
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
                    {h.score}
                  </span>
                  <DecisionBadge value={h.decision} />
                  <span style={{ fontSize: 12, color: C.textMute }}>
                    {h.resultado === "ganada" && <span style={{ color: C.green }}>Ganada</span>}
                    {h.resultado === "pendiente" && "Pendiente"}
                    {h.resultado === "—" && "—"}
                  </span>
                </div>
              ))}
            </div>

            <SectionNote>
              Estos son datos de ejemplo para mostrar cómo se va a ver el historial. Cuando el bot esté
              conectado, cada licitación real que analice quedará registrada acá — y esa información es
              justamente la que alimenta las sugerencias de la pestaña siguiente.
            </SectionNote>
          </div>
        )}

        {/* ------------------------------------------------- SUGERENCIAS TAB */}
        {tab === "sugerencias" && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 22, fontWeight: 600 }}>
                Sugerencias para mejorar el criterio
              </div>
              <div style={{ fontSize: 13, color: C.textMute, marginTop: 3 }}>
                Ideas generadas a partir de tu historial real, para ajustar rubros, precios o zonas.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SAMPLE_SUGGESTIONS.map((s) => (
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
                          <ThumbsUp size={13} color={C.textFaint} style={{ cursor: "pointer" }} />
                          <ThumbsDown size={13} color={C.textFaint} style={{ cursor: "pointer" }} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SectionNote>
              Estas sugerencias también son de ejemplo. La idea es que, con datos reales, el bot compare
              tus decisiones (qué aprobaste, qué descartaste, qué ganaste) contra el criterio configurado
              y te proponga ajustes concretos — tú decides si aplicarlos con 👍/👎, nunca se cambian solos.
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
