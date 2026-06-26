# Inserta documentos de ejemplo en Firestore para probar la Cabina de CX
# sin necesidad de llamar a ningún agente ni API.
from datetime import datetime
from firebase_config import guardar_solicitud

DIAS_ES = {
    "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
    "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo"
}

CASOS_DEMO = [
    {
        "fecha_creacion": datetime.fromisoformat("2026-06-25T10:00:00"),
        "area_solicitante": "Digital",
        "nombre_solicitante": "Juan Pérez",
        "canal": "email",
        "campos": {
            "asunto": "Seguimos mejorando tu experiencia digital",
            "saludo": "Hola, {NOMBRE}",
            "cuerpo": "En Mibanco seguimos evolucionando para brindarte una experiencia digital más simple, segura y eficiente.",
            "cta": "Contáctanos al (01) 319-9999",
        },
        "checks_duros": {
            "largo_ok": True,
            "remitente_ok": True,
            "palabras_prohibidas": [],
            "campos_obligatorios_ok": True,
            "tono_cercano_ok": True,
        },
        "resultado_cx": {
            "claridad_score": 92,
            "simplicidad_score": 90,
            "canal_score": 95,
            "cta_score": 85,
            "fragmento_que_falla": None,
            "observaciones_cx": "CTA podría ser más específico",
        },
        "resultado_marca": {
            "cercania_score": 88,
            "riesgo_score": 8,
            "version_corregida": "Hola, {NOMBRE}. Seguimos mejorando tu experiencia digital para que la vivas más simple, segura y al alcance de tu mano. Cualquier duda, llámanos al (01) 319-9999.",
            "es_reclamo_crisis_oferta": False,
            "observaciones_marca": "Buen uso de tono cercano",
        },
        "version_corregida_texto": "Hola, {NOMBRE}. Seguimos mejorando tu experiencia digital para que la vivas más simple, segura y al alcance de tu mano. Cualquier duda, llámanos al (01) 319-9999.",
        "indice_cumplimiento": 90,
        "hard_stop": False,
        "ruta": "via_rapida",
        "estado": "pendiente",
    },
    {
        "fecha_creacion": datetime.fromisoformat("2026-06-25T10:15:00"),
        "area_solicitante": "Productos",
        "nombre_solicitante": "María Gómez",
        "canal": "sms",
        "campos": {
            "asunto": "",
            "saludo": "Estimado cliente",
            "cuerpo": "Le informamos que tiene disponible una línea de crédito. No podemos garantizar la aprobación inmediata.",
            "cta": "Llámenos",
        },
        "checks_duros": {
            "largo_ok": True,
            "remitente_ok": True,
            "palabras_prohibidas": ["No podemos"],
            "campos_obligatorios_ok": True,
            "tono_cercano_ok": False,
        },
        "resultado_cx": {
            "claridad_score": 60,
            "simplicidad_score": 55,
            "canal_score": 80,
            "cta_score": 50,
            "fragmento_que_falla": "No podemos garantizar la aprobación inmediata",
            "observaciones_cx": "Tono formal, CTA poco claro",
        },
        "resultado_marca": {
            "cercania_score": 35,
            "riesgo_score": 25,
            "version_corregida": "Hola, tu línea de crédito ya está disponible. Ingresa a la App Mibanco para conocer tus opciones.",
            "es_reclamo_crisis_oferta": False,
            "observaciones_marca": "Tono formal y negación directa, requiere ajuste",
        },
        "version_corregida_texto": "Hola, tu línea de crédito ya está disponible. Ingresa a la App Mibanco para conocer tus opciones.",
        "indice_cumplimiento": 58,
        "hard_stop": False,
        "ruta": "revision_a_fondo",
        "estado": "pendiente",
    },
    {
        "fecha_creacion": datetime.fromisoformat("2026-06-25T10:30:00"),
        "area_solicitante": "Negocios",
        "nombre_solicitante": "Carlos Ruiz",
        "canal": "whatsapp",
        "campos": {
            "asunto": "",
            "saludo": "Hola",
            "cuerpo": "Oferta garantizada: línea de crédito al 0% de interés, última oportunidad antes que termine la promoción.",
            "cta": "Solicítala ya",
        },
        "checks_duros": {
            "largo_ok": True,
            "remitente_ok": True,
            "palabras_prohibidas": ["Garantizado", "Última oportunidad"],
            "campos_obligatorios_ok": True,
            "tono_cercano_ok": True,
        },
        "resultado_cx": {
            "claridad_score": 70,
            "simplicidad_score": 75,
            "canal_score": 80,
            "cta_score": 40,
            "fragmento_que_falla": "Oferta garantizada... última oportunidad",
            "observaciones_cx": "Urgencia manipuladora detectada",
        },
        "resultado_marca": {
            "cercania_score": 50,
            "riesgo_score": 92,
            "version_corregida": "Conoce tu línea de crédito disponible en la App Mibanco y revisa las condiciones que aplican.",
            "es_reclamo_crisis_oferta": True,
            "observaciones_marca": "Promesa excesiva y urgencia manipuladora, requiere revisión profunda",
        },
        "version_corregida_texto": "Conoce tu línea de crédito disponible en la App Mibanco y revisa las condiciones que aplican.",
        "indice_cumplimiento": 45,
        "hard_stop": True,
        "ruta": "revision_profunda",
        "estado": "pendiente",
    },
]

if __name__ == "__main__":
    for i, caso in enumerate(CASOS_DEMO, start=1):
        # Campos planos para análisis (duplican lo que ya está anidado arriba)
        caso["claridad_score"] = caso["resultado_cx"]["claridad_score"]
        caso["simplicidad_score"] = caso["resultado_cx"]["simplicidad_score"]
        caso["canal_score"] = caso["resultado_cx"]["canal_score"]
        caso["cta_score"] = caso["resultado_cx"]["cta_score"]
        caso["cercania_score"] = caso["resultado_marca"]["cercania_score"]
        caso["riesgo_score"] = caso["resultado_marca"]["riesgo_score"]
        caso["tuvo_palabras_prohibidas"] = len(caso["checks_duros"]["palabras_prohibidas"]) > 0
        caso["cantidad_palabras_prohibidas"] = len(caso["checks_duros"]["palabras_prohibidas"])
        caso["anio"] = caso["fecha_creacion"].year
        caso["mes"] = caso["fecha_creacion"].month
        caso["dia_semana"] = DIAS_ES[caso["fecha_creacion"].strftime("%A")]

        doc_id = guardar_solicitud(caso)
        print(f"CASO {i} ({caso['ruta']}) guardado con id: {doc_id}")
