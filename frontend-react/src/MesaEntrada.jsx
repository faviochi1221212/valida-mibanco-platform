import { useState, useRef } from 'react'

// ── Constantes ────────────────────────────────────────────────────────────────

const CANAL_ETIQUETA = {
  sms: 'SMS', email: 'Email', whatsapp: 'WhatsApp', push: 'Push',
  speech: 'Speech', carta: 'Carta', banner: 'Banner',
  pieza_grafica: 'Pieza gráfica', post_redes: 'Post redes sociales',
  video: 'Video (copy)', landing: 'Landing page',
}

const CANALES_GRAFICA = ['banner', 'pieza_grafica', 'post_redes', 'video', 'landing']
const CATS_REV_HUMANA = ['reclamo', 'oferta_comercial', 'crisis']
const G              = '#006B3F'
const UMBRAL_MINIMO  = 80

// ── Helpers ───────────────────────────────────────────────────────────────────

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = texto
      el.style.position = 'fixed'; el.style.left = '-9999px'; el.style.top = '-9999px'
      document.body.appendChild(el); el.focus(); el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return !!ok
    } catch { return false }
  }
}

function mejorarFormato(texto, canal) {
  if (!texto) return texto
  let t = texto.trim()
  if (canal === 'sms')      return t.replace(/\s+/g, ' ').trim().slice(0, 160)
  if (canal === 'whatsapp') {
    t = t.replace(/^[-*]\s+/gm, '• ').replace(/([.!?])\s{2,}/g, '$1\n\n').replace(/\n{3,}/g, '\n\n')
    return t.trim()
  }
  if (canal === 'email') {
    return t.split('\n\n').map(s => s.trim().replace(/^[-*]\s+/gm, '• ')).filter(s => s).join('\n\n')
  }
  return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function esSaludoSospechoso(saludo) {
  if (!saludo) return false
  return /\b[A-ZÁÉÍÓÚ]{2,6}\b/.test(saludo)
}

function nombreSospechoso(saludo) {
  if (!saludo) return ''
  const m = saludo.match(/\b[A-ZÁÉÍÓÚ]{2,6}\b/)
  return m ? m[0] : ''
}

function formatearCategoria(cat) {
  if (!cat) return 'Observación'
  return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ── Spinner inline ─────────────────────────────────────────────────────────────
function Spinner({ size = 18, color = 'white' }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2.5px solid rgba(${color === 'white' ? '255,255,255' : '0,0,0'},0.2)`,
      borderTop: `2.5px solid ${color === 'white' ? 'white' : G}`,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ── Modal de confirmación de uso de versión IA ────────────────────────────────

function ModalConfirmacion({ indice, onConfirmar, onCancelar }) {
  const esBloqueo = indice < UMBRAL_MINIMO
  const titulo    = esBloqueo ? 'Esta versión aún necesita mejoras' : 'Versión casi lista'
  const icono     = esBloqueo ? '⚠️' : '🔶'
  const iconoBg   = esBloqueo ? '#FEF2F2' : '#FFFBEB'
  const iconoBdr  = esBloqueo ? '#FCA5A5' : '#FDE68A'
  const mensaje   = esBloqueo
    ? `La propuesta de IA tiene un índice de ${indice}/100 y todavía no alcanza el estándar mínimo de calidad (${UMBRAL_MINIMO}/100).\n\nSi la utilizas ahora, la comunicación probablemente seguirá requiriendo ajustes antes de poder enviarse a la Cabina CX.\n\n¿Deseas usarla de todas maneras para seguir editándola?`
    : `La propuesta de IA está cerca del estándar recomendado y puede requerir pequeños ajustes adicionales.\n\n¿Deseas utilizar esta versión?`

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
      background: 'rgba(17,24,39,0.48)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'modalFadeIn 0.18s ease',
    }}>
      <style>{`
        @keyframes modalFadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 28px',
        maxWidth: 460, width: '90%', fontFamily: 'Inter, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)',
        animation: 'modalSlideUp 0.22s ease',
      }}>
        {/* Icono */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, fontSize: 22,
          background: iconoBg, border: `1.5px solid ${iconoBdr}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
        }}>
          {icono}
        </div>
        {/* Título */}
        <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700, color: '#111827', fontFamily: 'Poppins, sans-serif', lineHeight: 1.35 }}>
          {titulo}
        </h3>
        {/* Mensaje */}
        <p style={{ margin: '0 0 26px', fontSize: 13.5, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {mensaje}
        </p>
        {/* Botones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={onConfirmar} style={{
            width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: 'none',
            background: esBloqueo ? '#C25B3C' : G, color: 'white', cursor: 'pointer',
          }}>
            {esBloqueo ? 'Usar de todas maneras' : 'Usar versión'}
          </button>
          <button type="button" onClick={onCancelar} style={{
            width: '100%', padding: '12px', fontSize: 14, fontWeight: 500, borderRadius: 10,
            background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', cursor: 'pointer',
          }}>
            {esBloqueo ? 'Seguir editando' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MesaEntrada ───────────────────────────────────────────────────────────────

function MesaEntrada() {

  // ── Estados ────────────────────────────────────────────────────────────────
  const [textoLibre,          setTextoLibre]          = useState('')
  const [extrayendo,          setExtrayendo]          = useState(false)
  const [errorExtraccion,     setErrorExtraccion]     = useState(null)
  const [camposExtraidos,     setCamposExtraidos]     = useState(false)
  const [editarDatosVisible,  setEditarDatosVisible]  = useState(false)
  const [clasificacion,       setClasificacion]       = useState({ reclamo: false, crisis: false, oferta_comercial: false })
  const [form,                setForm]                = useState({
    canal: 'email', area_solicitante: '', nombre_solicitante: '',
    asunto: '', saludo: '', cuerpo: '', cta: '',
    remitente: '', toca_dac: false, es_reclamo: false,
  })
  const [cargando,            setCargando]            = useState(false)
  const [error,               setError]               = useState(null)
  const [resultado,           setResultado]           = useState(null)
  const [tabResultado,        setTabResultado]        = useState('original')
  const [versionCorregida,    setVersionCorregida]    = useState(null)
  const [generandoCorreccion, setGenerandoCorreccion] = useState(false)
  const [errorCorreccion,     setErrorCorreccion]     = useState(null)
  const [decisionVersion,     setDecisionVersion]     = useState(null)
  const [adjuntos,            setAdjuntos]            = useState([])
  const [copiado,             setCopiado]             = useState(null)
  const [propuestaAplicada,      setPropuestaAplicada]      = useState(false)
  const [generandoYAplicando,    setGenerandoYAplicando]    = useState(false)
  const [mostrarModalVersion,    setMostrarModalVersion]    = useState(false)
  const archivoRef = useRef(null)

  // ── Valores derivados ──────────────────────────────────────────────────────
  const esGrafica         = CANALES_GRAFICA.includes(form.canal)
  const saludoSospechoso  = esSaludoSospechoso(form.saludo)
  const nombreFio         = nombreSospechoso(form.saludo)
  const indice            = resultado?.indice_cumplimiento ?? 0
  const puedeEnviar       = indice >= UMBRAL_MINIMO
  const indiceColor       = puedeEnviar ? '#2D7D52' : indice >= 70 ? '#8C6B00' : '#C25B3C'
  const bandaTexto        = puedeEnviar
    ? 'Listo para continuar al proceso de validación'
    : indice >= 70 ? 'Casi listo, afinemos algunos detalles'
    : 'Necesita mejoras antes de continuar'
  const bandaBg           = puedeEnviar ? '#ECFDF5' : indice >= 70 ? '#FFFBEB' : '#FEF2F2'
  const bandaBorder       = puedeEnviar ? '#6EE7B7' : indice >= 70 ? '#FDE68A' : '#FCA5A5'
  const revisHumana       = resultado && (
    resultado.hard_stop ||
    CATS_REV_HUMANA.includes(resultado.categoria_inferida) ||
    CANALES_GRAFICA.includes(form.canal) ||
    adjuntos.length > 0
  )
  const estadoLabel = resultado
    ? resultado.hard_stop                          ? 'Revisión crítica'
      : resultado.ruta === 'via_rapida'            ? 'Listo para enviar'
      : resultado.banda_info?.banda === 'ambar'   ? 'Requiere atención'
      : 'Requiere ajustes'
    : ''
  const estadoColor = resultado
    ? resultado.hard_stop                          ? '#C25B3C'
      : resultado.ruta === 'via_rapida'            ? '#2D7D52'
      : resultado.banda_info?.banda === 'ambar'   ? '#8C6B00'
      : '#C25B3C'
    : ''
  const textoOriginalCompleto = [form.asunto, form.saludo, form.cuerpo, form.cta].filter(Boolean).join('\n\n')

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleCanalChange(e) {
    setForm(prev => ({ ...prev, canal: e.target.value, asunto: '', saludo: '', cuerpo: '', cta: '' }))
    setResultado(null); setVersionCorregida(null); setDecisionVersion(null)
  }

  function handleClasificacion(key) {
    setClasificacion(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleArchivos(e) {
    const nuevos = Array.from(e.target.files).map(f => ({ nombre: f.name, tipo: f.type, tamano: f.size }))
    setAdjuntos(prev => [...prev, ...nuevos])
    e.target.value = ''
  }

  async function handleExtraer() {
    setExtrayendo(true); setErrorExtraccion(null)
    try {
      const res = await fetch('http://localhost:8000/extraer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoLibre }),
      })
      if (!res.ok) throw new Error('Error en el servidor: ' + res.status)
      const data = await res.json()
      setForm(prev => ({
        ...prev,
        canal:  data.canal  || prev.canal,
        asunto: data.asunto || '',
        saludo: data.saludo || '',
        cuerpo: data.cuerpo || '',
        cta:    data.cta    || '',
      }))
      setCamposExtraidos(true)
      if (data.error) setErrorExtraccion(data.error)
    } catch (e) { setErrorExtraccion(e.message) }
    setExtrayendo(false)
  }

  async function handleValidar() {
    setCargando(true); setError(null); setVersionCorregida(null)
    setErrorCorreccion(null); setDecisionVersion(null); setTabResultado('original')
    setPropuestaAplicada(false); setGenerandoYAplicando(false); setMostrarModalVersion(false)
    try {
      const res = await fetch('http://localhost:8000/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          es_reclamo: form.es_reclamo || clasificacion.reclamo || clasificacion.crisis || clasificacion.oferta_comercial,
          tiene_adjuntos: adjuntos.length > 0,
          adjuntos,
        }),
      })
      if (!res.ok) throw new Error('Error en el servidor: ' + res.status)
      setResultado(await res.json())
      setEditarDatosVisible(false)
    } catch (e) { setError(e.message) }
    setCargando(false)
  }

  async function handleGenerarVersionCorregida() {
    setGenerandoCorreccion(true); setErrorCorreccion(null); setDecisionVersion(null)
    try {
      const res = await fetch('http://localhost:8000/generar-version-corregida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitud_id: resultado.id }),
      })
      if (!res.ok) throw new Error('Error en el servidor: ' + res.status)
      const data = await res.json()
      setVersionCorregida(data.version_corregida_texto)
    } catch { setErrorCorreccion('No se pudo generar la versión corregida. Intenta de nuevo.') }
    setGenerandoCorreccion(false)
  }

  function handleDecisionVersion(texto) {
    if (texto) { setForm(prev => ({ ...prev, cuerpo: texto })); setDecisionVersion('usada') }
    else        { setDecisionVersion('mantenida') }
  }

  async function handleCopiar(texto) {
    const ok = await copiarTexto(texto)
    setCopiado(ok ? 'ok' : 'error')
    setTimeout(() => setCopiado(null), 2500)
  }

  function handleNuevaValidacion() {
    setResultado(null); setTextoLibre(''); setCamposExtraidos(false)
    setEditarDatosVisible(false); setVersionCorregida(null)
    setDecisionVersion(null); setError(null); setErrorCorreccion(null)
    setTabResultado('original'); setCopiado(null)
    setPropuestaAplicada(false); setGenerandoYAplicando(false); setMostrarModalVersion(false)
    setForm({ canal: 'email', area_solicitante: '', nombre_solicitante: '', asunto: '', saludo: '', cuerpo: '', cta: '', remitente: '', toca_dac: false, es_reclamo: false })
    setClasificacion({ reclamo: false, crisis: false, oferta_comercial: false })
    setAdjuntos([])
  }

  async function handleAplicarPropuestaIA() {
    setGenerandoYAplicando(true); setErrorCorreccion(null)
    try {
      let textoCorregido = versionCorregida
      if (!textoCorregido) {
        const res = await fetch('http://localhost:8000/generar-version-corregida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitud_id: resultado.id }),
        })
        if (!res.ok) throw new Error('Error generando versión: ' + res.status)
        const data = await res.json()
        textoCorregido = data.version_corregida_texto
        setVersionCorregida(textoCorregido)
      }
      if (textoCorregido) {
        setForm(prev => ({ ...prev, cuerpo: textoCorregido }))
        setPropuestaAplicada(true)
        setDecisionVersion('usada')
      }
    } catch { setErrorCorreccion('No se pudo generar la propuesta de IA. Intenta de nuevo.') }
    setGenerandoYAplicando(false)
  }

  function handleEditarManualmente() {
    setResultado(null)
    setCamposExtraidos(true)
    setEditarDatosVisible(true)
    setPropuestaAplicada(false)
  }

  function handleClickUsarVersion() {
    if (indice >= 85) {
      // Aplica directamente sin modal
      handleDecisionVersion(versionCorregida)
    } else {
      // Abre modal (caso 80-84 ó < 80)
      setMostrarModalVersion(true)
    }
  }

  function handleConfirmarUsoVersion() {
    setMostrarModalVersion(false)
    handleDecisionVersion(versionCorregida)
  }

  // ── Estilos compartidos ────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    border: '1.5px solid #E5E7EB', borderRadius: 8,
    fontSize: 13, color: '#1A1A1A', background: 'white',
    outline: 'none', fontFamily: 'Inter, sans-serif',
  }

  const sectionLabel = {
    margin: '0 0 14px', fontSize: 11, fontWeight: 600,
    color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em',
  }

  const fieldLabel = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: '#374151', marginBottom: 6,
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: RESULTADO
  // ══════════════════════════════════════════════════════════════════════════

  if (resultado) {
    const hallazgos = resultado.hallazgos || []

    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px', fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827', fontFamily: 'Poppins, sans-serif' }}>
              Resultado de validación
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
              {CANAL_ETIQUETA[form.canal] || form.canal}
              {form.area_solicitante    && ` · Área ${form.area_solicitante}`}
              {form.nombre_solicitante  && ` · ${form.nombre_solicitante}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {resultado.categoria_inferida && resultado.categoria_inferida !== 'rutinaria' && (
              <span style={{ fontSize: 12, color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 20, padding: '3px 10px', fontWeight: 500 }}>
                Inferida por IA
              </span>
            )}
            <button type="button" onClick={handleNuevaValidacion} style={{
              fontSize: 13, color: '#374151', background: 'white',
              border: '1.5px solid #E5E7EB', borderRadius: 8,
              padding: '7px 14px', cursor: 'pointer', fontWeight: 500,
            }}>
              ← Nueva validación
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── COLUMNA IZQUIERDA ── */}
          <div style={{ flex: '0 0 52%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Índice card */}
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}>
              <p style={sectionLabel}>Índice de calidad</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 56, fontWeight: 800, color: indiceColor, lineHeight: 1, fontFamily: 'Poppins, sans-serif' }}>{indice}</span>
                <span style={{ fontSize: 22, color: '#D1D5DB', fontWeight: 500 }}>/100</span>
              </div>
              <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, marginBottom: 12 }}>
                <div style={{ width: `${Math.min(100, indice)}%`, height: '100%', background: indiceColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              {/* Banda de estado */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bandaBg, border: `1px solid ${bandaBorder}`, borderRadius: 8, padding: '5px 12px', marginBottom: 16 }}>
                <span style={{ fontSize: 12 }}>{puedeEnviar ? '✅' : indice >= 70 ? '🔶' : '🔴'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: indiceColor }}>{bandaTexto}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Estado',          value: estadoLabel,                              color: estadoColor },
                  { label: 'Ruta',            value: resultado.ruta?.replace(/_/g, ' ') || '—' },
                  { label: 'Revisión crítica', value: revisHumana ? 'Sí' : 'No',               color: revisHumana ? '#C25B3C' : '#2D7D52' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: color || '#374151' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Banner: comunicación aprobada para envío */}
            {puedeEnviar && (
              <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>✅</span>
                <p style={{ margin: 0, fontSize: 13, color: '#065F46', lineHeight: 1.55, fontWeight: 500 }}>
                  La comunicación alcanzó el estándar mínimo y puede continuar al proceso de validación.
                </p>
              </div>
            )}

            {/* Diagnóstico card */}
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)' }}>
              <p style={sectionLabel}>Diagnóstico rápido</p>

              {resultado.hard_stop && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#991B1B', fontWeight: 600 }}>
                    Esta pieza requiere revisión cuidadosa de CX antes de avanzar.
                  </p>
                </div>
              )}

              {resultado.ruta === 'via_rapida' && !resultado.hard_stop && (
                <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#065F46', fontWeight: 600 }}>
                    La comunicación está lista para avanzar. Solo revisa que los datos estén correctos.
                  </p>
                </div>
              )}

              {hallazgos.length === 0 ? (
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>No se detectaron hallazgos específicos.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {hallazgos.map((h, i) => (
                    <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < hallazgos.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                        {formatearCategoria(h.categoria)}
                      </p>
                      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hallazgo</p>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{h.regla_infringida}</p>
                      {h.fragmento_texto && (
                        <>
                          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fragmento detectado</p>
                          <span style={{ display: 'inline-block', fontSize: 13, color: '#C25B3C', fontStyle: 'italic', background: '#FEF2F2', padding: '3px 10px', borderRadius: 6 }}>
                            &ldquo;{h.fragmento_texto}&rdquo;
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tarjeta de bloqueo + recomendación IA — solo cuando índice < UMBRAL_MINIMO */}
            {!puedeEnviar && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)', border: `1px solid ${bandaBorder}` }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>✨</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Recomendación de IA</span>
                </div>

                {/* Mensaje amigable */}
                <div style={{ background: bandaBg, border: `1px solid ${bandaBorder}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: indiceColor, fontWeight: 600 }}>
                    Esta comunicación obtuvo un índice de {indice}/100.
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151' }}>
                    Para continuar, debe alcanzar al menos <strong>{UMBRAL_MINIMO}/100</strong>.
                  </p>
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: '#374151', fontWeight: 500 }}>Puedes:</p>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {[
                      'Aplicar la propuesta de mejora generada por IA.',
                      'Editar el mensaje manualmente.',
                      'Volver a validar hasta superar el umbral.',
                    ].map(txt => (
                      <li key={txt} style={{ fontSize: 13, color: '#374151', marginBottom: 3 }}>{txt}</li>
                    ))}
                  </ul>
                </div>

                {/* Sub-info IA */}
                <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#1E40AF', lineHeight: 1.55 }}>
                    La comunicación está cerca del estándar requerido. Afinemos algunos puntos para que alcance el puntaje mínimo de envío.
                  </p>
                </div>

                {errorCorreccion && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#991B1B' }}>
                    {errorCorreccion}
                  </div>
                )}

                {/* Botones de acción */}
                {propuestaAplicada ? (
                  <div>
                    <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>Propuesta de IA aplicada al campo Cuerpo.</span>
                    </div>
                    <button type="button" onClick={handleValidar} disabled={cargando} style={{
                      width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600,
                      background: cargando ? '#6B9E84' : G, color: 'white', border: 'none',
                      cursor: cargando ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      {cargando ? <><Spinner size={14} /> Validando...</> : '↩ Volver a validar'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={handleAplicarPropuestaIA} disabled={generandoYAplicando} style={{
                      width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600,
                      background: generandoYAplicando ? '#6B9E84' : G, color: 'white', border: 'none',
                      cursor: generandoYAplicando ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      {generandoYAplicando ? <><Spinner size={14} /> Generando propuesta...</> : '✨ Usar propuesta IA'}
                    </button>
                    <button type="button" onClick={handleEditarManualmente} style={{
                      width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 500,
                      background: 'white', color: '#374151', border: '1.5px solid #E5E7EB', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      ✏️ Editar manualmente
                    </button>
                    <button type="button" onClick={handleValidar} disabled={cargando} style={{
                      width: '100%', height: 44, borderRadius: 10, fontSize: 14, fontWeight: 500,
                      background: 'white', color: '#374151', border: '1.5px solid #E5E7EB',
                      cursor: cargando ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      {cargando ? <><Spinner size={14} color={G} /> Validando...</> : '↩ Volver a validar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── COLUMNA DERECHA ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6' }}>
                <button type="button" onClick={() => setTabResultado('original')} style={{
                  flex: 1, padding: '14px 16px', fontSize: 14, cursor: 'pointer', border: 'none',
                  fontWeight: tabResultado === 'original' ? 600 : 400,
                  color:      tabResultado === 'original' ? '#111827' : '#6B7280',
                  background: tabResultado === 'original' ? 'white' : '#F9FAFB',
                  borderBottom: tabResultado === 'original' ? `2px solid ${G}` : '2px solid transparent',
                }}>
                  Original
                </button>
                <button type="button" onClick={() => {
                  setTabResultado('corregida')
                  if (!versionCorregida && !generandoCorreccion) handleGenerarVersionCorregida()
                }} style={{
                  flex: 1, padding: '14px 16px', fontSize: 14, cursor: 'pointer', border: 'none',
                  fontWeight: tabResultado === 'corregida' ? 600 : 400,
                  color:      tabResultado === 'corregida' ? 'white' : '#6B7280',
                  background: tabResultado === 'corregida' ? G : '#F9FAFB',
                  borderBottom: '2px solid transparent',
                }}>
                  Propuesta IA +
                </button>
              </div>

              {/* Tab content */}
              <div style={{ padding: 20, minHeight: 320 }}>

                {/* Tab: Original */}
                {tabResultado === 'original' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Texto original</span>
                      <span style={{ fontSize: 11, background: '#F3F4F6', color: '#6B7280', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>ORIGINAL</span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                      {textoOriginalCompleto || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                      <button type="button" onClick={() => handleCopiar(textoOriginalCompleto)} style={{ fontSize: 12, color: '#374151', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                        {copiado === 'ok' ? '✓ Copiado' : '⎘ Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Propuesta IA */}
                {tabResultado === 'corregida' && (
                  <div>
                    {generandoCorreccion && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, gap: 14 }}>
                        <Spinner size={36} color={G} />
                        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Generando propuesta mejorada...</p>
                      </div>
                    )}

                    {!generandoCorreccion && errorCorreccion && (
                      <div>
                        <p style={{ color: '#C25B3C', fontSize: 13, marginBottom: 12 }}>{errorCorreccion}</p>
                        <button type="button" onClick={handleGenerarVersionCorregida} style={{ fontSize: 13, background: G, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
                          Reintentar
                        </button>
                      </div>
                    )}

                    {!generandoCorreccion && !errorCorreccion && versionCorregida && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Versión corregida</span>
                          <span style={{ fontSize: 11, background: '#ECFDF5', color: G, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>+ PROPUESTA IA</span>
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', whiteSpace: 'pre-wrap', marginBottom: 14, maxHeight: 300, overflowY: 'auto' }}>
                          {versionCorregida}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                          <button type="button" onClick={() => handleCopiar(versionCorregida)} style={{ fontSize: 12, color: '#374151', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                            ⎘ Copiar
                          </button>
                          <button type="button" onClick={() => setVersionCorregida(mejorarFormato(versionCorregida, form.canal))} style={{ fontSize: 12, color: '#374151', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                            ↻ Mejorar formato
                          </button>
                          <button type="button" onClick={handleGenerarVersionCorregida} style={{ fontSize: 12, color: '#374151', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                            ⟳ Regenerar
                          </button>
                        </div>
                        {copiado === 'ok'          && <p style={{ margin: '0 0 10px', fontSize: 12, color: G, fontWeight: 500 }}>Versión copiada al portapapeles.</p>}
                        {decisionVersion === 'usada' && indice >= 85  && <p style={{ margin: '0 0 10px', fontSize: 12, color: G, fontWeight: 500 }}>✓ Versión aplicada correctamente.</p>}
                        {decisionVersion === 'usada' && indice >= UMBRAL_MINIMO && indice < 85 && <p style={{ margin: '0 0 10px', fontSize: 12, color: G, fontWeight: 500 }}>✓ Versión aplicada al campo Cuerpo.</p>}
                        {decisionVersion === 'usada' && indice < UMBRAL_MINIMO && <p style={{ margin: '0 0 10px', fontSize: 12, color: '#92400E', fontWeight: 500, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '7px 12px' }}>La propuesta fue aplicada. Aún necesitas alcanzar un índice mínimo de {UMBRAL_MINIMO}/100 para continuar.</p>}
                        {decisionVersion === 'mantenida' && <p style={{ margin: '0 0 10px', fontSize: 12, color: '#888' }}>Continuando con el texto original.</p>}
                        {!decisionVersion && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => handleDecisionVersion(null)} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 500, color: '#374151', background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 10, cursor: 'pointer' }}>
                              Seguir con la actual
                            </button>
                            <button type="button" onClick={handleClickUsarVersion} style={{ flex: 2, padding: '10px', fontSize: 13, fontWeight: 600, color: 'white', background: G, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                              ✓ Usar esta versión
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de confirmación — position:fixed, se muestra sobre todo */}
        {mostrarModalVersion && (
          <ModalConfirmacion
            indice={indice}
            onConfirmar={handleConfirmarUsoVersion}
            onCancelar={() => setMostrarModalVersion(false)}
          />
        )}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA: FLUJO PROGRESIVO (Pasos 1 → 2 → 3)
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px', fontFamily: 'Inter, sans-serif' }}>

      {/* ══ PASO 1: Bienvenida + textarea ══ */}
      {!camposExtraidos && (
        <>
          {/* Bienvenida */}
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 46, height: 46, background: G, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 20, fontFamily: 'Poppins, sans-serif' }}>M</span>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 15, fontWeight: 600, color: '#111827', lineHeight: 1.4 }}>
                ¡Hola! Pega aquí la comunicación que quieres validar y te ayudaré a ordenar los campos.
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                Funciona con SMS, email, WhatsApp, push, carta y piezas gráficas.
              </p>
            </div>
          </div>

          {/* Textarea card */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12 }}>
            <textarea
              value={textoLibre}
              onChange={e => setTextoLibre(e.target.value)}
              placeholder="Pega aquí el mensaje completo..."
              style={{
                width: '100%', height: 260, resize: 'vertical', boxSizing: 'border-box',
                border: '1.5px solid #E5E7EB', borderRadius: 12,
                padding: '16px 18px', fontSize: 15, lineHeight: 1.65,
                color: '#1A1A1A', background: '#FAFAFA',
                outline: 'none', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = G; e.target.style.background = 'white' }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#FAFAFA' }}
            />
            {/* Chips + contador */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['SMS', 'Email', 'WhatsApp', 'Push', 'Carta', 'Gráfica'].map(chip => (
                  <span key={chip} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#F3F4F6', color: '#6B7280', fontWeight: 500, letterSpacing: '0.02em' }}>
                    {chip}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0, marginLeft: 12 }}>
                {textoLibre.length} caracteres
              </span>
            </div>
          </div>

          {errorExtraccion && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#991B1B' }}>
              {errorExtraccion}
            </div>
          )}

          {/* Botón extraer */}
          <button type="button" onClick={handleExtraer} disabled={extrayendo || !textoLibre.trim()} style={{
            width: '100%', height: 56, borderRadius: 12, fontSize: 15, fontWeight: 600,
            background: extrayendo || !textoLibre.trim() ? '#D1D5DB' : G,
            color: 'white', border: 'none',
            cursor: extrayendo || !textoLibre.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background 0.15s',
          }}>
            {extrayendo ? <><Spinner /> Extrayendo campos...</> : '⚡ Extraer campos automáticamente'}
          </button>
        </>
      )}

      {/* ══ PASO 2: Datos detectados ══ */}
      {camposExtraidos && (
        <>
          {/* Card datos */}
          <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 14, overflow: 'hidden' }}>
            {/* Header card */}
            <div style={{ background: '#F0FAF5', borderBottom: '1px solid #D1FAE5', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: G, fontSize: 16, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Datos detectados por IA</span>
              </div>
              <span style={{ fontSize: 12, color: G, fontWeight: 500 }}>✓ Análisis completado</span>
            </div>
            {/* Body card */}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Canal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 76, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Canal</span>
                  <span style={{ fontSize: 13, fontWeight: 500, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 12px', color: '#374151' }}>
                    {CANAL_ETIQUETA[form.canal] || form.canal}
                  </span>
                </div>

                {/* Asunto */}
                {form.asunto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ width: 76, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>Asunto</span>
                    <span style={{ fontSize: 13, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 12px', color: '#374151', maxWidth: 500 }}>
                      {form.asunto}
                    </span>
                  </div>
                )}

                {/* Saludo */}
                {form.saludo && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <span style={{ width: 76, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0, paddingTop: 5 }}>Saludo</span>
                    <div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 13, fontWeight: saludoSospechoso ? 600 : 400,
                        background: saludoSospechoso ? '#FFF7ED' : '#F3F4F6',
                        border: `1px solid ${saludoSospechoso ? '#FED7AA' : '#E5E7EB'}`,
                        borderRadius: 8, padding: '4px 12px',
                        color: saludoSospechoso ? '#B45309' : '#374151',
                      }}>
                        {form.saludo}
                        {saludoSospechoso && <span style={{ fontSize: 13 }}>⚠</span>}
                      </span>
                      {saludoSospechoso && (
                        <p style={{ margin: '5px 0 0', fontSize: 12, color: '#B45309' }}>
                          Revisa si el nombre detectado corresponde al cliente.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {form.cta && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ width: 76, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>CTA</span>
                    <span style={{ fontSize: 13, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 12px', color: '#374151', maxWidth: 500 }}>
                      {form.cta.length > 65 ? form.cta.slice(0, 65) + '…' : form.cta}
                    </span>
                  </div>
                )}
              </div>

              <p style={{ margin: '18px 0 0', fontSize: 13, color: '#6B7280' }}>
                Puedes revisarlos y ajustarlos antes de validar.
              </p>
            </div>
          </div>

          {/* Botones acción Paso 2 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: editarDatosVisible ? 14 : 0 }}>
            <button type="button" onClick={() => setEditarDatosVisible(v => !v)} style={{
              flex: 1, height: 48, borderRadius: 10, fontSize: 14, fontWeight: 500,
              background: 'white', color: '#374151',
              border: '1.5px solid #E5E7EB', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              ✏️ {editarDatosVisible ? 'Ocultar formulario' : 'Editar datos'}
            </button>
            <button type="button" onClick={handleValidar} disabled={cargando} style={{
              flex: 2, height: 48, borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: cargando ? '#6B9E84' : G,
              color: 'white', border: 'none',
              cursor: cargando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {cargando ? <><Spinner size={16} /> Validando...</> : 'Continuar y validar →'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
              {error}
            </div>
          )}
        </>
      )}

      {/* ══ PASO 3: Formulario expandido ══ */}
      {editarDatosVisible && (
        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <form onSubmit={e => { e.preventDefault(); handleValidar() }}>

            {/* SECCIÓN: IDENTIFICACIÓN */}
            <p style={sectionLabel}>Identificación del envío</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
              <div>
                <label style={fieldLabel}>Canal</label>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9CA3AF' }}>Determina las reglas de validación.</p>
                <select name="canal" value={form.canal} onChange={handleCanalChange} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="push">Push</option>
                  <option value="speech">Speech</option>
                  <option value="carta">Carta</option>
                  <option value="banner">Banner</option>
                  <option value="pieza_grafica">Pieza gráfica</option>
                  <option value="post_redes">Post redes sociales</option>
                  <option value="video">Video (copy)</option>
                  <option value="landing">Landing page</option>
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Área solicitante</label>
                <input name="area_solicitante" value={form.area_solicitante} onChange={handleChange}
                  placeholder="ej. Digital" style={inputStyle} />
              </div>
              <div>
                <label style={fieldLabel}>Nombre del solicitante</label>
                <input name="nombre_solicitante" value={form.nombre_solicitante} onChange={handleChange}
                  placeholder="ej. Ana Flores" style={inputStyle} />
              </div>
            </div>

            {/* SECCIÓN: CONTENIDO */}
            <p style={sectionLabel}>Contenido del mensaje</p>

            {esGrafica && (
              <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#6D4C00' }}>
                  <b>Pieza gráfica:</b> se evalúa únicamente el copy/texto. Esta pieza irá a <b>revisión humana obligatoria</b>.
                </p>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Asunto</label>
              <input name="asunto" value={form.asunto} onChange={handleChange} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Saludo</label>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9CA3AF' }}>Ej: ¡Hola, {'{NOMBRE}'}!</p>
              <input name="saludo" value={form.saludo} onChange={handleChange} style={{
                ...inputStyle,
                border: `1.5px solid ${saludoSospechoso ? '#FED7AA' : '#E5E7EB'}`,
                background: saludoSospechoso ? '#FFF7ED' : 'white',
              }} />
              {saludoSospechoso && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#B45309' }}>
                  <span>⚠</span>
                  <span>Verifica si &ldquo;{nombreFio}&rdquo; es un nombre válido para el cliente.</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Cuerpo del mensaje</label>
              <textarea name="cuerpo" value={form.cuerpo} onChange={handleChange} rows={5} style={{
                ...inputStyle, resize: 'vertical', lineHeight: 1.6,
              }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>Llamado a la acción (CTA)</label>
              <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9CA3AF' }}>¿Qué debe hacer el cliente al leer este mensaje?</p>
              <input name="cta" value={form.cta} onChange={handleChange} style={inputStyle} />
            </div>

            {form.canal === 'sms' && (
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabel}>Remitente</label>
                <input name="remitente" value={form.remitente} onChange={handleChange}
                  placeholder="ej. Mibanco Oficial" style={inputStyle} />
              </div>
            )}

            {/* Adjuntos — input oculto, botón pequeño */}
            <div style={{ marginBottom: 20 }}>
              <input ref={archivoRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={handleArchivos} style={{ display: 'none' }} />
              <button type="button" onClick={() => archivoRef.current?.click()} style={{ fontSize: 12, color: '#6B7280', background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                📎 Adjuntar archivo {adjuntos.length > 0 ? `(${adjuntos.length})` : ''}
              </button>
              {adjuntos.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {adjuntos.map((a, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {a.nombre}
                      <button type="button" onClick={() => setAdjuntos(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#C25B3C', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN: CLASIFICACIÓN */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 20, marginBottom: 24 }}>
              <p style={sectionLabel}>Clasificación</p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9CA3AF' }}>Marca si aplica (opcional — la IA puede inferirlo).</p>
              <div style={{ display: 'flex', gap: 24 }}>
                {[
                  { key: 'reclamo',         label: 'Reclamo' },
                  { key: 'crisis',          label: 'Crisis' },
                  { key: 'oferta_comercial', label: 'Oferta comercial' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151', userSelect: 'none' }}>
                    <input type="checkbox" checked={clasificacion[key]} onChange={() => handleClasificacion(key)}
                      style={{ width: 16, height: 16, accentColor: G, cursor: 'pointer' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 14, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B' }}>
                {error}
              </div>
            )}

            {/* Botón validar */}
            <button type="submit" disabled={cargando} style={{
              width: '100%', height: 52, borderRadius: 12, fontSize: 15, fontWeight: 600,
              background: cargando ? '#6B9E84' : G,
              color: 'white', border: 'none',
              cursor: cargando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              {cargando ? <><Spinner /> Validando...</> : '⚡ Validar comunicación'}
            </button>
          </form>
        </div>
      )}

    </div>
  )
}

export default MesaEntrada
