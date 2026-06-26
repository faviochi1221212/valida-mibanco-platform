from datetime import datetime
import re
import anthropic
from reglas_duras import ejecutar_checks_duros
from agente_cx import evaluar_cx
from agente_marca import evaluar_marca, generar_version_corregida as _generar_version_corregida_ia
from indice import calcular_indice, determinar_ruta, obtener_banda

MENSAJE_SERVICIO_NO_DISPONIBLE = "Servicio de validación no disponible, intenta de nuevo"

DIAS_ES = {
    "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
    "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo"
}

def _resultado_cx_fallback() -> dict:
    return {
        "claridad_score": 0,
        "simplicidad_score": 0,
        "canal_score": 0,
        "cta_score": 0,
        "hallazgos": [],
        "observaciones_cx": MENSAJE_SERVICIO_NO_DISPONIBLE,
    }

def _resultado_marca_fallback(campos: dict) -> dict:
    return {
        "cercania_score": 0,
        "riesgo_score": 0,
        "es_reclamo_crisis_oferta": False,
        "hallazgos": [],
        "observaciones_marca": MENSAJE_SERVICIO_NO_DISPONIBLE,
        "categoria_inferida": "",
    }

def _extraer_nombre_de_saludo(saludo: str) -> str:
    """Devuelve el nombre real del saludo si existe y no es un placeholder."""
    if not saludo or "{NOMBRE}" in saludo:
        return ""
    m = re.search(
        r"(?i)^(?:hola|buenos?\s+d[ií]as?|buenas?\s+(?:tardes?|noches?))[,\s]+(.+?)[\!\.\,]*$",
        saludo.strip(),
    )
    if m:
        nombre = m.group(1).strip()
        if nombre and "{" not in nombre:
            return nombre
    return ""

def _version_corregida_texto(version_corregida) -> str:
    """Aplana version_corregida a texto plano, venga como string (sms/whatsapp/etc.)
    u objeto por canal: email → asunto/saludo/cuerpo/cta; push → titulo/cuerpo."""
    if not isinstance(version_corregida, dict):
        return version_corregida
    if "titulo" in version_corregida:
        partes = [version_corregida[k] for k in ("titulo", "cuerpo") if version_corregida.get(k)]
        return "\n\n".join(partes)
    orden = ["asunto", "saludo", "cuerpo", "cta"]
    partes = [version_corregida[clave] for clave in orden if version_corregida.get(clave)]
    return "\n\n".join(partes)

def _hallazgos_de_checks_duros(checks_duros: dict, campos: dict, canal: str, remitente: str) -> list:
    hallazgos = []
    texto_completo = " ".join([campos.get(k, "") for k in ["saludo", "cuerpo", "cta"]])

    if not checks_duros["largo_ok"]:
        hallazgos.append({
            "fragmento_texto": texto_completo,
            "regla_infringida": "Supera el límite de 160 caracteres permitido para SMS",
            "categoria": "canal",
            "severidad": "alta",
        })

    if not checks_duros["remitente_ok"]:
        hallazgos.append({
            "fragmento_texto": remitente,
            "regla_infringida": "El remitente debe ser exactamente 'Mibanco Oficial' para SMS",
            "categoria": "canal",
            "severidad": "media",
        })

    for frase in checks_duros["palabras_prohibidas"]:
        hallazgos.append({
            "fragmento_texto": frase,
            "regla_infringida": "Vocabulario prohibido por lineamientos de marca",
            "categoria": "palabras_prohibidas",
            "severidad": "alta",
        })

    if not checks_duros["campos_obligatorios_ok"]:
        hallazgos.append({
            "fragmento_texto": "",
            "regla_infringida": f"Faltan campos obligatorios para el canal '{canal}'",
            "categoria": "campos_obligatorios",
            "severidad": "alta",
        })

    if not checks_duros["tono_cercano_ok"]:
        hallazgos.append({
            "fragmento_texto": "",
            "regla_infringida": "Tono no cercano (se detectó lenguaje formal: 'Estimado', 'usted' o 'sírvase')",
            "categoria": "tono",
            "severidad": "media",
        })

    return hallazgos

def _sumar_uso_tokens(*usos: dict) -> dict:
    total = {"input_tokens": 0, "output_tokens": 0, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}
    for uso in usos:
        for clave in total:
            total[clave] += (uso or {}).get(clave, 0)
    return total

def _verificar_completitud(campos: dict) -> dict:
    faltantes = []
    if not campos.get("cuerpo", "").strip():
        faltantes.append("texto / copy")
    if not campos.get("cta", "").strip():
        faltantes.append("CTA")
    if faltantes:
        return {
            "requiere_info": True,
            "campos_faltantes": faltantes,
            "mensaje_info": "Afinemos algunos detalles para continuar. Completa la información indicada y volvemos a revisar la pieza.",
        }
    return {"requiere_info": False, "campos_faltantes": [], "mensaje_info": ""}

def _llamar_agente(nombre: str, fn, fallback):
    """Ejecuta un agente de IA distinguiendo los errores propios del SDK de
    Anthropic (cuota/conexión/estado de la API) para loguearlos con detalle,
    pero siempre cae al mismo fallback de scores en 0 — nunca auto-aprueba
    por una falla de la IA."""
    try:
        return fn()
    except anthropic.RateLimitError as e:
        print(f"[orquestador] {nombre}: límite de tasa/cuota excedido: {e}")
    except anthropic.APIConnectionError as e:
        print(f"[orquestador] {nombre}: error de conexión con la API: {e}")
    except anthropic.APIStatusError as e:
        print(f"[orquestador] {nombre}: la API respondió con error ({e.status_code}): {e}")
    except Exception as e:
        print(f"[orquestador] {nombre} falló: {e}")
    return fallback()

def procesar_solicitud(canal: str, campos: dict, remitente: str = "",
                        toca_dac: bool = False, es_reclamo_manual: bool = False,
                        nombre_solicitante: str = "", tiene_adjuntos: bool = False) -> dict:
    """
    Orquestador: coordina Reglas duras + Agente CX + Agente Marca,
    calcula el índice y decide la ruta del gate. No genera version_corregida
    aquí — eso se hace a demanda con generar_version_corregida_para_solicitud().
    """
    checks_duros = ejecutar_checks_duros(canal, campos, remitente)

    resultado_cx = _llamar_agente(
        "evaluar_cx", lambda: evaluar_cx(canal, campos), _resultado_cx_fallback,
    )
    resultado_marca = _llamar_agente(
        "evaluar_marca", lambda: evaluar_marca(canal, campos), lambda: _resultado_marca_fallback(campos),
    )

    checks_finos = {
        "cercania_score": resultado_marca["cercania_score"],
        "claridad_score": resultado_cx["claridad_score"],
        "cta_score": resultado_cx["cta_score"],
    }

    indice = calcular_indice(checks_duros, checks_finos)

    hard_stop = (
        toca_dac
        or es_reclamo_manual
        or resultado_marca.get("es_reclamo_crisis_oferta", False)
    )
    categoria_inferida = resultado_marca.get("categoria_inferida", "")
    ruta = determinar_ruta(hard_stop, indice, categoria_inferida)
    if tiene_adjuntos and ruta != "revision_profunda":
        ruta = "revision_profunda"

    hallazgos = (
        _hallazgos_de_checks_duros(checks_duros, campos, canal, remitente)
        + resultado_cx.get("hallazgos", [])
        + resultado_marca.get("hallazgos", [])
    )

    uso_tokens_total = _sumar_uso_tokens(
        resultado_cx.get("uso_tokens"), resultado_marca.get("uso_tokens"),
    )

    completitud = _verificar_completitud(campos)

    return {
        "checks_duros": checks_duros,
        "resultado_cx": resultado_cx,
        "resultado_marca": resultado_marca,
        "indice_cumplimiento": indice,
        "hard_stop": hard_stop,
        "ruta": ruta,
        "banda_info": obtener_banda(indice),
        "categoria_inferida": categoria_inferida,
        "requiere_info": completitud["requiere_info"],
        "campos_faltantes": completitud["campos_faltantes"],
        "mensaje_info": completitud["mensaje_info"],
        "hallazgos": hallazgos,
        "uso_tokens_total": uso_tokens_total,
        "nombre_solicitante": nombre_solicitante,
        "tiene_adjuntos": tiene_adjuntos,
    }

def generar_version_corregida_para_solicitud(canal: str, campos: dict, hallazgos: list):
    """Genera la versión corregida a demanda, corrigiendo solo lo señalado en
    "hallazgos" y preservando el resto del mensaje original. Devuelve
    (texto_plano, uso_tokens)."""
    version_corregida, uso_tokens = _generar_version_corregida_ia(canal, campos, hallazgos)
    texto = _version_corregida_texto(version_corregida)
    # Si el LLM templató el nombre como {NOMBRE} pero el saludo original tiene
    # un nombre real, reemplazarlo para que el lector vea el nombre de verdad.
    if "{NOMBRE}" in texto:
        nombre_real = _extraer_nombre_de_saludo(campos.get("saludo", ""))
        if nombre_real:
            texto = texto.replace("{NOMBRE}", nombre_real)
    return texto, uso_tokens

def construir_documento_firebase(resultado: dict, canal: str, campos: dict,
                                  area_solicitante: str = "", nombre_solicitante: str = "",
                                  adjuntos: list = None) -> dict:
    """
    Arma el documento a guardar en la colección "solicitudes" a partir del
    resultado de procesar_solicitud(). No incluye "fecha_creacion": el caller
    debe agregarla (ej. firestore.SERVER_TIMESTAMP) antes de guardar.
    "version_corregida_texto" se guarda vacío: se completa después, a demanda,
    vía generar_version_corregida_para_solicitud() + firebase_config.actualizar_version_corregida().
    """
    ahora = datetime.now()
    return {
        "area_solicitante": area_solicitante,
        "nombre_solicitante": nombre_solicitante,
        "canal": canal,
        "campos": campos,
        "checks_duros": resultado["checks_duros"],
        "resultado_cx": resultado["resultado_cx"],
        "resultado_marca": resultado["resultado_marca"],
        "hallazgos": resultado["hallazgos"],
        "version_corregida_texto": None,
        "indice_cumplimiento": resultado["indice_cumplimiento"],
        "hard_stop": resultado["hard_stop"],
        "ruta": resultado["ruta"],
        "banda_info": resultado["banda_info"],
        "categoria_inferida": resultado["categoria_inferida"],
        "requiere_info": resultado["requiere_info"],
        "campos_faltantes": resultado["campos_faltantes"],
        "mensaje_info": resultado["mensaje_info"],
        "tiene_adjuntos": resultado.get("tiene_adjuntos", False),
        "adjuntos": adjuntos or [],
        "estado": "pendiente",

        # Campos planos para análisis (duplican lo que ya está anidado arriba)
        "claridad_score": resultado["resultado_cx"]["claridad_score"],
        "simplicidad_score": resultado["resultado_cx"]["simplicidad_score"],
        "canal_score": resultado["resultado_cx"]["canal_score"],
        "cta_score": resultado["resultado_cx"]["cta_score"],
        "cercania_score": resultado["resultado_marca"]["cercania_score"],
        "riesgo_score": resultado["resultado_marca"]["riesgo_score"],
        "tuvo_palabras_prohibidas": len(resultado["checks_duros"]["palabras_prohibidas"]) > 0,
        "cantidad_palabras_prohibidas": len(resultado["checks_duros"]["palabras_prohibidas"]),
        "cantidad_hallazgos": len(resultado["hallazgos"]),
        "uso_tokens_total": resultado["uso_tokens_total"],
        "anio": ahora.year,
        "mes": ahora.month,
        "dia_semana": DIAS_ES[ahora.strftime("%A")],
    }
