from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import bcrypt
import jwt
import qrcode
import openpyxl
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.utils import ImageReader

# ---------------------------------------------------------------- DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------- Models
PyObjectId = Annotated[str, BeforeValidator(str)]


class Record(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    kebun: str = ""
    afdeling: str = ""
    blok: str = ""
    code_lsu: str = ""
    koord_x: float = 0
    koord_y: float = 0
    id_actual: str = ""
    created_at: Optional[str] = None


class RecordInput(BaseModel):
    kebun: str
    afdeling: str
    blok: str
    code_lsu: str
    koord_x: float
    koord_y: float


class ImportRow(BaseModel):
    kebun: str = ""
    afdeling: str = ""
    blok: str = ""
    code_lsu: str = ""
    koord_x: float = 0
    koord_y: float = 0


class ImportConfirm(BaseModel):
    rows: List[ImportRow]


class IdList(BaseModel):
    ids: List[str] = []


class UserRegister(BaseModel):
    email: str
    password: str
    name: str = "User"


class UserLogin(BaseModel):
    email: str
    password: str


# ---------------------------------------------------------------- Auth utils
JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True,
                        secure=True, samesite="none", max_age=43200, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi berakhir, silakan login kembali")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


# ---------------------------------------------------------------- QR helpers
def fmt_num(v) -> str:
    """Format koordinat memakai koma sebagai pemisah desimal (format Indonesia)."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return str(v or "")
    if f == int(f):
        return str(int(f))
    return repr(f).replace(".", ",")


def build_id_actual(r: dict) -> str:
    """Id Actual = gabungan Kebun + Afdeling + Blok + Code LSU + Koord_X + Koord_Y (tanpa pemisah)."""
    return (f"{r.get('kebun','')}{r.get('afdeling','')}{r.get('blok','')}{r.get('code_lsu','')}"
            f"{fmt_num(r.get('koord_x'))}{fmt_num(r.get('koord_y'))}")


def build_payload(r: dict) -> str:
    """Isi QR = sama persis dengan Id Actual (nilai tergabung tanpa label/pemisah)."""
    return build_id_actual(r)


def make_qr_image(payload: str):
    qr = qrcode.QRCode(version=None, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(payload)
    qr.make(fit=True)
    return qr.make_image(fill_color="#0F291E", back_color="white").convert("RGB")


# ---------------------------------------------------------------- Auth routes
@api_router.post("/auth/register")
async def register(body: UserRegister, response: Response):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    doc = {"email": email, "password_hash": hash_password(body.password),
           "name": body.name, "role": "user", "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    token = create_access_token(str(res.inserted_id), email)
    set_auth_cookie(response, token)
    return {"id": str(res.inserted_id), "email": email, "name": body.name, "role": "user"}


@api_router.post("/auth/login")
async def login(body: UserLogin, response: Response):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")
    token = create_access_token(str(user["_id"]), email)
    set_auth_cookie(response, token)
    return {"id": str(user["_id"]), "email": email, "name": user.get("name"), "role": user.get("role")}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["_id"], "email": user["email"], "name": user.get("name"), "role": user.get("role")}


# ---------------------------------------------------------------- Records
async def next_id_actual() -> int:
    doc = await db.counters.find_one_and_update(
        {"_id": "id_actual"}, {"$inc": {"seq": 1}},
        upsert=True, return_document=True)
    return doc["seq"]


def serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc["id_actual"] = build_id_actual(doc)
    doc["payload"] = build_payload(doc)
    return doc


@api_router.get("/records")
async def list_records(user: dict = Depends(get_current_user)):
    docs = await db.records.find().sort("created_at", 1).to_list(5000)
    return [serialize(d) for d in docs]


@api_router.get("/records/stats")
async def stats(user: dict = Depends(get_current_user)):
    docs = await db.records.find().to_list(5000)
    kebun = set(); afd = set(); blok = set(); lsu = set()
    for d in docs:
        kebun.add(d.get("kebun", "")); afd.add((d.get("kebun",""), d.get("afdeling","")))
        blok.add(d.get("blok", "")); lsu.add(d.get("code_lsu", ""))
    return {"total_records": len(docs), "total_kebun": len([k for k in kebun if k]),
            "total_afdeling": len([a for a in afd if a[1]]),
            "total_blok": len([b for b in blok if b]),
            "total_lsu": len([l for l in lsu if l])}


@api_router.post("/records")
async def create_record(body: RecordInput, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.records.insert_one(doc)
    saved = await db.records.find_one({"_id": res.inserted_id})
    return serialize(saved)


@api_router.put("/records/{rid}")
async def update_record(rid: str, body: RecordInput, user: dict = Depends(get_current_user)):
    await db.records.update_one({"_id": ObjectId(rid)}, {"$set": body.model_dump()})
    saved = await db.records.find_one({"_id": ObjectId(rid)})
    if not saved:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    return serialize(saved)


@api_router.delete("/records/{rid}")
async def delete_record(rid: str, user: dict = Depends(get_current_user)):
    await db.records.delete_one({"_id": ObjectId(rid)})
    return {"ok": True}


@api_router.delete("/records")
async def delete_all(user: dict = Depends(get_current_user)):
    await db.records.delete_many({})
    return {"ok": True}


# ---------------------------------------------------------------- Excel
@api_router.get("/records/template")
async def download_template(user: dict = Depends(get_current_user)):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Template"
    headers = ["Kebun", "Afdeling", "Blok", "Code_LSU", "Koord_X", "Koord_Y"]
    ws.append(headers)
    ws.append(["Kebun A", "OA", "B01", "LSU-001", 102.345, -1.234])
    for i, _ in enumerate(headers, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = 16
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_kebun.xlsx"})


def _cell(v):
    return "" if v is None else str(v).strip()


def _num(v):
    try:
        return float(str(v).replace(",", ".").strip())
    except (ValueError, AttributeError):
        return 0.0


def parse_excel(content: bytes) -> List[dict]:
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    except Exception:
        raise HTTPException(status_code=400, detail="File Excel tidak valid")
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise HTTPException(status_code=400, detail="File kosong")
    header = [(_cell(h)).lower().replace(" ", "").replace("_", "") for h in rows[0]]

    def idx(*names):
        for n in names:
            if n in header:
                return header.index(n)
        return None

    ik, ia, ib, il, ix, iy = (idx("kebun"), idx("afdeling"), idx("blok"),
                              idx("codelsu", "lsu"), idx("koordx", "x"), idx("koordy", "y"))
    parsed = []
    for row in rows[1:]:
        if row is None or all(c is None or _cell(c) == "" for c in row):
            continue

        def g(i):
            return _cell(row[i]) if i is not None and i < len(row) else ""

        def gn(i):
            return _num(row[i]) if i is not None and i < len(row) else 0.0

        if not (g(ik) or g(ib) or g(il)):
            continue
        parsed.append({
            "kebun": g(ik), "afdeling": g(ia), "blok": g(ib), "code_lsu": g(il),
            "koord_x": gn(ix), "koord_y": gn(iy),
        })
    return parsed


@api_router.post("/records/import/preview")
async def import_preview(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    rows = parse_excel(content)
    return {"rows": rows, "count": len(rows)}


@api_router.post("/records/import/confirm")
async def import_confirm(body: ImportConfirm, user: dict = Depends(get_current_user)):
    inserted = 0
    for r in body.rows:
        doc = r.model_dump()
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.records.insert_one(doc)
        inserted += 1
    return {"inserted": inserted}


# ---------------------------------------------------------------- PDF
def _draw_qr(c, payload, x, y, size):
    img = make_qr_image(payload)
    bio = io.BytesIO(); img.save(bio, format="PNG"); bio.seek(0)
    c.drawImage(ImageReader(bio), x, y, size, size)


async def _fetch_docs(ids: Optional[List[str]]):
    if ids:
        oids = [ObjectId(i) for i in ids]
        docs = await db.records.find({"_id": {"$in": oids}}).sort("created_at", 1).to_list(5000)
    else:
        docs = await db.records.find().sort("created_at", 1).to_list(5000)
    for d in docs:
        d["id_actual"] = build_id_actual(d)
    return docs


def build_labels_pdf(docs) -> io.BytesIO:
    buf = io.BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=A4)
    pw, ph = A4
    cols, rows_pp = 3, 5
    margin = 12 * mm
    cell_w = (pw - 2 * margin) / cols
    cell_h = (ph - 2 * margin) / rows_pp
    per_page = cols * rows_pp
    for i, d in enumerate(docs):
        pos = i % per_page
        if i > 0 and pos == 0:
            c.showPage()
        col = pos % cols
        rowi = pos // cols
        cx = margin + col * cell_w
        cy = ph - margin - (rowi + 1) * cell_h
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.setLineWidth(0.5)
        c.roundRect(cx + 3, cy + 3, cell_w - 6, cell_h - 6, 4, stroke=1, fill=0)
        qr_size = min(cell_w, cell_h) - 26 * mm
        qr_x = cx + (cell_w - qr_size) / 2
        qr_y = cy + cell_h - qr_size - 8 * mm
        _draw_qr(c, build_payload(d), qr_x, qr_y, qr_size)
        c.setFillColor(colors.HexColor("#0F291E"))
        c.setFont("Helvetica-Bold", 8)
        line1 = f"{d.get('kebun','')} / {d.get('afdeling','')} / Blok {d.get('blok','')} / {d.get('code_lsu','')}"
        line2 = f"X: {d.get('koord_x','')}  Y: {d.get('koord_y','')}   ID: {d.get('id_actual','')}"
        c.drawCentredString(cx + cell_w / 2, cy + 14, line1[:52])
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#4B5563"))
        c.drawCentredString(cx + cell_w / 2, cy + 5, line2[:52])
    if not docs:
        c.setFont("Helvetica", 12)
        c.drawCentredString(pw / 2, ph / 2, "Tidak ada data")
    c.showPage(); c.save(); buf.seek(0)
    return buf


def build_table_pdf(docs) -> io.BytesIO:
    buf = io.BytesIO()
    c = pdf_canvas.Canvas(buf, pagesize=A4)
    pw, ph = A4
    margin = 14 * mm
    y = ph - margin
    c.setFillColor(colors.HexColor("#0F291E"))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(margin, y, "Laporan Data Kebun & Label QR")
    y -= 8 * mm
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#4B5563"))
    c.drawString(margin, y, f"Total {len(docs)} data  -  {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    y -= 8 * mm

    row_h = 30 * mm
    qr_size = 26 * mm
    for d in docs:
        if y - row_h < margin:
            c.showPage(); y = ph - margin
        c.setStrokeColor(colors.HexColor("#E2E8F0")); c.setLineWidth(0.5)
        c.roundRect(margin, y - row_h, pw - 2 * margin, row_h, 3, stroke=1, fill=0)
        _draw_qr(c, build_payload(d), margin + 4 * mm, y - qr_size - 2 * mm, qr_size)
        tx = margin + qr_size + 10 * mm
        c.setFillColor(colors.HexColor("#0F291E"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(tx, y - 8 * mm, f"ID Actual: {d.get('id_actual','')}")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#1B4D3E"))
        line1 = f"Kebun: {d.get('kebun','')}   Afdeling: {d.get('afdeling','')}   Blok: {d.get('blok','')}   Code LSU: {d.get('code_lsu','')}"
        line2 = f"Koord X: {d.get('koord_x','')}   Koord Y: {d.get('koord_y','')}"
        c.drawString(tx, y - 15 * mm, line1[:70])
        c.setFillColor(colors.HexColor("#4B5563"))
        c.drawString(tx, y - 21 * mm, line2[:70])
        y -= row_h + 3 * mm
    if not docs:
        c.setFont("Helvetica", 12)
        c.drawCentredString(pw / 2, ph / 2, "Tidak ada data")
    c.showPage(); c.save(); buf.seek(0)
    return buf


def _pdf_response(buf, filename):
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={filename}"})


@api_router.get("/records/export/labels")
async def export_labels(user: dict = Depends(get_current_user)):
    docs = await _fetch_docs(None)
    return _pdf_response(build_labels_pdf(docs), "label_qr_kebun.pdf")


@api_router.post("/records/export/labels")
async def export_labels_selected(body: IdList, user: dict = Depends(get_current_user)):
    docs = await _fetch_docs(body.ids)
    return _pdf_response(build_labels_pdf(docs), "label_qr_kebun.pdf")


@api_router.get("/records/export/table")
async def export_table(user: dict = Depends(get_current_user)):
    docs = await _fetch_docs(None)
    return _pdf_response(build_table_pdf(docs), "laporan_tabel_kebun.pdf")


@api_router.post("/records/export/table")
async def export_table_selected(body: IdList, user: dict = Depends(get_current_user)):
    docs = await _fetch_docs(body.ids)
    return _pdf_response(build_table_pdf(docs), "laporan_tabel_kebun.pdf")


def build_excel(docs) -> io.BytesIO:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Data Kebun"
    headers = ["Id Actual", "Kebun", "Afdeling", "Blok", "Code_LSU", "Koord_X", "Koord_Y"]
    ws.append(headers)
    for d in docs:
        ws.append([
            d.get("id_actual", ""), d.get("kebun", ""), d.get("afdeling", ""),
            d.get("blok", ""), d.get("code_lsu", ""),
            fmt_num(d.get("koord_x")), fmt_num(d.get("koord_y")),
        ])
    widths = [30, 16, 12, 12, 14, 16, 16]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    # header bold
    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return buf


def _excel_response(buf, filename):
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"})


@api_router.get("/records/export/excel")
async def export_excel(user: dict = Depends(get_current_user)):
    docs = await _fetch_docs(None)
    return _excel_response(build_excel(docs), "data_kebun.xlsx")


@api_router.post("/records/export/excel")
async def export_excel_selected(body: IdList, user: dict = Depends(get_current_user)):
    docs = await _fetch_docs(body.ids)
    return _excel_response(build_excel(docs), "data_kebun.xlsx")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@kebun.id").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Administrator", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()})
        logger.info("Admin seeded")
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_pw)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
