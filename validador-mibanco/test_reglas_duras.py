from reglas_duras import ejecutar_checks_duros, detectar_palabras_prohibidas, detectar_tono_formal, validar_largo_sms

def mostrar(nombre, resultado):
    print(f"\n--- {nombre} ---")
    print(resultado)

print("=" * 60)
print("CASO 1: SMS largo + palabras prohibidas con conjugaciones")
print("=" * 60)
campos = {
    "asunto": "",
    "saludo": "Estimado cliente",
    "cuerpo": "Tenemos una oferta garantizada para usted, no hay rebajas de interés pero le ofrecemos una línea de crédito especial que debe solicitar a tiempo antes de que termine la promoción",
    "cta": "Llámenos"
}
mostrar("Checks duros", ejecutar_checks_duros("sms", campos, "Mibanco Oficial"))

print("\n" + "=" * 60)
print("CASO 2: SMS bien escrito, debería pasar todo en True")
print("=" * 60)
campos2 = {
    "asunto": "",
    "saludo": "Hola",
    "cuerpo": "Tu línea de crédito ya está lista. Ingresa a la App Mibanco y revisa tus opciones.",
    "cta": "Ingresa a la App"
}
mostrar("Checks duros", ejecutar_checks_duros("sms", campos2, "Mibanco Oficial"))

print("\n" + "=" * 60)
print("CASO 3: remitente incorrecto en SMS")
print("=" * 60)
mostrar("Checks duros", ejecutar_checks_duros("sms", campos2, "Mibanco SAC"))

print("\n" + "=" * 60)
print("CASO 4: email sin asesor_negocios (campo obligatorio faltante)")
print("=" * 60)
campos_email = {"saludo": "Hola", "cuerpo": "Texto normal", "cta": "Ver más"}
mostrar("Checks duros", ejecutar_checks_duros("email", campos_email, ""))

print("\n" + "=" * 60)
print("CASO 5: push sin cuerpo (campo obligatorio faltante)")
print("=" * 60)
campos_push = {"asunto": "Aviso importante", "cuerpo": "", "cta": ""}
mostrar("Checks duros", ejecutar_checks_duros("push", campos_push, ""))

print("\n" + "=" * 60)
print("CASO 6: prueba puntual de detectar_palabras_prohibidas con variantes")
print("=" * 60)
variantes = [
    "Este beneficio no es para ti",       # coincide exacto -> debería detectarse
    "Garantizado al 100%",                 # contiene "Garantizado" exacto -> debería detectarse
    "te lo garantizamos",                  # variante verbal -> NO debería detectarse (limitación conocida)
    "Solicítalo a tiempo y listo",          # coincide exacto -> debería detectarse
    "debes solicitarlo a tiempo",           # variante -> NO debería detectarse (limitación conocida)
]
for texto in variantes:
    print(f"{texto!r:55} -> {detectar_palabras_prohibidas(texto)}")

print("\n" + "=" * 60)
print("CASO 7: prueba puntual de validar_largo_sms (límite 160)")
print("=" * 60)
print("159 chars:", validar_largo_sms("a" * 159))
print("160 chars:", validar_largo_sms("a" * 160))
print("161 chars:", validar_largo_sms("a" * 161))
