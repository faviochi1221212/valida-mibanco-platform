import { useEffect, useState } from 'react'

// ── Constantes ─────────────────────────────────────────────────────────────────

const CANAL_ETIQUETA = {
  sms: 'SMS', email: 'Email', whatsapp: 'WhatsApp', push: 'Push',
  speech: 'Speech', carta: 'Carta', banner: 'Banner',
  pieza_grafica: 'Pieza gráfica', post_redes: 'Post redes',
  video: 'Video', landing: 'Landing',
}

const LABEL_RUTA = {
  revision_a_fondo:  'Revisión a fondo',
  revision_profunda: 'Revisión profunda de CX',
  via_rapida:        'Vía rápida',
}

const LABEL_ESTADO = {
  pendiente:        'Pendiente',
  requiere_ajustes: 'En revisión',
  ajustado:         'En revisión',
  escalada:         'Escalada',
  aprobada:         'Aprobada',
  aprobado:         'Aprobada',
}

const ESTADO_ST = {
  pendiente:        { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  requiere_ajustes: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  ajustado:         { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  escalada:         { bg: '#FFF0EC', text: '#9E3B1A', dot: '#E06C54' },
  aprobada:         { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  aprobado:         { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
}

const ESTADOS_APROBADO   = ['aprobada', 'aprobado']
const CATS_REV_HUMANA    = ['reclamo', 'oferta_comercial', 'crisis']
const CANALES_REV_HUMANA = ['banner', 'pieza_grafica']
const MOTIVOS_ESCALAR    = ['Reclamo', 'Crisis', 'Oferta comercial', 'Riesgo reputacional', 'Duda de marca', 'Otro']

// ── Helpers ────────────────────────────────────────────────────────────────────

function tsMs(ts) {
  if (!ts) return 0
  if (typeof ts === 'string') return new Date(ts).getTime()
  if (ts.seconds  !== undefined) return ts.seconds  * 1000
  if (ts._seconds !== undefined) return ts._seconds * 1000
  return 0
}

function fmtFecha(ts) {
  const ms = tsMs(ts)
  if (!ms) return '—'
  const d   = new Date(ms)
  const hoy = new Date()
  if (d.toDateString() === hoy.toDateString())
    return `Hoy, ${d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
  return (
    d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  )
}

function fmtHora(isoStr) {
  if (!isoStr) return '—'
  try { return new Date(isoStr).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }
  catch { return isoStr }
}

function formatTamano(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function scoreColor(n) {
  if (n >= 85) return '#16A34A'
  if (n >= 70) return '#D97706'
  return '#DC6050'
}

function clasificar(s) {
  const estado    = s.estado || 'pendiente'
  const categoria = s.categoria_inferida || ''
  if (
    s.hard_stop || s.ruta === 'revision_profunda' || s.tiene_adjuntos ||
    estado === 'escalada' || CATS_REV_HUMANA.includes(categoria) || CANALES_REV_HUMANA.includes(s.canal)
  ) return 'profunda'
  if (
    (s.banda_info?.banda === 'verde' || s.ruta === 'via_rapida') &&
    !['requiere_ajustes', 'ajustado'].includes(estado)
  ) return 'lista'
  return 'atencion'
}

function sugerencia(h) {
  const frag  = (h.fragmento_texto || '').toLowerCase()
  const regla = (h.regla_infringida || '').toLowerCase()
  if (frag.includes('estimado'))                           return '"¡Hola, {NOMBRE}!" o simplemente "¡Hola!"'
  if (frag.includes('usted'))                              return 'Usa "tú": "puedes", "tienes", "te invitamos"'
  if (frag.includes('deberá') || frag.includes('deberás')) return 'Reemplaza por: "puedes", "te recomendamos"'
  if (frag.includes('sírvase'))                            return '"Por favor" o indica la acción directamente'
  if (frag.includes('se comunica'))                        return '"Queremos contarte" o "Te informamos"'
  if (regla.includes('160'))                               return 'Reduce priorizando: dato clave → acción → canal'
  if (regla.includes('remitente'))                         return 'Cambia el remitente a "Mibanco Oficial"'
  if (regla.includes('prohibido'))                         return 'Reemplaza por vocabulario permitido de Mibanco'
  if (regla.includes('cta'))                               return 'Agrega un CTA claro: "Entra a tu app", "Llámanos"'
  if (regla.includes('emoji'))                             return 'Elimina todos los emojis — Mibanco no los usa'
  return 'Revisa y ajusta según las pautas de comunicación Mibanco'
}

// ── BadgeEstado ─────────────────────────────────────────────────────────────────

function BadgeEstado({ estado, small }) {
  const st = ESTADO_ST[estado] || { bg: '#F0F0F0', text: '#555', dot: '#888' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: st.bg, color: st.text,
      borderRadius: 20, padding: small ? '1px 7px' : '2px 9px',
      fontSize: small ? 10 : 11, fontWeight: 600,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
      {LABEL_ESTADO[estado] || estado}
    </span>
  )
}

// ── ContenidoCanal ──────────────────────────────────────────────────────────────

function ContenidoCanal({ texto, canal }) {
  if (!texto) return <p style={{ color: '#AAA', fontSize: 13, margin: 0 }}>Sin contenido.</p>

  if (canal === 'sms') {
    const largo = texto.length
    const col = scoreColor(largo <= 130 ? 90 : largo <= 160 ? 75 : 40)
    return (
      <div>
        <div style={{ background: '#F5F5F5', border: '1px solid #E8E8E8', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' }}>Mibanco Oficial</p>
          <p style={{ margin: 0, fontSize: 13, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{texto}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: '#E8E8E8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (largo / 160) * 100)}%`, height: '100%', background: col }} />
          </div>
          <span style={{ fontSize: 12, color: col, fontWeight: 700 }}>{largo}/160</span>
        </div>
      </div>
    )
  }

  if (canal === 'email') {
    const partes    = texto.split('\n\n').filter(p => p.trim())
    const etiquetas = ['Asunto', 'Saludo', 'Mensaje', 'CTA']
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {partes.map((parte, i) => (
          <div key={i}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase' }}>
              {etiquetas[i] || `Parte ${i + 1}`}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{parte}</p>
          </div>
        ))}
      </div>
    )
  }

  if (canal === 'whatsapp') {
    return (
      <div style={{ background: '#ECE5DD', borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: '#DCF8C6', borderRadius: '14px 14px 4px 14px',
            padding: '9px 13px', maxWidth: '80%',
            fontSize: 13, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}>
            {texto}
            <span style={{ display: 'block', fontSize: 10, color: '#6B8B6A', textAlign: 'right', marginTop: 3 }}>ahora ✓✓</span>
          </div>
        </div>
      </div>
    )
  }

  if (canal === 'push') {
    const partes = texto.split('\n\n').filter(p => p.trim())
    return (
      <div style={{ background: '#F2F2F2', border: '1px solid #DDD', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#00592A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#FFF', fontSize: 14, fontWeight: 700 }}>M</span>
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{partes[0] || '—'}</p>
          {partes[1] && <p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.4 }}>{partes[1]}</p>}
        </div>
      </div>
    )
  }

  return (
    <pre style={{ margin: 0, fontSize: 13, color: '#1A1A1A', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
      {texto}
    </pre>
  )
}

// ── GrupoHeader ─────────────────────────────────────────────────────────────────

function GrupoHeader({ titulo, color, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 14px', background: '#F8F8F8',
      borderBottom: '1px solid #EBEBEB', borderTop: '1px solid #EBEBEB',
      position: 'sticky', top: 0, zIndex: 1,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {titulo}
      </span>
      <span style={{ fontSize: 10, color: '#BBB' }}>({count})</span>
    </div>
  )
}

// ── ItemBandeja ─────────────────────────────────────────────────────────────────

function ItemBandeja({ solicitud, activa, onSeleccionar }) {
  const score   = solicitud.indice_cumplimiento ?? 0
  const col     = scoreColor(score)
  const preview = (solicitud.campos?.cuerpo || solicitud.campos?.saludo || '').slice(0, 80).replace(/\n/g, ' ')

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(solicitud)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '11px 14px',
        background: activa ? '#EEF3FF' : '#FFFFFF',
        borderLeft: `3px solid ${activa ? '#3D5A99' : 'transparent'}`,
        border: 'none', borderBottom: '1px solid #F0F0F0', cursor: 'pointer',
      }}
    >
      {/* ID + badge + adjunto + fecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#1A1A1A', flexShrink: 0 }}>
            {solicitud.numero_solicitud || (solicitud.id || '').slice(0, 8)}
          </span>
          <BadgeEstado estado={solicitud.estado} small />
          {solicitud.tiene_adjuntos && (
            <span style={{ fontSize: 10, background: '#EEF2FF', color: '#3D5A99', borderRadius: 3, padding: '0 4px', flexShrink: 0 }}>
              adj
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: '#C0C0C0', flexShrink: 0, paddingLeft: 6 }}>
          {fmtFecha(solicitud.fecha_creacion)}
        </span>
      </div>

      {/* canal · area · categoria */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 4, overflow: 'hidden' }}>
        {[
          CANAL_ETIQUETA[solicitud.canal] || solicitud.canal,
          solicitud.area_solicitante,
          solicitud.categoria_inferida,
        ].filter(Boolean).map((val, i, arr) => (
          <span key={i} style={{ fontSize: 11, color: '#777', whiteSpace: 'nowrap' }}>
            {val}{i < arr.length - 1 ? ' ·' : ''}
          </span>
        ))}
      </div>

      {/* preview + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: '#AAAAAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {preview || '—'}
        </p>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, flexShrink: 0 }}>
          {score}/100
        </span>
      </div>
    </button>
  )
}

// ── PanelVacio ──────────────────────────────────────────────────────────────────

function PanelVacio() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 52, opacity: 0.15, marginBottom: 16 }}>✉</div>
      <p style={{ margin: 0, fontSize: 14, color: '#C0C0C0', fontWeight: 500 }}>
        Selecciona una solicitud para ver el detalle
      </p>
    </div>
  )
}

// ── PrincipioRow ────────────────────────────────────────────────────────────────

function PrincipioRow({ icono, nombre, score, hallazgos }) {
  const [abierto, setAbierto] = useState(false)
  const col = scoreColor(score)

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', background: 'none', border: 'none',
          borderBottom: '1px solid #F5F5F5', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, width: 16, textAlign: 'center', color: col, flexShrink: 0 }}>{icono}</span>
        <span style={{ flex: 1, fontSize: 13, color: '#2A2A2A', fontWeight: 500 }}>{nombre}</span>
        <div style={{ width: 56, height: 3, background: '#EEE', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ width: `${score}%`, height: '100%', background: col, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: col, width: 26, textAlign: 'right', flexShrink: 0 }}>
          {score}
        </span>
        <span style={{ fontSize: 11, color: '#CCC', marginLeft: 4, flexShrink: 0 }}>
          {abierto ? '▾' : '›'}
        </span>
      </button>

      {abierto && (
        <div style={{ padding: '10px 16px 14px 44px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
          {hallazgos.length > 0 ? hallazgos.map((h, i) => (
            <div key={i} style={{
              marginBottom: i < hallazgos.length - 1 ? 12 : 0,
              paddingBottom: i < hallazgos.length - 1 ? 12 : 0,
              borderBottom: i < hallazgos.length - 1 ? '1px solid #EEEEEE' : 'none',
            }}>
              {h.fragmento_texto && (
                <p style={{ margin: '0 0 3px', fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                  &ldquo;{h.fragmento_texto}&rdquo;
                </p>
              )}
              <p style={{ margin: '0 0 3px', fontSize: 12, color: '#555' }}>{h.regla_infringida}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
                ↳ {sugerencia(h)}
              </p>
            </div>
          )) : (
            <p style={{ margin: 0, fontSize: 12, color: '#16A34A' }}>
              Sin observaciones en este principio.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── SeccionCard ─────────────────────────────────────────────────────────────────

function SeccionCard({ titulo, accentBg, children }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #F0F0F0', background: accentBg || 'transparent' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: accentBg ? '#2D7D52' : '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {titulo}
        </p>
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  )
}

// ── PanelDetalle ────────────────────────────────────────────────────────────────

function PanelDetalle({ solicitud, onCambiada, soloLectura }) {
  const [generando,    setGenerando]    = useState(false)
  const [actualizando, setActualizando] = useState(false)
  const [modoAjuste,   setModoAjuste]   = useState(false)
  const [modoEscalar,  setModoEscalar]  = useState(false)
  const [textoAjuste,  setTextoAjuste]  = useState('')
  const [motivoEsc,    setMotivoEsc]    = useState(MOTIVOS_ESCALAR[0])
  const [comentEsc,    setComentEsc]    = useState('')
  const [msg,          setMsg]          = useState(null)

  const cx           = solicitud.resultado_cx   || {}
  const marca        = solicitud.resultado_marca || {}
  const duros        = solicitud.checks_duros   || {}
  const allHallazgos = solicitud.hallazgos      || []
  const score        = solicitud.indice_cumplimiento ?? 0
  const col          = scoreColor(score)
  const textoVC      = solicitud.version_corregida_texto
  const textoOrig    = solicitud.campos?.cuerpo || ''
  const revHum       = !!(solicitud.hard_stop || solicitud.tiene_adjuntos ||
    CATS_REV_HUMANA.includes(solicitud.categoria_inferida) ||
    CANALES_REV_HUMANA.includes(solicitud.canal))

  const principios = [
    { icono: '◉', nombre: 'Lenguaje cercano',
      score: marca.cercania_score ?? 0,
      hallazgos: allHallazgos.filter(h => h.categoria === 'cercania') },
    { icono: '◎', nombre: 'Mensaje claro',
      score: cx.claridad_score ?? 0,
      hallazgos: allHallazgos.filter(h => h.categoria === 'canal') },
    { icono: '⊛', nombre: 'Sin riesgo de marca',
      score: Math.max(0, 100 - (marca.riesgo_score ?? 100)),
      hallazgos: allHallazgos.filter(h => h.categoria === 'riesgo') },
    { icono: '◈', nombre: 'Seguro y transparente',
      score: (duros.palabras_prohibidas || []).length === 0 && duros.tono_cercano_ok !== false ? 95 : 25,
      hallazgos: allHallazgos.filter(h => ['palabras_prohibidas', 'tono'].includes(h.categoria)) },
    { icono: '⊕', nombre: 'Fácil de actuar (CTA)',
      score: cx.cta_score ?? 0,
      hallazgos: allHallazgos.filter(h => h.categoria === 'cta') },
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────────

  async function handleGenerarVC() {
    setGenerando(true); setMsg(null)
    try {
      const res = await fetch('http://localhost:8000/generar-version-corregida', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitud_id: solicitud.id }),
      })
      if (!res.ok) throw new Error('Error ' + res.status)
      await onCambiada()
      setMsg({ ok: true, txt: 'Versión corregida generada.' })
    } catch { setMsg({ ok: false, txt: 'No se pudo generar la versión corregida.' }) }
    finally { setGenerando(false) }
  }

  async function handleAprobar() {
    setActualizando(true); setMsg(null)
    try {
      const res = await fetch(`http://localhost:8000/solicitudes/${solicitud.id}/estado`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: 'aprobada', aprobado_por: 'CX Demo' }),
      })
      if (!res.ok) throw new Error('Error ' + res.status)
      await onCambiada()
      setMsg({ ok: true, txt: 'Solicitud aprobada.' })
    } catch { setMsg({ ok: false, txt: 'Error al aprobar.' }) }
    finally { setActualizando(false) }
  }

  async function handleGuardarAjuste() {
    if (!textoAjuste.trim()) return
    setActualizando(true); setMsg(null)
    try {
      const res = await fetch(`http://localhost:8000/solicitudes/${solicitud.id}/ajuste`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoAjuste }),
      })
      if (!res.ok) throw new Error('Error ' + res.status)
      await onCambiada(); setModoAjuste(false)
      setMsg({ ok: true, txt: 'Ajuste guardado.' })
    } catch { setMsg({ ok: false, txt: 'Error al guardar el ajuste.' }) }
    finally { setActualizando(false) }
  }

  async function handleEscalar() {
    setActualizando(true); setMsg(null)
    const motFinal = comentEsc.trim() ? `${motivoEsc}: ${comentEsc.trim()}` : motivoEsc
    try {
      const res = await fetch(`http://localhost:8000/solicitudes/${solicitud.id}/estado`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: 'escalada', motivo: motFinal }),
      })
      if (!res.ok) throw new Error('Error ' + res.status)
      await onCambiada(); setModoEscalar(false)
      setMsg({ ok: true, txt: 'Escalada para revisión cuidadosa de CX.' })
    } catch { setMsg({ ok: false, txt: 'Error al escalar.' }) }
    finally { setActualizando(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Contenido scrollable ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 8px' }}>

        {/* Header de solicitud */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#1A1A1A' }}>
              {solicitud.numero_solicitud || (solicitud.id || '').slice(0, 8)}
            </span>
            <BadgeEstado estado={solicitud.estado} />
            {revHum && (
              <span style={{
                background: '#FFF0EC', color: '#9E3B1A',
                border: '1px solid #F5C5B8', borderRadius: 20,
                padding: '2px 10px', fontSize: 11, fontWeight: 700,
              }}>
                Revisión crítica
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            {[
              solicitud.nombre_solicitante,
              CANAL_ETIQUETA[solicitud.canal] || solicitud.canal,
              solicitud.area_solicitante,
              solicitud.categoria_inferida,
              fmtFecha(solicitud.fecha_creacion),
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Tarjeta índice de calidad */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
          <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 700, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Índice de calidad
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: col }}>{score}</span>
              <span style={{ fontSize: 16, color: '#CCC' }}>/100</span>
            </div>
            <div style={{ flex: 1, height: 8, background: '#F0F0F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, height: '100%', background: col, borderRadius: 8 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Estado',           val: solicitud.banda_info?.etiqueta || '—' },
              { label: 'Ruta',             val: LABEL_RUTA[solicitud.ruta] || (solicitud.ruta || '—').replace(/_/g, ' ') },
              { label: 'Revisión crítica', val: solicitud.hard_stop ? 'Sí' : 'No', color: solicitud.hard_stop ? '#DC6050' : '#16A34A' },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#AAAAAA', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: color || '#1A1A1A' }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Evaluación de principios (expandible) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #F0F0F0' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Evaluación de principios
            </p>
          </div>
          {principios.map(p => <PrincipioRow key={p.nombre} {...p} />)}
        </div>

        {/* Adjuntos */}
        {solicitud.tiene_adjuntos && (
          <SeccionCard titulo="Adjuntos">
            <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8, padding: '8px 12px', marginBottom: (solicitud.adjuntos?.length || 0) > 0 ? 10 : 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#6D4C00' }}>
                Esta pieza incluye adjuntos y requiere revisión cuidadosa de CX.
              </p>
            </div>
            {(solicitud.adjuntos || []).map((a, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 0', borderTop: '1px solid #F5F5F5',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📎</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{a.nombre}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>
                    {a.tipo || '—'} · {formatTamano(a.tamano)}
                  </p>
                </div>
              </div>
            ))}
          </SeccionCard>
        )}

        {/* Vista previa del mensaje */}
        <SeccionCard titulo="Vista previa del mensaje">
          <ContenidoCanal texto={textoOrig} canal={solicitud.canal} />
        </SeccionCard>

        {/* Versión corregida */}
        {textoVC && (
          <SeccionCard titulo="Versión corregida — propuesta IA" accentBg="#F0F7F3">
            <ContenidoCanal texto={textoVC} canal={solicitud.canal} />
          </SeccionCard>
        )}

        {/* Historial */}
        {(solicitud.historial?.length || 0) > 0 && (
          <SeccionCard titulo="Historial">
            <div style={{ position: 'relative', paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: 3, top: 6, bottom: 6, width: 1, background: '#E8E8E8' }} />
              {solicitud.historial.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < solicitud.historial.length - 1 ? 12 : 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: (ESTADO_ST[e.estado] || {}).dot || '#AAA',
                    position: 'relative', left: -3,
                  }} />
                  <div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                        {LABEL_ESTADO[e.estado] || e.estado}
                      </span>
                      {e.analista && <span style={{ fontSize: 12, color: '#888' }}>por {e.analista}</span>}
                      <span style={{ fontSize: 11, color: '#BBBBBB' }}>{fmtHora(e.ts)}</span>
                    </div>
                    {e.nota && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#777' }}>{e.nota}</p>}
                  </div>
                </div>
              ))}
            </div>
          </SeccionCard>
        )}

        {/* Aprobada — solo lectura */}
        {soloLectura && solicitud.aprobado_por && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
              Aprobada por {solicitud.aprobado_por}
            </p>
            {solicitud.fecha_aprobacion && (
              <p style={{ margin: 0, fontSize: 12, color: '#4ADE80' }}>{fmtFecha(solicitud.fecha_aprobacion)}</p>
            )}
            {score < 85 && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#166534', fontStyle: 'italic' }}>
                Aprobada por criterio humano de CX.
              </p>
            )}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#DDDDDD', marginTop: 4, textAlign: 'right' }}>
          Análisis Valida · Mibanco
        </p>
      </div>

      {/* ── Barra de acciones fija ───────────────────────────────────────────── */}
      {!soloLectura && (
        <div style={{ flexShrink: 0, borderTop: '1px solid #E8ECF0', background: '#FFFFFF' }}>

          {/* Panel Ajustar */}
          {modoAjuste && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F0' }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>
                Editar comunicación
              </p>
              <textarea
                className="textarea-mibanco"
                rows={5}
                value={textoAjuste}
                onChange={e => setTextoAjuste(e.target.value)}
                style={{ marginBottom: 8, fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-primario"
                  style={{ fontSize: 13, padding: '7px 16px' }}
                  onClick={handleGuardarAjuste}
                  disabled={actualizando || !textoAjuste.trim()}>
                  {actualizando ? 'Guardando...' : 'Guardar ajuste'}
                </button>
                <button type="button" className="btn-secundario"
                  style={{ fontSize: 13, padding: '7px 14px' }}
                  onClick={() => setModoAjuste(false)} disabled={actualizando}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Panel Escalar */}
          {modoEscalar && (
            <div style={{ padding: '14px 20px', background: '#FFF8F7', borderBottom: '1px solid #FFE0DA' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 13 }}>Motivo del escalamiento</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {MOTIVOS_ESCALAR.map(m => (
                  <button key={m} type="button" onClick={() => setMotivoEsc(m)} style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                    background: motivoEsc === m ? '#E06C54' : '#FFFFFF',
                    color: motivoEsc === m ? '#FFFFFF' : '#555',
                    border: `1px solid ${motivoEsc === m ? '#E06C54' : '#DDD'}`,
                    fontWeight: motivoEsc === m ? 700 : 400,
                  }}>
                    {m}
                  </button>
                ))}
              </div>
              <textarea
                className="textarea-mibanco"
                rows={2}
                placeholder="Comentario adicional (opcional)"
                value={comentEsc}
                onChange={e => setComentEsc(e.target.value)}
                style={{ marginBottom: 10, fontSize: 13 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleEscalar} disabled={actualizando}
                  style={{ fontSize: 13, fontWeight: 700, padding: '7px 16px', cursor: 'pointer', borderRadius: 8, background: '#E06C54', border: 'none', color: '#FFFFFF', opacity: actualizando ? 0.6 : 1 }}>
                  {actualizando ? 'Guardando...' : 'Confirmar escalamiento'}
                </button>
                <button type="button" className="btn-secundario"
                  style={{ fontSize: 13, padding: '7px 14px' }}
                  onClick={() => setModoEscalar(false)} disabled={actualizando}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Feedback inline */}
          {msg && (
            <div style={{ padding: '8px 20px', background: msg.ok ? '#F0FDF4' : '#FFF0EC', borderBottom: '1px solid #EEEEEE' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: msg.ok ? '#166534' : '#9E3B1A' }}>
                {msg.txt}
              </p>
            </div>
          )}

          {/* Botones principales */}
          {!modoAjuste && !modoEscalar && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 20px', justifyContent: 'flex-end', alignItems: 'center' }}>
              {solicitud.estado !== 'escalada' && (
                <button type="button"
                  style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', cursor: 'pointer', borderRadius: 8, background: '#FFF', border: '1.5px solid #E06C54', color: '#C25B3C' }}
                  onClick={() => { setModoEscalar(true); setModoAjuste(false); setMsg(null) }}>
                  Escalar
                </button>
              )}
              <button type="button"
                style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', cursor: 'pointer', borderRadius: 8, background: '#FFF', border: '1.5px solid #D0D0D0', color: '#444' }}
                onClick={() => {
                  setTextoAjuste(textoVC || textoOrig)
                  setModoAjuste(true); setModoEscalar(false); setMsg(null)
                }}>
                Ajustar
              </button>
              <button type="button" disabled={generando}
                style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', cursor: 'pointer', borderRadius: 8, background: '#FFF', border: '1.5px solid #2D7D52', color: '#2D7D52', opacity: generando ? 0.6 : 1 }}
                onClick={handleGenerarVC}>
                {generando ? 'Generando...' : textoVC ? 'Regenerar' : 'Generar versión'}
              </button>
              {!ESTADOS_APROBADO.includes(solicitud.estado) && (
                <button type="button" disabled={actualizando}
                  style={{ fontSize: 13, fontWeight: 700, padding: '8px 22px', cursor: 'pointer', borderRadius: 8, background: '#00833E', border: 'none', color: '#FFFFFF', opacity: actualizando ? 0.6 : 1 }}
                  onClick={handleAprobar}>
                  {actualizando ? 'Aprobando...' : 'Aprobar'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── CabinaCx ──────────────────────────────────────────────────────────────────

export default function CabinaCx() {
  const [solicitudes,  setSolicitudes]  = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [error,        setError]        = useState(null)
  const [vista,        setVista]        = useState('activas')
  const [seleccionada, setSeleccionada] = useState(null)
  const [busqueda,     setBusqueda]     = useState('')
  const [filtro,       setFiltro]       = useState('todos')

  async function cargarSolicitudes() {
    setCargando(true); setError(null)
    try {
      const res  = await fetch('http://localhost:8000/solicitudes')
      if (!res.ok) throw new Error('Error ' + res.status)
      const data = await res.json()
      setSolicitudes(data)
      setSeleccionada(prev => prev ? (data.find(s => s.id === prev.id) || prev) : null)
    } catch (e) { setError(e.message) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargarSolicitudes() }, [])

  const ord = lista => [...lista].sort((a, b) => tsMs(b.fecha_creacion) - tsMs(a.fecha_creacion))

  const activas   = solicitudes.filter(s => !ESTADOS_APROBADO.includes(s.estado))
  const aprobadas = [...solicitudes.filter(s => ESTADOS_APROBADO.includes(s.estado))]
    .sort((a, b) => tsMs(b.fecha_aprobacion || b.fecha_creacion) - tsMs(a.fecha_aprobacion || a.fecha_creacion))

  const activasFiltradas = activas.filter(s => {
    if (filtro === 'pendiente'   && s.estado !== 'pendiente') return false
    if (filtro === 'en_revision' && !['requiere_ajustes', 'ajustado'].includes(s.estado)) return false
    if (filtro === 'escalada'    && s.estado !== 'escalada') return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        (s.numero_solicitud   || '').toLowerCase().includes(q) ||
        (s.area_solicitante   || '').toLowerCase().includes(q) ||
        (s.nombre_solicitante || '').toLowerCase().includes(q) ||
        (s.campos?.cuerpo     || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const listas   = ord(activasFiltradas.filter(s => clasificar(s) === 'lista'))
  const atencion = ord(activasFiltradas.filter(s => clasificar(s) === 'atencion'))
  const profunda = ord(activasFiltradas.filter(s => clasificar(s) === 'profunda'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 155px)', background: '#F5F7FA' }}>

      {/* ── Tabs + Actualizar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderBottom: '1px solid #E8ECF0',
        background: '#FFFFFF', flexShrink: 0,
      }}>
        <button type="button"
          className={`btn-vista${vista === 'activas' ? ' btn-vista-activo' : ''}`}
          onClick={() => { setVista('activas'); setSeleccionada(null) }}>
          Bandeja activa
          {activas.length > 0 && (
            <span className="badge-count" style={vista === 'activas' ? { background: '#FFC72C', color: '#00592A' } : {}}>
              {activas.length}
            </span>
          )}
        </button>
        <button type="button"
          className={`btn-vista${vista === 'aprobadas' ? ' btn-vista-activo' : ''}`}
          onClick={() => { setVista('aprobadas'); setSeleccionada(null) }}>
          Mensajes aprobados
          {aprobadas.length > 0 && <span className="badge-count">{aprobadas.length}</span>}
        </button>
        <button type="button" className="btn-vista"
          style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}
          onClick={cargarSolicitudes}>
          ↻ Actualizar
        </button>
      </div>

      {/* ── Layout principal ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Panel izquierdo — lista */}
        <div style={{
          width: 310, minWidth: 230, maxWidth: 360, flexShrink: 0,
          borderRight: '1px solid #E8ECF0', background: '#FFFFFF',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Buscador + filtros (solo en Bandeja activa) */}
          {vista === 'activas' && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Buscar por ID, área o contenido..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px',
                  border: '1px solid #E0E0E0', borderRadius: 8,
                  fontSize: 12, color: '#1A1A1A',
                  background: '#F8F8F8', boxSizing: 'border-box',
                  fontFamily: "'Segoe UI', Arial, sans-serif",
                  marginBottom: 8,
                }}
              />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[
                  { key: 'todos',       label: 'Todos' },
                  { key: 'pendiente',   label: 'Pendiente' },
                  { key: 'en_revision', label: 'En revisión' },
                  { key: 'escalada',    label: 'Escalada' },
                ].map(({ key, label }) => (
                  <button key={key} type="button"
                    onClick={() => setFiltro(key)}
                    style={{
                      fontSize: 11, fontWeight: filtro === key ? 700 : 400,
                      padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                      background: filtro === key ? '#00592A' : '#F0F0F0',
                      color: filtro === key ? '#FFFFFF' : '#666',
                      border: 'none',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista scrollable */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cargando && <p style={{ padding: 16, color: '#888', fontSize: 13 }}>Cargando solicitudes...</p>}
            {error    && <p style={{ padding: 16, color: '#DC6050', fontSize: 13 }}>Error: {error}</p>}

            {!cargando && !error && vista === 'activas' && (
              <>
                {activasFiltradas.length === 0 && (
                  <p style={{ padding: 16, color: '#AAAAAA', fontSize: 13 }}>
                    {busqueda || filtro !== 'todos'
                      ? 'Sin resultados para este filtro.'
                      : 'No hay solicitudes activas.'}
                  </p>
                )}
                {listas.length > 0 && (
                  <>
                    <GrupoHeader titulo="Listas para enviar" color="#16A34A" count={listas.length} />
                    {listas.map(s => (
                      <ItemBandeja key={s.id} solicitud={s}
                        activa={seleccionada?.id === s.id}
                        onSeleccionar={setSeleccionada} />
                    ))}
                  </>
                )}
                {atencion.length > 0 && (
                  <>
                    <GrupoHeader titulo="Requieren atención" color="#D97706" count={atencion.length} />
                    {atencion.map(s => (
                      <ItemBandeja key={s.id} solicitud={s}
                        activa={seleccionada?.id === s.id}
                        onSeleccionar={setSeleccionada} />
                    ))}
                  </>
                )}
                {profunda.length > 0 && (
                  <>
                    <GrupoHeader titulo="Revisión profunda de CX" color="#DC6050" count={profunda.length} />
                    {profunda.map(s => (
                      <ItemBandeja key={s.id} solicitud={s}
                        activa={seleccionada?.id === s.id}
                        onSeleccionar={setSeleccionada} />
                    ))}
                  </>
                )}
              </>
            )}

            {!cargando && !error && vista === 'aprobadas' && (
              <>
                {aprobadas.length === 0 && (
                  <p style={{ padding: 16, color: '#AAAAAA', fontSize: 13 }}>No hay mensajes aprobados.</p>
                )}
                {aprobadas.map(s => (
                  <ItemBandeja key={s.id} solicitud={s}
                    activa={seleccionada?.id === s.id}
                    onSeleccionar={setSeleccionada} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Panel derecho — detalle */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#F5F7FA' }}>
          {seleccionada ? (
            <PanelDetalle
              solicitud={seleccionada}
              onCambiada={cargarSolicitudes}
              soloLectura={ESTADOS_APROBADO.includes(seleccionada.estado) && vista === 'aprobadas'}
            />
          ) : (
            <PanelVacio />
          )}
        </div>

      </div>
    </div>
  )
}
