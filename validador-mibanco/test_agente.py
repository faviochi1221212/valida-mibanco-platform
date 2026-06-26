from reglas_duras import ejecutar_checks_duros
from agente_claude import validar_pieza_con_claude
from indice import calcular_indice, determinar_ruta
from orquestador import procesar_solicitud

print("=" * 50)
print("CASO 1: SMS con problema de largo y palabra prohibida")
print("=" * 50)

canal = "sms"
campos = {
    "asunto": "",
    "saludo": "Estimado cliente",
    "cuerpo": "Tenemos una oferta garantizada para usted, no hay rebajas de interés pero le ofrecemos una línea de crédito especial que debe solicitar a tiempo antes de que termine la promoción",
    "cta": "Llámenos"
}
remitente = "Mibanco Oficial"

checks_duros = ejecutar_checks_duros(canal, campos, remitente)
print("\n--- Checks duros ---")
print(checks_duros)

checks_finos = validar_pieza_con_claude(canal, campos)
print("\n--- Checks finos (Gemini) ---")
print(checks_finos)

indice = calcular_indice(checks_duros, checks_finos)
hard_stop = checks_finos.get("es_reclamo_crisis_oferta", False)
ruta = determinar_ruta(hard_stop, indice)

print(f"\n--- Resultado ---")
print(f"Índice: {indice}%")
print(f"Hard-stop: {hard_stop}")
print(f"Ruta: {ruta}")


print("\n" + "=" * 50)
print("CASO 2: Mensaje bien escrito, debería pasar bien")
print("=" * 50)

canal = "sms"
campos2 = {
    "asunto": "",
    "saludo": "Hola",
    "cuerpo": "Tu línea de crédito ya está lista. Ingresa a la App Mibanco y revisa tus opciones.",
    "cta": "Ingresa a la App"
}

checks_duros2 = ejecutar_checks_duros(canal, campos2, remitente)
print("\n--- Checks duros ---")
print(checks_duros2)

checks_finos2 = validar_pieza_con_claude(canal, campos2)
print("\n--- Checks finos (Gemini) ---")
print(checks_finos2)

indice2 = calcular_indice(checks_duros2, checks_finos2)
hard_stop2 = checks_finos2.get("es_reclamo_crisis_oferta", False)
ruta2 = determinar_ruta(hard_stop2, indice2)

print(f"\n--- Resultado ---")
print(f"Índice: {indice2}%")
print(f"Hard-stop: {hard_stop2}")
print(f"Ruta: {ruta2}")


print("\n" + "=" * 50)
print("CASO 3: Email real de Mibanco con placeholder {NOMBRE}, via orquestador")
print("=" * 50)

canal3 = "email"
campos3 = {
    "asunto": "Seguimos mejorando tu experiencia digital",
    "saludo": "Hola, {NOMBRE}",
    "cuerpo": "En Mibanco seguimos evolucionando para brindarte una experiencia digital más simple, segura y eficiente. A partir del 15 de mayo la App Mibanco será nuestro único canal digital.",
    "cta": "Contáctanos al (01) 319-9999"
}

resultado3 = procesar_solicitud(canal3, campos3, remitente="Mibanco Oficial")

print("\n--- Checks duros ---")
print(resultado3["checks_duros"])

print("\n--- Resultado Agente CX ---")
print(resultado3["resultado_cx"])

print("\n--- Resultado Agente Marca ---")
print(resultado3["resultado_marca"])

print(f"\n--- Resultado ---")
print(f"Índice: {resultado3['indice_cumplimiento']}%")
print(f"Hard-stop: {resultado3['hard_stop']}")
print(f"Ruta: {resultado3['ruta']}")

version_corregida = resultado3["version_corregida"]
version_corregida_texto = resultado3["version_corregida_texto"]

print("\n--- Verificación del manejo de {NOMBRE} ---")
print(f"¿'{{NOMBRE}}' mencionado como problema en Agente CX (fragmento_que_falla)?: "
      f"{resultado3['resultado_cx'].get('fragmento_que_falla') and '{NOMBRE}' in str(resultado3['resultado_cx'].get('fragmento_que_falla'))}")
print(f"version_corregida (crudo, str u objeto): {version_corregida}")
print(f"version_corregida_texto (siempre string): {version_corregida_texto}")
print(f"¿'{{NOMBRE}}' se conserva tal cual en version_corregida_texto?: {'{NOMBRE}' in version_corregida_texto}")
