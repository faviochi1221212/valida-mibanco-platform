# Validador Mibanco — Documentación completa

Última actualización: 2026-06-25

Este documento consolida en un solo lugar todo lo que existe del proyecto.
De general a específico.

---

## 1. Qué es esto, en una frase

Una herramienta interna que, antes de que Mibanco le envíe un mensaje a un
cliente (SMS, email, WhatsApp, push, speech, carta, banner, pieza gráfica,
post redes, video o landing), lo revisa automáticamente y le dice si puede
salir tal cual, si necesita ajustes, o si tiene que pasar por revisión
humana — combinando reglas fijas de negocio con dos agentes de Claude Sonnet 4.6
(uno de experiencia de cliente, otro de marca).

---

## 2. El problema que resuelve

Cualquier banco que envía comunicaciones masivas corre dos riesgos opuestos:

- **Mandar algo mal**: tono formal/distante, promesas excesivas, palabras que
  suenan a fraude, formato que no calza con el canal (ej. un SMS de 300
  caracteres), o un mensaje que en realidad es un reclamo de crisis disfrazado
  de comunicación normal.
- **Frenar todo por exceso de cautela**: si cada pieza necesita revisión legal
  y de marca manual, el equipo de negocio no puede moverse rápido.

El validador resuelve esto con un esquema de semáforo: automatiza lo que se
puede automatizar (reglas duras + IA) y solo escala a un humano lo que de
verdad lo necesita.

---

## 3. Cómo se decide si una pieza pasa o no

1. **Reglas duras** (deterministas, sin IA): ¿el SMS no excede 160 caracteres?
   ¿el remitente es válido? ¿están los campos obligatorios? ¿hay palabras
   prohibidas? ¿el tono es cercano (no usa "Estimado", "usted", etc.)?
2. **Agente CX** (Claude Sonnet 4.6): puntúa claridad, simplicidad, adecuación
   al canal y calidad del CTA. Genera hallazgos con fragmento textual exacto.
3. **Agente Marca** (Claude Sonnet 4.6): puntúa cercanía de tono y riesgo de
   marca, infiere la `categoria_inferida` (rutinaria/reclamo/oferta_comercial/
   crisis) y decide si la pieza es en realidad un reclamo/crisis o una oferta
   de riesgo (esto fuerza revisión profunda).
4. Los hallazgos de checks duros + CX + Marca se combinan en una sola lista.
5. Con todos esos checks se calcula un **índice de cumplimiento (0-100%)** y
   se decide una **ruta** y una **banda**:

| Condición | Ruta | Banda |
|---|---|---|
| `hard_stop = True` | `revision_profunda` | — |
| `categoria_inferida` en reclamo/oferta_comercial/crisis | `revision_profunda` | — |
| `indice >= 85` | `via_rapida` | verde — "Listo para enviar" |
| `indice >= 70` | `revision_a_fondo` | ambar — "Casi listo, afinemos algunos detalles" |
| `indice < 70` | `revision_a_fondo` | coral — "Mejorémoslo juntos" |

`hard_stop` se activa si: `toca_dac OR es_reclamo_manual OR resultado_marca.es_reclamo_crisis_oferta`.

6. Todo se guarda en Firebase (Firestore), con el resultado completo y campos
   planos pensados para análisis.

---

## 4. La interfaz: solo React

Hay **un único frontend activo**: la aplicación React (`frontend-react/`), que
consume el backend a través de una API REST (`api.py`). No existe aplicación de
Streamlit activa en el proyecto.

La app React tiene **dos vistas** accesibles desde tabs en el header:

### 4.a Mesa de Entrada (`MesaEntrada.jsx`)
Flujo de captura y validación:
1. Burbuja de asistente: "¡Hola! Pega aquí la comunicación..."
2. Textarea grande + botón "Extraer campos automáticamente" (llama `POST /extraer`)
3. Burbuja de resumen con los datos detectados
4. Formulario con los campos detectados (editables): canal, área, solicitante,
   asunto, saludo, cuerpo, CTA, remitente, checkboxes DAC/reclamo
5. Botón "Validar comunicación" (llama `POST /validar`)
6. Tarjeta de resultado con: índice + etiqueta de banda, ruta, hard-stop,
   categoría inferida, bloque de info faltante (si aplica), **Diagnóstico rápido**
   (hasta 4 hallazgos con fragmento), botón "Generar versión corregida"

### 4.b Cabina CX (`CabinaCx.jsx`)
Cola de revisión, con dos pestañas:

**Cabina CX (activa)**:
- Solicitudes agrupadas en tres secciones por prioridad:
  - **Listas para enviar** — banda verde, no escaladas
  - **Requieren atención** — banda ámbar, estado requiere_ajustes/ajustado
  - **Revisión profunda** — hard_stop, banda coral, estado escalada, categoría sensible
- Cada tarjeta muestra: REQ-ID, área, solicitante, canal, índice + etiqueta,
  badge de estado, fecha, hallazgos (tarjetas con punto de color), versión
  corregida, motivo de escalamiento si existe
- Acciones por solicitud:
  - **Aprobar** → estado `aprobada`, guarda `fecha_aprobacion`
  - **Ajustar** → abre editor inline; al guardar, persiste texto + estado `requiere_ajustes`
  - **Escalar** → abre panel con 6 motivos (Reclamo, Crisis, Oferta comercial,
    Riesgo reputacional, Duda de marca, Otro) + comentario libre; al confirmar,
    estado `escalada` + guarda `motivo_escalamiento`
  - **Generar/Regenerar versión corregida**

**Mensajes aprobados**:
- Solo solicitudes con estado `aprobada`/`aprobado`
- Ordenadas por `fecha_aprobacion` descendente
- Solo lectura (sin botones de acción)

---

## 5. Arquitectura general

```
React MesaEntrada ──► POST /extraer              ──► extractor.py (Claude)
React MesaEntrada ──► POST /validar              ──► orquestador.py
React CabinaCx    ──► GET  /solicitudes
                  ──► POST /generar-version-corregida
                  ──► POST /solicitudes/{id}/estado
                  ──► POST /solicitudes/{id}/ajuste
                                                        │
                                              orquestador.py
                                              procesar_solicitud()
                                                        │
                              ┌─────────────────────────┼─────────────────────────┐
                              ▼                          ▼                         ▼
                     reglas_duras.py           agente_cx.py              agente_marca.py
                   checks deterministas        (Claude Sonnet 4.6)       (Claude Sonnet 4.6)
                   (sin IA, sin costo)         claridad/simplicidad/     cercanía/riesgo/
                                               canal/CTA                 vocabulario/tono/
                                                                         categoria_inferida
                              │                          │                         │
                              └─────────────────────────┼─────────────────────────┘
                                                        ▼
                                                   indice.py
                                       calcular_indice() + determinar_ruta()
                                             + obtener_banda()
                                                        │
                                                        ▼
                                             firebase_config.py → Firestore
                                             colección "solicitudes"
                                             contador transaccional REQ-NNN
```

### Por qué estas decisiones de arquitectura

- **Orquestador sin Firebase**: `orquestador.py` solo calcula el resultado; quien
  lo llama (`api.py`) decide qué hacer con él (guardar, devolver). Permite que
  la lógica de negocio sea testeable sin Firestore.
- **Versión corregida a demanda**: `procesar_solicitud()` NO genera la versión
  corregida. Se genera después, vía `POST /generar-version-corregida`, para no
  consumir tokens en cada validación si el usuario no la necesita.
- **Dos agentes separados**: CX no opina de marca, Marca no opina de canal —
  prompts más simples y scores más confiables.
- **Reglas duras como primera línea, sin costo de IA**: todo lo determinista
  (largo de SMS, remitente, palabras prohibidas) se resuelve sin tokens.
- **Resiliencia ante fallos de IA**: cada llamada a Claude está en try/except.
  Si falla, devuelve fallback con scores en 0 — nunca auto-aprueba por un fallo.
- **System prompts con `cache_control: ephemeral`**: reduce el costo de tokens
  en llamadas repetidas al mismo agente.

---

## 6. Canales soportados

`sms`, `email`, `whatsapp`, `push`, `speech`, `carta`, `banner`, `pieza_grafica`,
`post_redes`, `video`, `landing`

Para piezas visuales (banner, pieza_grafica, post_redes, video, landing): se
evalúa únicamente el copy o texto asociado, no el diseño visual.
`reglas_duras.py` ya devuelve `True` (pasa) para todos los checks de canal en
piezas visuales y non-SMS — no fue necesario modificarla al agregar canales.

---

## 7. Backend — detalle de cada archivo (`validador-mibanco/`)

### `api.py`
API REST con FastAPI. CORS abierto para que el frontend React pueda llamarla.

Endpoints:
- `GET /solicitudes` → `obtener_todas()`, todos los documentos de Firestore con su `id`.
- `POST /extraer` → `extraer_campos(texto)`, devuelve `{canal, asunto, saludo, cuerpo, cta}`.
- `POST /validar` → recibe `SolicitudIn`, llama `procesar_solicitud()`, construye
  documento con `construir_documento_firebase()`, guarda con `guardar_solicitud()`,
  devuelve `{**resultado, "id": doc_id}`.
- `POST /generar-version-corregida` → recibe `{solicitud_id}`, llama
  `generar_version_corregida_para_solicitud()`, actualiza el documento en
  Firestore y devuelve `{version_corregida_texto, uso_tokens}`.
- `POST /solicitudes/{id}/estado` → recibe `{nuevo_estado, aprobado_por?, motivo?}`,
  llama `actualizar_estado()`. Si `motivo` está presente, guarda
  `motivo_escalamiento`. Si el estado es `aprobada`, guarda `fecha_aprobacion`.
- `POST /solicitudes/{id}/ajuste` → recibe `{texto}`, llama
  `guardar_ajuste_manual()` que guarda el texto editado y cambia estado a
  `requiere_ajustes`.

Corre sin `--reload` — cualquier cambio requiere reiniciar manualmente.

### `orquestador.py`
El corazón de la lógica de negocio, sin saber nada de Firebase ni de UI.

- `procesar_solicitud(canal, campos, remitente, toca_dac, es_reclamo_manual, nombre_solicitante)`:
  1. `ejecutar_checks_duros()`.
  2. `evaluar_cx()` con fallback (`_resultado_cx_fallback`).
  3. `evaluar_marca()` con fallback (`_resultado_marca_fallback`).
  4. `calcular_indice(checks_duros, checks_finos)`.
  5. `hard_stop = toca_dac OR es_reclamo_manual OR resultado_marca["es_reclamo_crisis_oferta"]`.
  6. `categoria_inferida = resultado_marca["categoria_inferida"]` → entra en `determinar_ruta()`.
  7. `hallazgos` = `_hallazgos_de_checks_duros()` + `resultado_cx["hallazgos"]` + `resultado_marca["hallazgos"]`.
  8. `completitud = _verificar_completitud(campos)` → `requiere_info`, `campos_faltantes`, `mensaje_info`.
  9. Devuelve dict con todo: checks, resultados de agentes, índice, hard_stop,
     ruta, `banda_info`, `categoria_inferida`, `requiere_info`, `campos_faltantes`,
     `mensaje_info`, hallazgos, uso_tokens_total.

- `generar_version_corregida_para_solicitud(canal, campos, hallazgos)`:
  genera la versión corregida a demanda. Devuelve `(texto_plano, uso_tokens)`.

- `_version_corregida_texto(version_corregida)`: aplana el output de la IA a
  string. Si es dict con clave `"titulo"` → push (`titulo + cuerpo`). Si es dict
  con `"asunto"` → email (`asunto + saludo + cuerpo + cta`). Si es string → lo
  devuelve tal cual (SMS, WhatsApp, carta, speech, piezas visuales).

- `construir_documento_firebase(resultado, canal, campos, area, nombre)`:
  arma el documento a guardar, incluyendo campos planos para análisis
  (`claridad_score`, `simplicidad_score`, `canal_score`, `cta_score`,
  `cercania_score`, `riesgo_score`, `tuvo_palabras_prohibidas`, `anio`, `mes`,
  `dia_semana`). No incluye `fecha_creacion` — el caller la agrega.

### `extractor.py`
`extraer_campos(texto_libre)`: usa Claude Sonnet 4.6 para devolver
`{canal, asunto, saludo, cuerpo, cta}` a partir de texto libre pegado tal cual.
Conserva los placeholders (`{NOMBRE}`, etc.) sin tocarlos. Si falla, devuelve
fallback con campos vacíos y `"error": "Servicio de extracción no disponible..."`.

### `reglas_duras.py`
Checks deterministas, sin IA, sin costo:
- `validar_largo_sms`: ≤ 160 caracteres (solo aplica si `canal = "sms"`).
- `validar_remitente`: para SMS, el remitente debe ser exactamente "mibanco
  oficial" (case-insensitive); para otros canales siempre pasa.
- `detectar_palabras_prohibidas`: busca en `data/vocabulario_mibanco.json`
  (`prohibido_negacion` + `prohibido_formal` + `prohibido_riesgo`). Usa raíz de
  palabra + ventana de tokens con tolerancia — detecta variantes y conjugaciones.
- `detectar_tono_formal`: si aparece "estimado", "usted" o "sírvase"
  (regex, case-insensitive), el tono NO es cercano.
- `validar_campos_obligatorios`: para `push` exige `asunto` y `cuerpo` no vacíos;
  para `email` exige `asesor_negocios` (campo que aún no existe en el formulario,
  por lo que este check siempre falla para email — pendiente §10); para los demás
  canales siempre pasa.
- `ejecutar_checks_duros(canal, campos, remitente)`: devuelve dict con
  `{largo_ok, remitente_ok, palabras_prohibidas (lista), campos_obligatorios_ok, tono_cercano_ok}`.

### `agente_cx.py`
Claude Sonnet 4.6 (`temperature: 0.2`). System prompt con `cache_control: ephemeral`.
Evalúa SOLO experiencia de cliente (claridad, simplicidad, adecuación al canal,
CTA). Conoce los 11 canales. Para piezas visuales evalúa únicamente el copy.
Las observaciones deben ser constructivas (nunca "está mal").
Devuelve JSON: `{claridad_score, simplicidad_score, canal_score, cta_score, hallazgos [], observaciones_cx}`.

### `agente_marca.py`
Claude Sonnet 4.6 (`temperature: 0.2`). System prompt con `cache_control: ephemeral`.
Evalúa SOLO identidad de marca:
- Vocabulario permitido/prohibido (carga `data/vocabulario_mibanco.json`).
- Cero emojis (cualquier emoji sube `riesgo_score`).
- Tono Mibanco: segunda persona, lenguaje cotidiano, frases breves.
- `categoria_inferida`: clasifica la pieza en `rutinaria`, `reclamo`, `oferta_comercial` o `crisis`.
- `es_reclamo_crisis_oferta`: `True` solo si es reclamo real o promesa/riesgo excesivo.
  Anunciar un producto normal NO activa esto.
- Observaciones constructivas (nunca "está mal").
Devuelve JSON: `{cercania_score, riesgo_score, hallazgos [], observaciones_marca, categoria_inferida, es_reclamo_crisis_oferta}`.

`SYSTEM_PROMPT_CORRECCION` (en el mismo archivo): genera la versión corregida
con reglas específicas por canal:
- **SMS**: máximo 160 caracteres absolutos, bloque único, sin saltos de línea,
  saludo opcional si no cabe, verificación y recorte obligatorio.
- **WhatsApp**: máximo 2-3 bloques, no "email disfrazado", conversacional.
- **Email**: completo (asunto/saludo/cuerpo/cta), sin límite artificial.
- **Push**: objeto `{titulo (≤40 chars), cuerpo (1-2 oraciones)}`.
- **Carta**: cercana, ordenada, más formal que WhatsApp.
- **Speech**: frases cortas, naturales al oído, sin viñetas ni abreviaciones.
- **Piezas visuales**: copy breve, una idea, CTA directo.

Personalización: usa `{NOMBRE}` si existe, saludo genérico si no. Conserva
`{NOMBRE}`, `{ASESOR}`, `{MONTO}`, `{FECHA}` intactos.

### `indice.py`
- `calcular_indice(checks_duros, checks_finos)`: suma puntos ponderados.
  Pesos de checks duros: `largo_ok` 15, `remitente_ok` 10,
  `campos_obligatorios_ok` 10, `tono_cercano_ok` 10. Palabras prohibidas: -20
  puntos (penalización fija). Pesos de checks finos: `cercania_score` 20,
  `claridad_score` 20, `cta_score` 15. Resultado: `(puntos / total) × 100`,
  redondeado, acotado entre 0 y 100.
- `determinar_ruta(hard_stop, indice, categoria, umbral=85)`:
  `revision_profunda` si `hard_stop` o `categoria` en sensibles.
  `via_rapida` si `indice >= 85`. `revision_a_fondo` en otro caso.
- `obtener_banda(indice)`: devuelve `{banda, etiqueta}`.
  Verde (`indice >= 85`), ambar (`>= 70`), coral (`< 70`).

### `firebase_config.py`
Conexión a Firestore vía `firebase-admin`, usando `credenciales_firebase.json`.
- `guardar_solicitud(data)`: asigna `numero_solicitud` (REQ-NNN, contador
  transaccional) y guarda en la colección `solicitudes`.
- `actualizar_estado(doc_id, nuevo_estado, aprobado_por=None, motivo=None)`:
  actualiza estado. Si `motivo` presente → guarda `motivo_escalamiento`.
  Si `nuevo_estado in ("aprobada", "aprobado")` → guarda `fecha_aprobacion: SERVER_TIMESTAMP`.
- `guardar_ajuste_manual(doc_id, texto)`: guarda texto editado como
  `version_corregida_texto` y cambia estado a `requiere_ajustes`.
- `actualizar_version_corregida(doc_id, texto, uso_tokens=None)`: guarda la
  versión corregida generada por IA.
- `obtener_solicitud(doc_id)`: devuelve un documento por ID.
- `obtener_todas()`: todos los documentos, ordenados por `fecha_creacion` desc.

### `data/vocabulario_mibanco.json`
Cuatro listas: `permitido`, `prohibido_negacion`, `prohibido_formal`,
`prohibido_riesgo`, `palabras_inspiradoras`. Alimentan tanto `reglas_duras.py`
como los prompts de `agente_marca.py`.

### `seed_datos_demo.py`
Inserta 3 documentos de ejemplo directo en Firestore (sin llamar IA) para
poblar/probar la Cabina CX visualmente.

### `test_reglas_duras.py`
Pruebas de `reglas_duras.py` sin IA. Seguro de correr cuantas veces se quiera.

### `requirements.txt`
`anthropic`, `firebase-admin`, `python-dotenv`, `fastapi`, `uvicorn`.

### `.env`
`ANTHROPIC_API_KEY` (Claude Sonnet 4.6).

---

## 8. Frontend React — detalle (`frontend-react/`)

Proyecto Vite + React 19.

### `src/App.jsx`
Header verde institucional "Mibanco / Validador de Comunicaciones" con dos tabs
(`Mesa de Entrada` / `Cabina CX`). Renderiza `<MesaEntrada />` o `<CabinaCx />`
según el tab activo.

### `src/MesaEntrada.jsx`
Componentes:
- **`DiagnosticoRapido`**: bloque de diagnóstico post-validación. Según `banda_info`:
  - Hard-stop → mensaje de revisión cuidadosa (borde coral).
  - Verde → mensaje positivo (borde verde).
  - Ámbar/coral → lista numerada de hasta 4 hallazgos (`regla_infringida` +
    `fragmento_texto`) con intro contextual (borde ámbar o coral).
  - Fallback: si no hay hallazgos, muestra `observaciones_cx` / `observaciones_marca`.
- **`MesaEntrada`**: gestiona `form` (10 campos), `resultado`, `textoLibre`,
  `camposExtraidos`, `versionCorregida`. Flujo completo de extracción + validación
  + diagnóstico + versión corregida.

Estado clave:
- `camposExtraidos`: `true` tras extracción exitosa → muestra burbuja de resumen
  y etiqueta "Datos detectados — ajusta si algo no quedó bien".

URL del backend hardcodeada: `http://localhost:8000`.

### `src/CabinaCx.jsx`
Componentes:
- **`BadgeEstado`**: badge redondeado con color según estado.
- **`HallazgoCard`**: tarjeta con punto de color (coral/ámbar/azul según
  severidad), título de categoría, regla infringida, fragmento en cursiva.
- **`PanelAjuste`**: textarea editable inline + botones Guardar/Cancelar.
  Al guardar llama `POST /solicitudes/{id}/ajuste`.
- **`PanelEscalar`**: radio buttons (6 motivos) + textarea libre + Confirmar/Cancelar.
  Al confirmar llama `POST /solicitudes/{id}/estado` con `{nuevo_estado: "escalada", motivo}`.
- **`SolicitudCard`**: tarjeta colapsable con header multi-línea (REQ-ID, área,
  canal, índice + etiqueta, badge de estado, fecha). Body: texto original, hallazgos,
  categoría, campos faltantes, versión corregida, motivo de escalamiento, nota IA.
  Acepta prop `soloLectura` (oculta botones de acción — usado en vista aprobados).
- **`SeccionSolicitudes`**: encabezado con punto de color + lista de SolicitudCards.
  Solo se renderiza si tiene al menos una solicitud.
- **`CabinaCx`**: carga solicitudes, las filtra (activas/aprobadas), clasifica
  activas en `lista`/`atencion`/`profunda` con la función `clasificar()`.
  Tabs "Cabina CX" / "Mensajes aprobados" + botón "Actualizar".

Funciones helpers:
- `clasificar(s)`: devuelve `'profunda'` si hard_stop, ruta=revision_profunda,
  estado=escalada, banda=coral o categoria sensible; `'lista'` si banda verde y
  no está en ajuste; `'atencion'` en otro caso.
- `ordenarAsc(lista)`: ordena por `fecha_creacion` ascendente (más antigua primero).
- `timestampMs(ts)`: normaliza timestamps de Firestore (puede llegar como string
  ISO o como objeto `{seconds, _seconds}`).

### `src/App.css`
Paleta Mibanco:
- Verde institucional `#00833E` / verde oscuro `#00592A`
- Dorado `#FFC72C`
- Verde texto `#2D7D52`, ámbar texto `#8C6B00`, coral texto `#C25B3C`
- Fondo `#F7F7F7`, tarjetas blancas con `border-radius: 12px`

Clases principales: `.tarjeta`, `.campo`, `.btn-primario`, `.btn-secundario`,
`.btn-cx` (+ `.btn-cx-aprobar`, `.btn-cx-ajustar`, `.btn-cx-escalar`),
`.btn-vista` (+ `.btn-vista-activo`), `.badge-count`, `.chat-asistente`,
`.burbuja-asistente`, `.avatar-asistente`, `.burbuja-texto`,
`.campos-detectados-label`, `.resultado-via-rapida`, `.resultado-revision-fondo`,
`.resultado-hard-stop`, `.solicitud-card`, `.solicitud-header`, `.solicitud-body`,
`.hallazgo-item`, `.version-corregida`.

---

## 9. Formato de `version_corregida` por canal

| Canal | Formato que devuelve el Agente Marca |
|---|---|
| `email` | Objeto JSON `{asunto, saludo, cuerpo, cta}` |
| `push` | Objeto JSON `{titulo, cuerpo}` |
| `sms`, `whatsapp`, `carta`, `speech`, piezas visuales | String de texto plano |

`orquestador._version_corregida_texto()` aplana siempre a string:
- Detecta `"titulo"` → push: `titulo + "\n\n" + cuerpo`
- Detecta `"asunto"` → email: `asunto + saludo + cuerpo + cta`
- Else → string tal cual

**Usar siempre `version_corregida_texto`, nunca el campo crudo.**

---

## 10. Gotchas operativos (Windows)

- **uvicorn sin `--reload`**: usar `--reload` genera procesos worker huérfanos
  que dejan el puerto 8000 ocupado con código viejo (parece error de CORS pero
  en realidad es un 500 sin headers de CORS desde el proceso viejo). Lanzar
  siempre así:
  ```powershell
  .\venv\Scripts\python.exe -m uvicorn api:app --port 8000
  ```
- Antes de relanzar, verificar procesos huérfanos:
  `Get-Process -Name python*`
- Vite cae a `5174`/`5175` si `5173` está ocupado por otro proyecto.
- Tras modificar cualquier archivo `.py` del backend, el proceso uvicorn debe
  reiniciarse manualmente para que los cambios tomen efecto.
- Verificar sintaxis antes de reiniciar:
  ```powershell
  .\venv\Scripts\python.exe -m py_compile api.py orquestador.py agente_cx.py agente_marca.py firebase_config.py indice.py
  ```

---

## 11. Pendientes / decisiones abiertas

- **`riesgo_score` no entra en `calcular_indice()`**: se calcula pero es solo
  informativo. Pendiente decidir si se incorpora.
- **`simplicidad_score` y `canal_score` (Agente CX) tampoco entran en el índice**.
- **`validar_campos_obligatorios` para email pide `asesor_negocios`**, campo
  que no existe en el formulario — ese check siempre falla para canal `email`.
- **URL del backend hardcodeada** (`http://localhost:8000`) en todos los `fetch()`
  del frontend React, sin variable de entorno.
- **Emails reales de Mibanco** son HTML rico con banners y footer legal — mucho
  más complejos que el formulario de texto plano actual.
