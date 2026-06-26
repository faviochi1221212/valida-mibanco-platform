# Reglas duras de validación (criterios fijos de negocio que no dependen del agente Claude)
import json
import re
import unicodedata

with open("data/vocabulario_mibanco.json", encoding="utf-8") as f:
    VOCAB = json.load(f)

TOLERANCIA_VENTANA = 3  # palabras de margen permitidas entre los términos de una frase prohibida


def _normalizar(texto: str) -> str:
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", texto.lower())
        if unicodedata.category(c) != "Mn"
    )
    return sin_tildes


def _tokenizar(texto: str) -> list:
    return re.findall(r"\w+", _normalizar(texto))


def _raiz(palabra: str) -> str:
    # Raíz aproximada: tolera variantes de género/número/conjugación (garantizado -> garantizamos)
    if len(palabra) <= 5:
        return palabra
    return palabra[: max(5, len(palabra) - 4)]


def _frase_presente(tokens_texto: list, frase: str) -> bool:
    frase_limpia = re.sub(r"/\w*", "", frase)  # "Estimado/a" -> "Estimado"
    tokens_frase = _tokenizar(frase_limpia)
    if not tokens_frase:
        return False
    raices_frase = [_raiz(t) for t in tokens_frase]
    ventana = len(tokens_frase) + TOLERANCIA_VENTANA
    for inicio in range(len(tokens_texto)):
        bloque = tokens_texto[inicio:inicio + ventana]
        if all(any(tok.startswith(raiz) for tok in bloque) for raiz in raices_frase):
            return True
    return False


def validar_largo_sms(texto: str) -> bool:
    return len(texto) <= 160


def validar_remitente(canal: str, remitente: str) -> bool:
    if canal == "sms":
        return remitente.strip().lower() == "mibanco oficial"
    return True


def detectar_palabras_prohibidas(texto: str) -> list:
    tokens_texto = _tokenizar(texto)
    todas_prohibidas = (
        VOCAB["prohibido_negacion"] + VOCAB["prohibido_formal"] + VOCAB["prohibido_riesgo"]
    )
    return [frase for frase in todas_prohibidas if _frase_presente(tokens_texto, frase)]


def detectar_tono_formal(texto: str) -> bool:
    patrones_formales = [r"\bestimado\b", r"\busted\b", r"\bsírvase\b"]
    for patron in patrones_formales:
        if re.search(patron, texto.lower()):
            return False
    return True


def validar_campos_obligatorios(canal: str, campos: dict) -> bool:
    if canal == "email":
        return bool(campos.get("asesor_negocios"))
    if canal == "push":
        return bool(campos.get("asunto")) and bool(campos.get("cuerpo"))
    return True


def ejecutar_checks_duros(canal: str, campos: dict, remitente: str = "") -> dict:
    texto_completo = " ".join([campos.get(k, "") for k in ["saludo", "cuerpo", "cta"]])
    return {
        "largo_ok": validar_largo_sms(texto_completo) if canal == "sms" else True,
        "remitente_ok": validar_remitente(canal, remitente),
        "palabras_prohibidas": detectar_palabras_prohibidas(texto_completo),
        "campos_obligatorios_ok": validar_campos_obligatorios(canal, campos),
        "tono_cercano_ok": detectar_tono_formal(texto_completo),
    }
