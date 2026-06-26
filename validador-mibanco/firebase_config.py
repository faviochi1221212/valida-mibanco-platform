# Configuración y conexión con Firebase (credenciales y cliente de base de datos)
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

cred = credentials.Certificate("credenciales_firebase.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

@firestore.transactional
def _incrementar_contador(transaction, contador_ref):
    snapshot = contador_ref.get(transaction=transaction)
    actual = snapshot.get("valor") if snapshot.exists else 0
    nuevo = actual + 1
    transaction.set(contador_ref, {"valor": nuevo})
    return nuevo

def obtener_siguiente_numero_solicitud() -> str:
    contador_ref = db.collection("contadores").document("solicitudes")
    numero = _incrementar_contador(db.transaction(), contador_ref)
    return f"REQ-{numero:03d}"

def guardar_solicitud(data: dict) -> str:
    data["numero_solicitud"] = obtener_siguiente_numero_solicitud()
    data["historial"] = [{"estado": "creada", "ts": datetime.now().isoformat(), "nota": "Solicitud creada"}]
    doc_ref = db.collection("solicitudes").document()
    doc_ref.set(data)
    return doc_ref.id

def actualizar_estado(doc_id: str, nuevo_estado: str, aprobado_por: str = None, motivo: str = None):
    update = {"estado": nuevo_estado}
    if aprobado_por:
        update["aprobado_por"] = aprobado_por
    if motivo:
        update["motivo_escalamiento"] = motivo
    if nuevo_estado in ("aprobada", "aprobado"):
        update["fecha_aprobacion"] = firestore.SERVER_TIMESTAMP

    entrada = {"estado": nuevo_estado, "ts": datetime.now().isoformat()}
    if aprobado_por:
        entrada["analista"] = aprobado_por
    if motivo:
        entrada["nota"] = motivo
    update["historial"] = firestore.ArrayUnion([entrada])

    db.collection("solicitudes").document(doc_id).update(update)

def guardar_ajuste_manual(doc_id: str, texto: str):
    entrada = {"estado": "requiere_ajustes", "ts": datetime.now().isoformat(), "nota": "Ajuste manual guardado"}
    db.collection("solicitudes").document(doc_id).update({
        "version_corregida_texto": texto,
        "estado": "requiere_ajustes",
        "historial": firestore.ArrayUnion([entrada]),
    })

def actualizar_version_corregida(doc_id: str, texto: str, uso_tokens: dict = None):
    update = {"version_corregida_texto": texto}
    if uso_tokens:
        update["uso_tokens_correccion"] = uso_tokens
    db.collection("solicitudes").document(doc_id).update(update)

def obtener_solicitud(doc_id: str) -> dict:
    doc = db.collection("solicitudes").document(doc_id).get()
    return {**doc.to_dict(), "id": doc.id} if doc.exists else None

def obtener_todas() -> list:
    docs = db.collection("solicitudes").order_by(
        "fecha_creacion", direction=firestore.Query.DESCENDING
    ).stream()
    return [{**doc.to_dict(), "id": doc.id} for doc in docs]
