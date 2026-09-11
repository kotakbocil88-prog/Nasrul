import os
import io
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict, Annotated

import jwt
import bcrypt
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "qc-estate-audit"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Object storage helpers
# ---------------------------------------------------------------------------
storage_key: Optional[str] = None


def init_storage() -> str:
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid atau kedaluwarsa")


async def current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Belum login")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
    return user


def user_from_token_str(token: str) -> Optional[str]:
    """Return user_id from a raw token string (used for query-param auth on web downloads)."""
    try:
        payload = decode_token(token)
        return payload.get("sub")
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class Sample(BaseModel):
    jalur: Optional[int] = None
    titik: Optional[int] = None
    values: Dict[str, Any] = {}
    dates: Dict[str, Any] = {}
    keterangan: Dict[str, Any] = {}
    photos: Dict[str, str] = {}  # item_key -> storage_path


class InspectionCreate(BaseModel):
    form_type: str
    form_title: str
    header: Dict[str, Any] = {}
    samples: List[Sample] = []
    signature_pemeriksa: Optional[str] = None  # storage path
    signature_mengetahui: Optional[str] = None  # storage path


def public_user(u: dict) -> UserResponse:
    return UserResponse(id=str(u["_id"]), email=u["email"], name=u.get("name", ""))


def serialize_inspection(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "form_type": doc.get("form_type"),
        "form_title": doc.get("form_title"),
        "header": doc.get("header", {}),
        "samples": doc.get("samples", []),
        "signature_pemeriksa": doc.get("signature_pemeriksa"),
        "signature_mengetahui": doc.get("signature_mengetahui"),
        "user_email": doc.get("user_email"),
        "user_name": doc.get("user_name"),
        "created_at": doc.get("created_at"),
    }


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), email)
    return AuthResponse(access_token=token, user=public_user(doc))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(str(user["_id"]), user["email"])
    return AuthResponse(access_token=token, user=public_user(user))


@api_router.get("/auth/me", response_model=UserResponse)
async def me(user: Annotated[dict, Depends(current_user)]):
    return public_user(user)


# ---------------------------------------------------------------------------
# Photo upload / serve
# ---------------------------------------------------------------------------
@api_router.post("/upload")
async def upload(user: Annotated[dict, Depends(current_user)], file: UploadFile = File(...)):
    data = await file.read()
    ext = "jpg"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    path = f"{APP_NAME}/uploads/{str(user['_id'])}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        await run_in_threadpool(put_object, path, data, content_type)
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        if status == 402:
            raise HTTPException(status_code=402, detail="Kuota penyimpanan habis")
        raise HTTPException(status_code=502, detail="Gagal mengunggah file")
    return {"path": path}


class Base64Upload(BaseModel):
    image: str  # data uri or raw base64


@api_router.post("/upload-base64")
async def upload_base64(body: Base64Upload, user: Annotated[dict, Depends(current_user)]):
    import base64 as _b64

    raw = body.image
    if "," in raw and raw.strip().lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    try:
        data = _b64.b64decode(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Data gambar tidak valid")
    path = f"{APP_NAME}/uploads/{str(user['_id'])}/{uuid.uuid4()}.png"
    try:
        await run_in_threadpool(put_object, path, data, "image/png")
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        if status == 402:
            raise HTTPException(status_code=402, detail="Kuota penyimpanan habis")
        raise HTTPException(status_code=502, detail="Gagal mengunggah file")
    return {"path": path}


@api_router.get("/files/{path:path}")
async def serve_file(path: str, token: Optional[str] = Query(None)):
    # Auth: header handled by dependency isn't used here so web <img> can pass ?token=
    if not token or not user_from_token_str(token):
        raise HTTPException(status_code=401, detail="Tidak diizinkan")
    try:
        content, content_type = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    return StreamingResponse(io.BytesIO(content), media_type=content_type)


# ---------------------------------------------------------------------------
# Inspections
# ---------------------------------------------------------------------------
@api_router.post("/inspections")
async def create_inspection(body: InspectionCreate, user: Annotated[dict, Depends(current_user)]):
    doc = {
        "user_id": str(user["_id"]),
        "user_email": user["email"],
        "user_name": user.get("name", ""),
        "form_type": body.form_type,
        "form_title": body.form_title,
        "header": body.header,
        "samples": [s.model_dump() for s in body.samples],
        "signature_pemeriksa": body.signature_pemeriksa,
        "signature_mengetahui": body.signature_mengetahui,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None,
    }
    result = await db.inspections.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_inspection(doc)


@api_router.get("/inspections")
async def list_inspections(
    user: Annotated[dict, Depends(current_user)],
    form_type: Optional[str] = Query(None),
):
    query: Dict[str, Any] = {"user_id": str(user["_id"]), "deleted_at": None}
    if form_type:
        query["form_type"] = form_type
    docs = await db.inspections.find(query).sort("created_at", -1).to_list(500)
    return [serialize_inspection(d) for d in docs]


async def _get_owned_inspection(inspection_id: str, user: dict) -> dict:
    if not ObjectId.is_valid(inspection_id):
        raise HTTPException(status_code=404, detail="Inspeksi tidak ditemukan")
    doc = await db.inspections.find_one({"_id": ObjectId(inspection_id), "user_id": str(user["_id"]), "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Inspeksi tidak ditemukan")
    return doc


@api_router.get("/inspections/{inspection_id}")
async def get_inspection(inspection_id: str, user: Annotated[dict, Depends(current_user)]):
    doc = await _get_owned_inspection(inspection_id, user)
    return serialize_inspection(doc)


@api_router.delete("/inspections/{inspection_id}")
async def delete_inspection(inspection_id: str, user: Annotated[dict, Depends(current_user)]):
    doc = await _get_owned_inspection(inspection_id, user)
    await db.inspections.update_one(
        {"_id": doc["_id"]}, {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Export: Excel + PDF
# ---------------------------------------------------------------------------
def _fetch_image_bytes(path: Optional[str]) -> Optional[bytes]:
    if not path:
        return None
    try:
        content, _ = get_object(path)
        return content
    except Exception:
        return None


def _flatten_items(doc: dict) -> List[dict]:
    """Build item column keys present across samples."""
    keys: List[str] = []
    for s in doc.get("samples", []):
        for k in s.get("values", {}).keys():
            if k not in keys:
                keys.append(k)
    return keys


def build_excel(doc: dict) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = "Inspeksi"

    green = PatternFill("solid", fgColor="15803D")
    white_bold = Font(color="FFFFFF", bold=True)
    bold = Font(bold=True)
    thin = Border(*[Side(style="thin", color="D1D5DB")] * 4)

    row = 1
    ws.cell(row=row, column=1, value=doc.get("form_title", "")).font = Font(bold=True, size=14)
    row += 2

    ws.cell(row=row, column=1, value="DATA PEMERIKSAAN").font = white_bold
    ws.cell(row=row, column=1).fill = green
    row += 1
    for k, v in doc.get("header", {}).items():
        ws.cell(row=row, column=1, value=k).font = bold
        ws.cell(row=row, column=2, value=str(v))
        row += 1
    ws.cell(row=row, column=1, value="Pemeriksa").font = bold
    ws.cell(row=row, column=2, value=doc.get("user_name", ""))
    row += 2

    item_keys = _flatten_items(doc)
    headers = ["Jalur Sampel", "Titik Sampel"] + item_keys + ["Keterangan"]
    for col, h in enumerate(headers, start=1):
        c = ws.cell(row=row, column=col, value=h)
        c.font = white_bold
        c.fill = green
        c.alignment = Alignment(horizontal="center", wrap_text=True)
        c.border = thin
    row += 1

    for s in doc.get("samples", []):
        vals = [s.get("jalur"), s.get("titik")]
        for k in item_keys:
            vals.append(s.get("values", {}).get(k, ""))
        ket = "; ".join(f"{k}: {v}" for k, v in s.get("keterangan", {}).items() if v)
        vals.append(ket)
        for col, v in enumerate(vals, start=1):
            c = ws.cell(row=row, column=col, value=v if v is not None else "")
            c.border = thin
        row += 1

    for col in range(1, len(headers) + 1):
        ws.column_dimensions[chr(64 + col) if col <= 26 else "AA"].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()


def build_pdf(doc: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage,
    )

    buf = io.BytesIO()
    pdf = SimpleDocTemplate(buf, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                            topMargin=15 * mm, bottomMargin=15 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Title"], fontSize=15, textColor=colors.HexColor("#111827"))
    h_style = ParagraphStyle("h", parent=styles["Heading4"], textColor=colors.white)
    small = ParagraphStyle("s", parent=styles["Normal"], fontSize=8)

    green = colors.HexColor("#15803D")
    story: List[Any] = []
    story.append(Paragraph(doc.get("form_title", ""), title_style))
    story.append(Spacer(1, 8))

    header = doc.get("header", {})
    hdr_rows = [[k, str(v)] for k, v in header.items()]
    hdr_rows.append(["Pemeriksa", doc.get("user_name", "")])
    if hdr_rows:
        t = Table(hdr_rows, colWidths=[55 * mm, 110 * mm])
        t.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t)
    story.append(Spacer(1, 12))

    item_keys = _flatten_items(doc)
    data = [["Jalur", "Titik"] + item_keys]
    for s in doc.get("samples", []):
        rowv = [str(s.get("jalur", "")), str(s.get("titik", ""))]
        for k in item_keys:
            rowv.append(str(s.get("values", {}).get(k, "")))
        data.append([Paragraph(str(c), small) for c in rowv])

    if len(data) > 1:
        story.append(Paragraph("HASIL PEMERIKSAAN SAMPEL", ParagraphStyle("hh", parent=styles["Heading4"])))
        story.append(Spacer(1, 4))
        st = Table(data, repeatRows=1)
        st.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("BACKGROUND", (0, 0), (-1, 0), green),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(st)

    story.append(Spacer(1, 20))

    # Signatures
    sig_cells: List[Any] = []
    for label, key in [("Pemeriksa", "signature_pemeriksa"), ("Mengetahui", "signature_mengetahui")]:
        img_bytes = _fetch_image_bytes(doc.get(key))
        cell = [Paragraph(label, small)]
        if img_bytes:
            try:
                cell.append(RLImage(io.BytesIO(img_bytes), width=55 * mm, height=28 * mm))
            except Exception:
                cell.append(Paragraph("(tanda tangan)", small))
        else:
            cell.append(Spacer(1, 28 * mm))
        sig_cells.append(cell)

    sig_table = Table([[sig_cells[0], sig_cells[1]]], colWidths=[82 * mm, 82 * mm])
    sig_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_table)

    pdf.build(story)
    buf.seek(0)
    return buf.read()


@api_router.get("/inspections/{inspection_id}/export")
async def export_inspection(
    inspection_id: str,
    fmt: str = Query("pdf"),
    token: Optional[str] = Query(None),
):
    uid = user_from_token_str(token) if token else None
    if not uid or not ObjectId.is_valid(uid):
        raise HTTPException(status_code=401, detail="Tidak diizinkan")
    if not ObjectId.is_valid(inspection_id):
        raise HTTPException(status_code=404, detail="Inspeksi tidak ditemukan")
    doc = await db.inspections.find_one(
        {"_id": ObjectId(inspection_id), "user_id": uid, "deleted_at": None}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Inspeksi tidak ditemukan")

    safe_title = (doc.get("form_title") or "inspeksi").replace(" ", "_")
    if fmt == "excel":
        content = await run_in_threadpool(build_excel, doc)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.xlsx"'},
        )
    else:
        content = await run_in_threadpool(build_pdf, doc)
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
        )


@api_router.get("/")
async def root():
    return {"message": "QC Estate Audit API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning("index create failed: %s", e)
    try:
        await run_in_threadpool(init_storage)
        logger.info("storage initialized")
    except Exception as e:
        logger.warning("storage init failed at startup: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
