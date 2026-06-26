# API REST mínima para exponer y crear solicitudes guardadas en Firebase
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore
from pydantic import BaseModel
from fastapi import HTTPException
from typing import Optional
from firebase_config import guardar_solicitud, obtener_todas, obtener_solicitud, actualizar_version_corregida, actualizar_estado, guardar_ajuste_manual
from orquestador import procesar_solicitud, construir_documento_firebase, generar_version_corregida_para_solicitud
from extractor import extraer_campos

app = FastAPI(title="Validador Mibanco API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextoLibreInput(BaseModel):
    texto: str

class GenerarVersionCorregidaIn(BaseModel):
    solicitud_id: str

class ActualizarEstadoIn(BaseModel):
    nuevo_estado: str
    aprobado_por: Optional[str] = None
    motivo: Optional[str] = None

class AjusteManualIn(BaseModel):
    texto: str

class AdjuntoIn(BaseModel):
    nombre: str
    tipo: str = ""
    tamano: int = 0

class SolicitudIn(BaseModel):
    canal: str
    area_solicitante: str = ""
    nombre_solicitante: str = ""
    asunto: str = ""
    saludo: str = ""
    cuerpo: str = ""
    cta: str = ""
    remitente: str = ""
    toca_dac: bool = False
    es_reclamo: bool = False
    tiene_adjuntos: bool = False
    adjuntos: list = []

@app.get("/solicitudes")
def listar_solicitudes():
    return obtener_todas()

@app.post("/extraer")
def extraer(input: TextoLibreInput):
    return extraer_campos(input.texto)

@app.post("/validar")
def validar_solicitud(solicitud: SolicitudIn):
    campos = {
        "asunto": solicitud.asunto,
        "saludo": solicitud.saludo,
        "cuerpo": solicitud.cuerpo,
        "cta": solicitud.cta,
    }

    resultado = procesar_solicitud(
        solicitud.canal, campos, solicitud.remitente,
        solicitud.toca_dac, solicitud.es_reclamo, solicitud.nombre_solicitante,
        solicitud.tiene_adjuntos,
    )

    documento = construir_documento_firebase(
        resultado, solicitud.canal, campos,
        solicitud.area_solicitante, solicitud.nombre_solicitante,
        [a if isinstance(a, dict) else a.model_dump() for a in solicitud.adjuntos],
    )
    documento["fecha_creacion"] = firestore.SERVER_TIMESTAMP
    doc_id = guardar_solicitud(documento)

    return {**resultado, "id": doc_id}

@app.post("/generar-version-corregida")
def generar_version_corregida_endpoint(input: GenerarVersionCorregidaIn):
    solicitud = obtener_solicitud(input.solicitud_id)
    if solicitud is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    texto, uso_tokens = generar_version_corregida_para_solicitud(
        solicitud["canal"], solicitud["campos"], solicitud.get("hallazgos", []),
    )
    actualizar_version_corregida(input.solicitud_id, texto, uso_tokens)
    return {"version_corregida_texto": texto, "uso_tokens": uso_tokens}

@app.post("/solicitudes/{solicitud_id}/estado")
def actualizar_estado_endpoint(solicitud_id: str, input: ActualizarEstadoIn):
    actualizar_estado(solicitud_id, input.nuevo_estado, input.aprobado_por, input.motivo)
    return {"ok": True}

@app.post("/solicitudes/{solicitud_id}/ajuste")
def guardar_ajuste_endpoint(solicitud_id: str, input: AjusteManualIn):
    guardar_ajuste_manual(solicitud_id, input.texto)
    return {"ok": True}
