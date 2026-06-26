# Validador Mibanco — Contexto del proyecto

Herramienta interna que revisa piezas de comunicación a clientes (SMS, email,
WhatsApp, push, speech, carta, banner, pieza gráfica, post redes, video, landing)
antes de enviarlas: aplica reglas duras de negocio y usa Claude Sonnet 4.6
(Anthropic) para evaluar experiencia de cliente y marca, calcula un índice de
cumplimiento y decide si la pieza puede salir directo o necesita revisión humana.

No existe app de Streamlit activa. El único frontend es React, que consume la
API REST. Ver `C:\Users\LENOVO\Desktop\Mibanco\DOCUMENTACION_COMPLETA.md` para
el panorama completo.

## Arquitectura

```
React MesaEntrada ──► POST /extraer   ──► extractor.py
React MesaEntrada ──► POST /validar   ──► orquestador.py ──┬── reglas_duras.py
React CabinaCx    ──► GET  /solicitudes                     ├── agente_cx.py    (Claude Sonnet 4.6)
                  ──► POST /generar-version-corregida        └── agente_marca.py (Claude Sonnet 4.6)
                  ──► POST /solicitudes/{id}/estado
                  ──► POST /solicitudes/{id}/ajuste
                                                    │
                                                    ▼
                                             indice.py
                                    calcular_indice() / determinar_ruta() / obtener_banda()
                                                    │
                                                    ▼
                                         firebase_config.py → Firestore
                                           colección "solicitudes"
```

## Archivos backend (`validador-mibanco/`)

| Archivo | Rol |
|---|---|
| `api.py` | FastAPI + CORS. Endpoints: `GET /solicitudes`, `POST /extraer`, `POST /validar`, `POST /generar-version-corregida`, `POST /solicitudes/{id}/estado`, `POST /solicitudes/{id}/ajuste`. |
| `orquestador.py` | `procesar_solicitud()`: reglas duras + Agente CX + Agente Marca → índice, banda, ruta. `generar_version_corregida_para_solicitud()`: genera la versión corregida a demanda. `construir_documento_firebase()`: arma el documento para Firestore. |
| `extractor.py` | `extraer_campos()`: Claude separa texto libre en canal/asunto/saludo/cuerpo/cta. |
| `reglas_duras.py` | Sin IA: largo SMS (160 chars), remitente válido, campos obligatorios, tono formal, palabras prohibidas. Para canales distintos a SMS, los checks de canal siempre pasan. |
| `agente_cx.py` | Claude Sonnet 4.6. Evalúa claridad, simplicidad, adecuación al canal (11 canales), CTA. |
| `agente_marca.py` | Claude Sonnet 4.6. Evalúa cercanía, riesgo de marca, infiere `categoria_inferida` (rutinaria/reclamo/oferta_comercial/crisis), decide `es_reclamo_crisis_oferta`. `SYSTEM_PROMPT_CORRECCION` con reglas por canal. |
| `indice.py` | `calcular_indice()`, `determinar_ruta()` (umbral 85, no 80), `obtener_banda()` (verde/ambar/coral). |
| `firebase_config.py` | `guardar_solicitud()`, `actualizar_estado()` (guarda `motivo_escalamiento` y `fecha_aprobacion`), `actualizar_version_corregida()`, `guardar_ajuste_manual()`, `obtener_solicitud()`, `obtener_todas()`. |
| `data/vocabulario_mibanco.json` | Listas: `permitido`, `prohibido_negacion`, `prohibido_formal`, `prohibido_riesgo`, `palabras_inspiradoras`. |
| `seed_datos_demo.py` | Inserta 3 casos de ejemplo en Firestore sin llamar IA. |

## Archivos frontend (`frontend-react/`)

| Archivo | Rol |
|---|---|
| `src/App.jsx` | Header Mibanco + tabs ("Mesa de Entrada" / "Cabina CX") + renderiza el componente activo. |
| `src/MesaEntrada.jsx` | Flujo de captura: burbuja asistente → textarea libre → extracción → resumen → formulario (11 campos) → validación → `DiagnosticoRapido` → versión corregida. |
| `src/CabinaCx.jsx` | Cola de revisión: secciones "Listas para enviar" / "Requieren atención" / "Revisión profunda" + pestaña "Mensajes aprobados". Botones: Aprobar, Ajustar (abre editor inline), Escalar (abre panel con 6 motivos). |
| `src/App.css` | Paleta Mibanco + clases de componentes. |

## Lógica de rutas y bandas

| Condición | Ruta | Banda |
|---|---|---|
| `hard_stop = True` | `revision_profunda` | — |
| `categoria_inferida` en reclamo/oferta_comercial/crisis | `revision_profunda` | — |
| `indice >= 85` | `via_rapida` | verde |
| `indice >= 70` | `revision_a_fondo` | ambar |
| `indice < 70` | `revision_a_fondo` | coral |

`hard_stop` se activa si: `toca_dac OR es_reclamo_manual OR resultado_marca.es_reclamo_crisis_oferta`.

## Canales soportados

`sms`, `email`, `whatsapp`, `push`, `speech`, `carta`, `banner`, `pieza_grafica`,
`post_redes`, `video`, `landing`

Para piezas visuales (banner, pieza_grafica, post_redes, video, landing): se evalúa
únicamente el copy/texto asociado, no el diseño.

## Formato de `version_corregida` por canal

| Canal | Formato devuelto por IA |
|---|---|
| `email` | Objeto JSON `{asunto, saludo, cuerpo, cta}` |
| `push` | Objeto JSON `{titulo, cuerpo}` |
| Resto | String de texto plano |

`orquestador._version_corregida_texto()` aplana cualquiera de estos formatos a
un string legible — usar siempre este campo (`version_corregida_texto`), nunca
el campo `version_corregida` crudo.

## Decisiones de diseño clave

- **Claude Sonnet 4.6** (`claude-sonnet-4-6`, Anthropic) en todos los agentes.
  System prompts con `cache_control: ephemeral` para reducir costo de tokens.
- **Sin Streamlit**: `app.py` no existe en el proyecto activo. Todo va por API REST.
- **Orquestador sin Firebase**: `orquestador.py` solo calcula, no persiste. El
  caller (`api.py`) guarda y devuelve el resultado.
- **Versión corregida a demanda**: `procesar_solicitud()` no genera la versión
  corregida — se genera después, vía `POST /generar-version-corregida`.
- **Resiliencia ante fallos de IA**: cada agente tiene try/except con fallback
  (scores en 0, nunca auto-aprueba).
- **Placeholders conservados**: `{NOMBRE}`, `{ASESOR}`, `{MONTO}`, `{FECHA}`
  deben aparecer intactos en la versión corregida.
- **Sin emojis en comunicaciones**: `SYSTEM_PROMPT_CORRECCION` los elimina.
- **Umbral 85, no 80**: `determinar_ruta()` usa `umbral=85` por defecto.

## Campos que devuelve `POST /validar`

```json
{
  "indice_cumplimiento": 72,
  "hard_stop": false,
  "ruta": "revision_a_fondo",
  "banda_info": { "banda": "ambar", "etiqueta": "Casi listo, afinemos algunos detalles" },
  "categoria_inferida": "rutinaria",
  "requiere_info": false,
  "campos_faltantes": [],
  "mensaje_info": "",
  "hallazgos": [{ "fragmento_texto": "...", "regla_infringida": "...", "categoria": "canal", "severidad": "media" }],
  "checks_duros": { "largo_ok": true, "remitente_ok": false, ... },
  "resultado_cx": { "claridad_score": 80, "observaciones_cx": "...", ... },
  "resultado_marca": { "cercania_score": 70, "observaciones_marca": "...", "categoria_inferida": "...", ... },
  "uso_tokens_total": { "input_tokens": 0, "output_tokens": 0, ... },
  "id": "firestore-doc-id"
}
```

## Gotchas operativos (Windows)

- **uvicorn sin `--reload`**: evitar procesos worker huérfanos que dejan el
  puerto 8000 ocupado con código viejo.
  ```powershell
  .\venv\Scripts\python.exe -m uvicorn api:app --port 8000
  ```
- Antes de relanzar, verificar procesos `python.exe` huérfanos:
  `Get-Process -Name python*`
- Vite puede caer a `5174`/`5175` si `5173` está ocupado por otro proyecto.

## Cómo correr

```powershell
# Backend (API REST):
cd validador-mibanco
.\venv\Scripts\python.exe -m uvicorn api:app --port 8000

# Frontend React:
cd frontend-react
npm run dev

# Verificar sintaxis backend tras cambios:
.\venv\Scripts\python.exe -m py_compile api.py orquestador.py agente_cx.py agente_marca.py firebase_config.py indice.py
```
