# Agente único original (CX+Marca juntos) — legacy, ya no usado por el
# orquestador ni la app. Se mantiene solo porque test_agente.py Casos 1-2
# todavía lo llaman.
import os
import json
from dotenv import load_dotenv
import anthropic

load_dotenv()
client = anthropic.Anthropic()

MODEL_CLAUDE_LEGACY = "claude-sonnet-4-6"

with open("data/vocabulario_mibanco.json", encoding="utf-8") as f:
    VOCAB = json.load(f)

SYSTEM_PROMPT = f"""Eres un validador experto de comunicaciones de Mibanco.

PRINCIPIOS (de Mibanco):
1. Lenguaje simple y cercano
2. Mensaje claro, se entiende rápido
3. Sin riesgos, no parece fraude ni promete de más
4. Seguro y transparente, sin datos sensibles
5. Fácil de actuar, CTA claro

VOCABULARIO PERMITIDO (úsalo de referencia para el tono):
{json.dumps(VOCAB['permitido'], ensure_ascii=False)}

VOCABULARIO PROHIBIDO (nunca debe aparecer en la versión corregida):
{json.dumps(VOCAB['prohibido_negacion'] + VOCAB['prohibido_formal'] + VOCAB['prohibido_riesgo'], ensure_ascii=False)}

CRITERIO PARA "es_reclamo_crisis_oferta" (dispara revisión profunda obligatoria):
Márcalo como true SOLO si se cumple alguna de estas dos condiciones:
1. La pieza responde a un reclamo, queja o situación de crisis de un cliente (ej. fraude reportado, reclamo no resuelto, cliente molesto).
2. La pieza es una oferta comercial con promesa o riesgo excesivo: garantías falsas, urgencia manipuladora ("última oportunidad", "actúa ahora"), o promete resultados que no se pueden asegurar.
NO lo marques como true solo porque la pieza menciona un producto bancario (línea de crédito, tarjeta, préstamo) o invita al cliente a revisar sus opciones. Anunciar que un producto está disponible y pedir que lo revise es comunicación normal, no es una oferta de riesgo.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes ni
después, sin bloques de código markdown. Formato exacto:
{{
  "cercania_score": 0-100,
  "claridad_score": 0-100,
  "cta_score": 0-100,
  "fragmento_que_falla": "cita textual exacta del problema, o null si no hay",
  "version_corregida": "versión mejorada, cálida, usando el vocabulario permitido",
  "es_reclamo_crisis_oferta": true/false
}}"""


def validar_pieza_con_claude(canal: str, campos: dict) -> dict:
    mensaje = f"Canal: {canal}\nAsunto: {campos.get('asunto','')}\nSaludo: {campos.get('saludo','')}\nCuerpo: {campos.get('cuerpo','')}\nCTA: {campos.get('cta','')}"

    response = client.messages.create(
        model=MODEL_CLAUDE_LEGACY,
        max_tokens=800,
        temperature=0.2,
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": mensaje}],
    )

    texto_limpio = response.content[0].text.replace("```json", "").replace("```", "").strip()
    return json.loads(texto_limpio)
