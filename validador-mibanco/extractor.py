import os
import json
from dotenv import load_dotenv
import anthropic

load_dotenv()
client = anthropic.Anthropic()

MODEL_EXTRACTOR = "claude-haiku-4-5-20251001"

SYSTEM_PROMPT_EXTRACTOR = """Eres un asistente que separa un texto de
comunicación en sus partes estructuradas. Recibes un texto libre (puede
ser un correo, mensaje, o copy pegado tal cual) y debes identificar:

- canal: tu mejor estimación entre sms, email, whatsapp, push (si no es
  obvio, usa "email" por default)
- asunto: el título o asunto si existe, vacío si no aplica
- saludo: la línea de saludo inicial (ej. "Hola, {NOMBRE}"), vacío si no hay
- cuerpo: el contenido principal del mensaje, sin el saludo ni el CTA
- cta: el llamado a la acción final, vacío si no hay uno claro

Si el texto incluye placeholders entre llaves como {NOMBRE}, conserva
exactamente como están, no los reemplaces.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes ni
después, sin bloques de código markdown. Formato exacto:
{"canal": "...", "asunto": "...", "saludo": "...", "cuerpo": "...", "cta": "..."}"""


def extraer_campos(texto_libre: str) -> dict:
    try:
        response = client.messages.create(
            model=MODEL_EXTRACTOR,
            max_tokens=600,
            temperature=0.1,
            system=[{
                "type": "text",
                "text": SYSTEM_PROMPT_EXTRACTOR,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{"role": "user", "content": texto_libre}],
        )
        texto_limpio = response.content[0].text.replace("```json", "").replace("```", "").strip()
        resultado = json.loads(texto_limpio)
        resultado["uso_tokens"] = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cache_read_input_tokens": getattr(response.usage, "cache_read_input_tokens", 0) or 0,
            "cache_creation_input_tokens": getattr(response.usage, "cache_creation_input_tokens", 0) or 0,
        }
        return resultado
    except Exception as e:
        return {
            "canal": "email",
            "asunto": "",
            "saludo": "",
            "cuerpo": "",
            "cta": "",
            "error": "Servicio de extracción no disponible, completa los campos manualmente."
        }
