# Gestión del índice/vocabulario de términos Mibanco usado en las validaciones
def calcular_indice(checks_duros: dict, checks_finos: dict) -> int:
    puntos = 0
    total = 0

    pesos_duros = {"largo_ok": 15, "remitente_ok": 10, "campos_obligatorios_ok": 10, "tono_cercano_ok": 10}
    for check, peso in pesos_duros.items():
        total += peso
        if checks_duros[check]:
            puntos += peso

    if checks_duros["palabras_prohibidas"]:
        puntos -= 20

    pesos_finos = {"cercania_score": 20, "claridad_score": 20, "cta_score": 15}
    for check, peso in pesos_finos.items():
        total += peso
        puntos += (checks_finos[check] / 100) * peso

    return max(0, min(100, round((puntos / total) * 100)))

def determinar_ruta(hard_stop: bool, indice: int, categoria: str = "", umbral: int = 85) -> str:
    if hard_stop:
        return "revision_profunda"
    if categoria in ("reclamo", "oferta_comercial", "crisis"):
        return "revision_profunda"
    return "via_rapida" if indice >= umbral else "revision_a_fondo"

def obtener_banda(indice: int) -> dict:
    if indice >= 85:
        return {
            "banda": "verde",
            "etiqueta": "Listo para enviar"
        }
    elif indice >= 70:
        return {
            "banda": "ambar",
            "etiqueta": "Casi listo, afinemos algunos detalles"
        }
    else:
        return {
            "banda": "coral",
            "etiqueta": "Mejorémoslo juntos"
        }
