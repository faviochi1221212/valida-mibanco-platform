import { useState, useEffect } from 'react'
import './App.css'
import MesaEntrada from './MesaEntrada'
import CabinaCx from './CabinaCx'
import { auth, googleProvider } from './firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import tigerImg from './assets/tiger-valida.png'

const G = '#006B3F'

// ── Logo VALIDA ───────────────────────────────────────────────────────────────
function ValidaLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2L3 6.5V11C3 15.1 6.4 18.9 11 20C15.6 18.9 19 15.1 19 11V6.5L11 2Z" fill="white" fillOpacity="0.95" />
          <path d="M8 11L10.5 13.5L14.5 9" stroke="#006B3F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span style={{
        fontSize: 24, fontWeight: 700, color: 'white',
        letterSpacing: '0.22em', fontFamily: 'Poppins, sans-serif',
      }}>
        VALIDA
      </span>
    </div>
  )
}

// ── Tigre con tarjetas flotantes ──────────────────────────────────────────────
function TigerWithCards() {
  const TC = { x: 290, y: 282 }
  const cardData = [
    { id: 'camp', cx: 78,  cy: 70  },
    { id: 'list', cx: 424, cy: 56  },
    { id: 'ai',   cx: 424, cy: 194 },
    { id: 'appr', cx: 424, cy: 386 },
    { id: 'recs', cx: 78,  cy: 386 },
    { id: 'comp', cx: 78,  cy: 222 },
  ]
  return (
    <svg
      viewBox="0 0 502 478"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 340, margin: '0 auto', display: 'block' }}
      aria-label="Mascota tigre VALIDA con tarjetas de funcionalidades"
    >
      <circle cx="244" cy="240" r="150" fill="white" fillOpacity="0.03" />
      <circle cx="244" cy="240" r="100" fill="white" fillOpacity="0.03" />

      <image href={tigerImg} x="-170" y="-160" width="842" height="842" style={{ mixBlendMode: 'multiply' }} />

      {cardData.map(({ id, cx, cy }) => (
        <path
          key={id}
          d={`M${cx},${cy} Q${(cx + TC.x) / 2},${(cy + TC.y) / 2} ${TC.x},${TC.y}`}
          stroke="white" strokeOpacity="0.15" strokeWidth="1.5"
          strokeDasharray="4 6" strokeLinecap="round" fill="none"
        />
      ))}

      {/* Card 1: Validación de campañas — top left */}
      <rect x="6" y="44" width="144" height="52" rx="11" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="30" cy="70" r="13" fill="#F7C600" fillOpacity="0.38" />
      <rect x="23" y="65" width="14" height="10" rx="2" fill="white" fillOpacity="0.75" />
      <path d="M23 65 L30 60 L37 65" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="50" y="66" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">Validación de</text>
      <text x="50" y="77" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">campañas</text>
      <circle cx="140" cy="50" r="5" fill="#F7C600" fillOpacity="0.8" />

      {/* Card 2: Lista de validación — top right */}
      <rect x="366" y="30" width="126" height="52" rx="11" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="390" cy="56" r="13" fill="white" fillOpacity="0.18" />
      <line x1="384" y1="52" x2="396" y2="52" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="384" y1="56" x2="393" y2="56" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="384" y1="60" x2="395" y2="60" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <text x="408" y="52" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">Lista de</text>
      <text x="408" y="63" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">validación</text>

      {/* Card 3: Análisis con IA — right mid */}
      <rect x="364" y="168" width="126" height="52" rx="11" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="388" cy="194" r="13" fill="#F7C600" fillOpacity="0.38" />
      <path d="M388 187 L389.6 192 L395 194 L389.6 196 L388 201 L386.4 196 L381 194 L386.4 192 Z" fill="white" fillOpacity="0.9" />
      <text x="408" y="190" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">Análisis</text>
      <text x="408" y="201" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">con IA</text>
      <circle cx="478" cy="174" r="4.5" fill="#F7C600" fillOpacity="0.7" />

      {/* Card 4: Comunicación aprobada — bottom right */}
      <rect x="366" y="360" width="126" height="52" rx="11" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="390" cy="386" r="13" fill="#006B3F" fillOpacity="0.6" />
      <path d="M384 386 L388 390 L396 382" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="410" y="382" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">Com.</text>
      <text x="410" y="393" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">aprobada</text>

      {/* Card 5: Recomendaciones IA — bottom left */}
      <rect x="6" y="360" width="144" height="52" rx="11" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="30" cy="386" r="13" fill="#F7C600" fillOpacity="0.38" />
      <circle cx="30" cy="382" r="4" fill="white" fillOpacity="0.8" />
      <path d="M26 387 Q30 391 34 387" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <line x1="30" y1="391" x2="30" y2="394" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" />
      <text x="50" y="382" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">Recomend.</text>
      <text x="50" y="393" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">con IA</text>

      {/* Card 6: Cumplimiento normativo — left mid */}
      <rect x="6" y="196" width="144" height="52" rx="11" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.22" strokeWidth="1.2" />
      <circle cx="30" cy="222" r="13" fill="white" fillOpacity="0.18" />
      <path d="M30 214 L23 218 V222 C23 226.4 26.2 229.5 30 230.5 C33.8 229.5 37 226.4 37 222 V218 Z" fill="white" fillOpacity="0.62" />
      <text x="50" y="218" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">Cumplimiento</text>
      <text x="50" y="229" fontSize="7.5" fill="white" fontFamily="Inter,sans-serif" fontWeight="700" fillOpacity="0.9">normativo</text>
      <circle cx="9" cy="364" r="4.5" fill="#F7C600" fillOpacity="0.7" />

      {/* Destellos decorativos */}
      <path d="M344 28 L345.2 31.6 L349 32.8 L345.2 34 L344 37.6 L342.8 34 L339 32.8 L342.8 31.6 Z" fill="#F7C600" fillOpacity="0.85" />
      <path d="M154 44 L155 47 L158 48 L155 49 L154 52 L153 49 L150 48 L153 47 Z" fill="#F7C600" fillOpacity="0.75" />
      <path d="M460 268 L461 271 L464 272 L461 273 L460 276 L459 273 L456 272 L459 271 Z" fill="#F7C600" fillOpacity="0.7" />
      <path d="M178 430 L179 433 L182 434 L179 435 L178 438 L177 435 L174 434 L177 433 Z" fill="#F7C600" fillOpacity="0.55" />
    </svg>
  )
}

// ── Pantalla de carga ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F7' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #E0E0E0', borderTop: '4px solid #00833E', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#666', fontSize: 15, margin: 0 }}>Cargando Valida...</p>
      </div>
    </div>
  )
}

// ── Pantalla de login ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin, error }) {
  const [googleHover, setGoogleHover] = useState(false)

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Panel izquierdo: hero verde ── */}
      <div style={{
        width: '50%',
        minHeight: '100vh',
        background: 'linear-gradient(148deg, #002816 0%, #003d22 30%, #005a30 62%, #006B3F 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Destellos de fondo */}
        <div style={{ position: 'absolute', top: -96, right: -96, width: 320, height: 320, borderRadius: '50%', background: 'rgba(247,198,0,0.06)', filter: 'blur(48px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: -80, width: 288, height: 288, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 384, height: 384, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,107,63,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
          <ValidaLogo />
        </div>

        {/* Contenido hero */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Etiqueta */}
          <div style={{ marginBottom: 20 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 100,
              background: 'rgba(247,198,0,0.16)',
              color: '#F7C600',
              fontFamily: 'Inter, sans-serif',
            }}>
              Para equipos de Mibanco
            </span>
          </div>

          {/* Título */}
          <h1 style={{
            margin: '0 0 12px',
            fontSize: 36, fontWeight: 700,
            color: 'white', lineHeight: 1.2,
            fontFamily: 'Poppins, sans-serif',
          }}>
            Bienvenido a{' '}
            <span style={{ color: '#F7C600' }}>VALIDA</span>
          </h1>

          {/* Subtítulo */}
          <p style={{
            margin: '0 0 8px',
            fontSize: 14,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.6,
            maxWidth: 300,
          }}>
            El copiloto inteligente para la validación de comunicaciones.
          </p>

          {/* Ilustración tigre */}
          <TigerWithCards />
        </div>

        {/* Beneficios + copyright */}
        <div style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {['Validación de campañas', 'Cumplimiento normativo', 'Análisis con IA'].map(label => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(247,198,0,0.16)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <polyline points="2,9 6,13 14,3" stroke="#F7C600" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 1, background: 'rgba(247,198,0,0.5)', borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
              Mibanco © {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div style={{
        flex: 1,
        minHeight: '100vh',
        background: '#F4F7F4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        {/* Tarjeta de login */}
        <div style={{
          width: '100%',
          maxWidth: 448,
          background: 'white',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 4px 40px rgba(0,107,63,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        }}>
          {/* Encabezado */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 6px',
              fontSize: 24, fontWeight: 600,
              color: '#0D1F0D',
              fontFamily: 'Poppins, sans-serif',
            }}>
              Iniciar sesión
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#637063', lineHeight: 1.5 }}>
              Ingresa con tu cuenta de Google para continuar.
            </p>
          </div>

          {/* Botón Google */}
          <button
            type="button"
            onClick={onLogin}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '14px 20px',
              background: googleHover ? '#f8fcf8' : 'white',
              border: `1.5px solid ${googleHover ? G : 'rgba(0,107,63,0.15)'}`,
              borderRadius: 16,
              fontSize: 15, fontWeight: 500,
              color: '#2D4A2D',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'Inter, sans-serif',
              boxShadow: googleHover ? `0 2px 16px rgba(0,107,63,0.14)` : '0 1px 4px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={() => setGoogleHover(true)}
            onMouseLeave={() => setGoogleHover(false)}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Ingresar con Google
          </button>

          {/* Error de autenticación */}
          {error && (
            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              background: '#FFF0EC',
              border: '1px solid #F5C5B8',
              borderRadius: 10,
              fontSize: 13,
              color: '#9E3B1A',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Nota de uso exclusivo */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L3 6.5V11C3 15.1 6.4 18.9 11 20C15.6 18.9 19 15.1 19 11V6.5L11 2Z" fill="#b0beb0" />
            </svg>
            <p style={{ margin: 0, fontSize: 12, color: '#b0beb0' }}>
              Uso exclusivo para colaboradores de Mibanco
            </p>
          </div>
        </div>

        {/* Acento inferior */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F7C600' }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: G }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#F7C600' }} />
          <span style={{ fontSize: 11, color: '#9aab9a', marginLeft: 4 }}>VALIDA v1.0 · Mibanco</span>
        </div>
      </div>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────────────────────
function App() {
  const [vista,       setVista]       = useState('mesa')
  const [usuario,     setUsuario]     = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError,   setAuthError]   = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user)
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  const handleLogin = async () => {
    try {
      setAuthError('')
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error(error)
      setAuthError('No se pudo iniciar sesión con Google. Verifica que el dominio esté autorizado en Firebase.')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error(error)
    }
  }

  if (authLoading) return <LoadingScreen />
  if (!usuario)    return <LoginScreen onLogin={handleLogin} error={authError} />

  return (
    <div>
      <div className="header-mibanco" style={{ position: 'relative' }}>
        <h1>Mibanco</h1>
        <p>Validador de Comunicaciones</p>
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${vista === 'mesa' ? 'tab-btn-activo' : ''}`}
            onClick={() => setVista('mesa')}
          >
            Mesa de Entrada
          </button>
          <button
            type="button"
            className={`tab-btn ${vista === 'cabina' ? 'tab-btn-activo' : ''}`}
            onClick={() => setVista('cabina')}
          >
            Cabina de CX
          </button>
        </div>

        {/* Usuario — esquina superior derecha */}
        <div style={{
          position: 'absolute', top: 14, right: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {usuario.photoURL && (
            <img
              src={usuario.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)' }}
            />
          )}
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.2 }}>
              {usuario.displayName || usuario.email}
            </p>
            {usuario.displayName && (
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.2 }}>
                {usuario.email}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 6,
              color: '#FFFFFF',
              fontSize: 12,
              padding: '5px 11px',
              cursor: 'pointer',
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontWeight: 500,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {vista === 'mesa' ? <MesaEntrada /> : <CabinaCx />}
    </div>
  )
}

export default App
