from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import base64
import logging
import secrets
import bcrypt
import jwt
import qrcode
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
)

# ---------------- DB ----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------------- Constants ----------------
JWT_ALGORITHM = "HS256"
JWT_ACCESS_MINUTES = 60 * 12  # 12 hours
ROLES = ("admin", "kepala", "pegawai")

LEAVE_TYPES = (
    "cuti_tahunan",
    "cuti_bersama",
    "cuti_sakit",
    "cuti_melahirkan",
    "cuti_alasan_penting",
    "cuti_luar_tanggungan",
)
# cuti_besar tracked as balance only (rarely used as type but exists)
BALANCE_TYPES = (
    "cuti_tahunan",
    "cuti_besar",
    "cuti_sakit",
    "cuti_melahirkan",
    "cuti_alasan_penting",
    "cuti_luar_tanggungan",
)

LEAVE_TYPE_LABELS = {
    "cuti_tahunan": "Cuti Tahunan",
    "cuti_bersama": "Cuti Bersama",
    "cuti_sakit": "Cuti Sakit",
    "cuti_melahirkan": "Cuti Melahirkan",
    "cuti_alasan_penting": "Cuti Karena Alasan Penting",
    "cuti_luar_tanggungan": "Cuti di Luar Tanggungan Negara",
    "cuti_besar": "Cuti Besar",
}

# ---------------- Auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User tidak ditemukan")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


def require_role(*roles: str):
    async def _checker(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak")
        return user
    return _checker


# ---------------- Models ----------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserBalances(BaseModel):
    cuti_tahunan: int = 12
    cuti_besar: int = 0
    cuti_sakit: int = 12
    cuti_melahirkan: int = 90
    cuti_alasan_penting: int = 30
    cuti_luar_tanggungan: int = 0


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    nik: str = ""
    is_asn: bool = False
    nip: str = ""  # if ASN, this is the NIP
    jabatan: str
    masa_kerja_tahun: int = 0
    masa_kerja_bulan: int = 0
    unit_kerja: str = "UPTD Puskesmas Bugangan"
    alamat: str = ""
    telepon: str = ""
    role: Literal["admin", "kepala", "pegawai"] = "pegawai"
    signature_base64: Optional[str] = None  # data URL or base64 PNG
    balances: Optional[UserBalances] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    nik: Optional[str] = None
    is_asn: Optional[bool] = None
    nip: Optional[str] = None
    jabatan: Optional[str] = None
    masa_kerja_tahun: Optional[int] = None
    masa_kerja_bulan: Optional[int] = None
    alamat: Optional[str] = None
    telepon: Optional[str] = None
    role: Optional[Literal["admin", "kepala", "pegawai"]] = None
    password: Optional[str] = None
    signature_base64: Optional[str] = None
    balances: Optional[UserBalances] = None


class LeaveRequestCreate(BaseModel):
    form_no: Optional[str] = None  # nomor surat manual; jika kosong/None akan di-generate otomatis
    jenis_cuti: Literal[
        "cuti_tahunan",
        "cuti_bersama",
        "cuti_sakit",
        "cuti_melahirkan",
        "cuti_alasan_penting",
        "cuti_luar_tanggungan",
    ]
    alasan: str
    tanggal_mulai: str  # ISO date
    tanggal_selesai: str
    alamat_selama_cuti: str
    telepon_selama_cuti: str


class DecideIn(BaseModel):
    decision: Literal["disetujui", "perubahan", "ditangguhkan", "tidak_disetujui"]
    pesan: Optional[str] = ""


# ---------------- App ----------------
app = FastAPI(title="Sistem Cuti UPTD Puskesmas Bugangan")
api = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.leave_requests.create_index("id", unique=True)
    await db.leave_requests.create_index("form_no", unique=True)
    await db.leave_requests.create_index("user_id")
    await db.leave_requests.create_index("status")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrator",
            "nik": "",
            "is_asn": False,
            "nip": "",
            "jabatan": "Administrator",
            "masa_kerja_tahun": 0,
            "masa_kerja_bulan": 0,
            "unit_kerja": "UPTD Puskesmas Bugangan",
            "alamat": "Jl. Musi Raya No. 22, Semarang",
            "telepon": "3546061",
            "role": "admin",
            "signature_base64": None,
            "balances": UserBalances().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        # Ensure password is in sync with .env
        if not verify_password(admin_password, existing_admin.get("password_hash", "")):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}},
            )

    # Seed example kepala & pegawai if not present (for first-time demo)
    if not await db.users.find_one({"email": "kepala@puskesmas-bugangan.go.id"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "kepala@puskesmas-bugangan.go.id",
            "password_hash": hash_password("kepala123"),
            "name": "dr. Sri Lestari",
            "nik": "",
            "is_asn": True,
            "nip": "19700101 200001 2 001",
            "jabatan": "Kepala UPTD Puskesmas Bugangan",
            "masa_kerja_tahun": 20,
            "masa_kerja_bulan": 3,
            "unit_kerja": "UPTD Puskesmas Bugangan",
            "alamat": "Jl. Musi Raya No. 22, Semarang",
            "telepon": "081234567890",
            "role": "kepala",
            "signature_base64": None,
            "balances": UserBalances().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if not await db.users.find_one({"email": "tedy@puskesmas-bugangan.go.id"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "tedy@puskesmas-bugangan.go.id",
            "password_hash": hash_password("pegawai123"),
            "name": "Tedy Suryadi",
            "nik": "3374011234567890",
            "is_asn": False,
            "nip": "",
            "jabatan": "Pengemudi",
            "masa_kerja_tahun": 7,
            "masa_kerja_bulan": 9,
            "unit_kerja": "UPTD Puskesmas Bugangan",
            "alamat": "Jl. Contoh No. 10 RT 02/RW 03, Semarang",
            "telepon": "081234567891",
            "role": "pegawai",
            "signature_base64": None,
            "balances": UserBalances().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


# ---------------- Auth endpoints ----------------
@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(user["id"], user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
    }


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------------- User management (admin) ----------------
@api.get("/users")
async def list_users(user=Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@api.get("/users/kepala-list")
async def list_kepala(user=Depends(get_current_user)):
    """Return list of kepala users (used for picking approver / display)."""
    rows = await db.users.find({"role": "kepala"}, {"_id": 0, "password_hash": 0}).to_list(50)
    return rows


@api.post("/users")
async def create_user(body: UserCreate, user=Depends(require_role("admin"))):
    if await db.users.find_one({"email": body.email.lower().strip()}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    new_user = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower().strip(),
        "password_hash": hash_password(body.password),
        "name": body.name,
        "nik": body.nik,
        "is_asn": body.is_asn,
        "nip": body.nip,
        "jabatan": body.jabatan,
        "masa_kerja_tahun": body.masa_kerja_tahun,
        "masa_kerja_bulan": body.masa_kerja_bulan,
        "unit_kerja": body.unit_kerja,
        "alamat": body.alamat,
        "telepon": body.telepon,
        "role": body.role,
        "signature_base64": body.signature_base64,
        "balances": (body.balances or UserBalances()).model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    new_user.pop("_id", None)
    new_user.pop("password_hash", None)
    return new_user


@api.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user=Depends(require_role("admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    update = {k: v for k, v in body.model_dump(exclude_none=True).items() if k != "password"}
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if body.balances is not None:
        update["balances"] = body.balances.model_dump()
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    out = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return out


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_role("admin"))):
    if user["id"] == user_id:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return {"ok": True}


@api.put("/users/me/signature")
async def update_my_signature(payload: dict, user=Depends(get_current_user)):
    sig = payload.get("signature_base64")
    if sig is None:
        raise HTTPException(status_code=400, detail="signature_base64 wajib disertakan (boleh kosong untuk menghapus)")
    new_value = sig if sig else None
    await db.users.update_one({"id": user["id"]}, {"$set": {"signature_base64": new_value}})
    return {"ok": True}


# ---------------- Leave requests ----------------
def _calc_days(start_str: str, end_str: str) -> int:
    start = datetime.fromisoformat(start_str).date()
    end = datetime.fromisoformat(end_str).date()
    if end < start:
        raise HTTPException(status_code=400, detail="Tanggal selesai tidak boleh sebelum tanggal mulai")
    return (end - start).days + 1


@api.post("/leave-requests")
async def create_leave_request(body: LeaveRequestCreate, user=Depends(get_current_user)):
    if user["role"] not in ("pegawai", "kepala"):
        raise HTTPException(status_code=403, detail="Hanya pegawai/kepala yang dapat mengajukan cuti")

    days = _calc_days(body.tanggal_mulai, body.tanggal_selesai)

    # Check balance for the chosen leave type (cuti_bersama uses cuti_tahunan budget)
    balance_key = body.jenis_cuti if body.jenis_cuti != "cuti_bersama" else "cuti_tahunan"
    if balance_key in BALANCE_TYPES:
        current_balance = (user.get("balances") or {}).get(balance_key, 0)
        if current_balance < days:
            raise HTTPException(
                status_code=400,
                detail=f"Sisa {LEAVE_TYPE_LABELS[balance_key]} tidak mencukupi (sisa {current_balance} hari, butuh {days} hari)",
            )

    # Generate next form number for the current year (or use manual input)
    year = datetime.now(timezone.utc).year
    if body.form_no and body.form_no.strip():
        form_no = body.form_no.strip()
        # Validasi keunikan untuk nomor surat manual
        existing = await db.leave_requests.find_one({"form_no": form_no})
        if existing:
            raise HTTPException(status_code=400, detail=f"Nomor surat '{form_no}' sudah digunakan pengajuan lain")
    else:
        # Auto-generate sampai dapat nomor yang unik
        count = await db.leave_requests.count_documents({"year": year})
        while True:
            count += 1
            candidate = f"B/{count:03d}/851/{datetime.now(timezone.utc).month:02d}/{year}"
            if not await db.leave_requests.find_one({"form_no": candidate}):
                form_no = candidate
                break

    doc = {
        "id": str(uuid.uuid4()),
        "form_no": form_no,
        "year": year,
        "user_id": user["id"],
        "user_name": user["name"],
        "jenis_cuti": body.jenis_cuti,
        "alasan": body.alasan,
        "tanggal_mulai": body.tanggal_mulai,
        "tanggal_selesai": body.tanggal_selesai,
        "lamanya": days,
        "alamat_selama_cuti": body.alamat_selama_cuti,
        "telepon_selama_cuti": body.telepon_selama_cuti,
        "status": "menunggu",
        "pesan_kepala": "",
        "approved_by": None,
        "approved_by_name": None,
        "approved_at": None,
        "verify_token": secrets.token_urlsafe(16),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.leave_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/leave-requests")
async def list_leave_requests(
    scope: str = "mine",
    status_filter: Optional[str] = None,
    user=Depends(get_current_user),
):
    """scope: mine (own), pending (kepala queue), all (admin/kepala view all)."""
    query = {}
    if scope == "mine":
        query["user_id"] = user["id"]
    elif scope == "pending":
        if user["role"] not in ("kepala", "admin"):
            raise HTTPException(status_code=403, detail="Akses ditolak")
        query["status"] = "menunggu"
    elif scope == "all":
        if user["role"] not in ("kepala", "admin"):
            raise HTTPException(status_code=403, detail="Akses ditolak")
    else:
        raise HTTPException(status_code=400, detail="Scope tidak valid")

    if status_filter:
        query["status"] = status_filter

    rows = await db.leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return rows


@api.get("/leave-requests/{req_id}")
async def get_leave_request(req_id: str, user=Depends(get_current_user)):
    row = await db.leave_requests.find_one({"id": req_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if user["role"] == "pegawai" and row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return row


@api.put("/leave-requests/{req_id}/form-no")
async def update_form_no(req_id: str, payload: dict, user=Depends(get_current_user)):
    row = await db.leave_requests.find_one({"id": req_id})
    if not row:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    # Pegawai hanya boleh edit punyanya sendiri; admin & kepala boleh semua
    if user["role"] == "pegawai" and row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    # Hanya boleh edit kalau status masih "menunggu" (belum diverifikasi Kepala)
    if row["status"] != "menunggu":
        raise HTTPException(
            status_code=400,
            detail="Nomor surat tidak bisa diubah setelah pengajuan diverifikasi Kepala Puskesmas",
        )
    new_form_no = (payload.get("form_no") or "").strip()
    if not new_form_no:
        raise HTTPException(status_code=400, detail="Nomor surat tidak boleh kosong")
    # Cek keunikan — tidak boleh sama dengan pengajuan lain
    existing = await db.leave_requests.find_one(
        {"form_no": new_form_no, "id": {"$ne": req_id}}
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Nomor surat '{new_form_no}' sudah digunakan pengajuan lain")
    await db.leave_requests.update_one({"id": req_id}, {"$set": {"form_no": new_form_no}})
    updated = await db.leave_requests.find_one({"id": req_id}, {"_id": 0})
    return updated


@api.post("/leave-requests/{req_id}/decide")
async def decide_leave_request(req_id: str, body: DecideIn, user=Depends(require_role("kepala"))):
    row = await db.leave_requests.find_one({"id": req_id})
    if not row:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if row["status"] != "menunggu":
        raise HTTPException(status_code=400, detail="Pengajuan sudah diproses")

    new_status = body.decision  # disetujui / perubahan / ditangguhkan / tidak_disetujui

    # Deduct balance only when fully approved
    if new_status == "disetujui":
        target = await db.users.find_one({"id": row["user_id"]})
        if target:
            balance_key = row["jenis_cuti"] if row["jenis_cuti"] != "cuti_bersama" else "cuti_tahunan"
            if balance_key in BALANCE_TYPES:
                cur = (target.get("balances") or {}).get(balance_key, 0)
                new_val = max(0, cur - row["lamanya"])
                await db.users.update_one(
                    {"id": row["user_id"]},
                    {"$set": {f"balances.{balance_key}": new_val}},
                )

    await db.leave_requests.update_one(
        {"id": req_id},
        {"$set": {
            "status": new_status,
            "pesan_kepala": body.pesan or "",
            "approved_by": user["id"],
            "approved_by_name": user["name"],
            "approved_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    updated = await db.leave_requests.find_one({"id": req_id}, {"_id": 0})
    return updated


# ---------------- Public verification ----------------
@api.get("/verify/{token}")
async def verify_leave(token: str):
    row = await db.leave_requests.find_one({"verify_token": token}, {"_id": 0})
    if not row:
        return {"valid": False}
    pegawai = await db.users.find_one({"id": row["user_id"]}, {"_id": 0, "password_hash": 0})
    return {
        "valid": True,
        "form_no": row["form_no"],
        "status": row["status"],
        "pegawai_name": pegawai["name"] if pegawai else row["user_name"],
        "jabatan": pegawai["jabatan"] if pegawai else "",
        "jenis_cuti": LEAVE_TYPE_LABELS.get(row["jenis_cuti"], row["jenis_cuti"]),
        "tanggal_mulai": row["tanggal_mulai"],
        "tanggal_selesai": row["tanggal_selesai"],
        "lamanya": row["lamanya"],
        "approved_by_name": row.get("approved_by_name"),
        "approved_at": row.get("approved_at"),
    }


# ---------------- PDF generation ----------------
def _id_date(date_str: str) -> str:
    months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
              "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    d = datetime.fromisoformat(date_str).date()
    return f"{d.day} {months[d.month-1]} {d.year}"


def _build_qr(data: str) -> io.BytesIO:
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def _decode_signature(b64: Optional[str]) -> Optional[io.BytesIO]:
    if not b64:
        return None
    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        if len(raw) < 100:
            # Too small to be a real signature image — skip to avoid PIL crash
            return None
        # Validate it's actually parseable by PIL
        from PIL import Image as PILImage
        buf = io.BytesIO(raw)
        try:
            PILImage.open(buf).verify()
        except Exception:
            return None
        buf.seek(0)
        return buf
    except Exception:
        return None


@api.get("/leave-requests/{req_id}/pdf")
async def export_pdf(req_id: str, token: Optional[str] = None, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    # Allow auth via either Authorization header OR ?token= query param (for direct browser links)
    auth_token = None
    if credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token
    if not auth_token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = jwt.decode(auth_token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User tidak ditemukan")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    row = await db.leave_requests.find_one({"id": req_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    if user["role"] == "pegawai" and row["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    pegawai = await db.users.find_one({"id": row["user_id"]}, {"_id": 0, "password_hash": 0})
    kepala = None
    if row.get("approved_by"):
        kepala = await db.users.find_one({"id": row["approved_by"]}, {"_id": 0, "password_hash": 0})
    if not kepala:
        kepala = await db.users.find_one({"role": "kepala"}, {"_id": 0, "password_hash": 0})

    frontend_url = os.environ.get("FRONTEND_URL", "")
    verify_url = f"{frontend_url}/verify/{row['verify_token']}" if frontend_url else row["verify_token"]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm, topMargin=1*cm, bottomMargin=1*cm)

    styles = getSampleStyleSheet()
    header_big = ParagraphStyle("hb", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, alignment=TA_CENTER, leading=15)
    header_med = ParagraphStyle("hm", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=12, alignment=TA_CENTER, leading=14)
    header_sub = ParagraphStyle("hs", parent=styles["Normal"], fontName="Helvetica", fontSize=9, alignment=TA_CENTER, leading=11)
    title_style = ParagraphStyle("ts", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, alignment=TA_CENTER, leading=13, underlineWidth=1)
    body = ParagraphStyle("b", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=11)
    body_b = ParagraphStyle("bb", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=11)
    small = ParagraphStyle("sm", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=9)

    story = []
    # KOP SURAT dengan logo Kota Semarang di kiri
    logo_path = ROOT_DIR / "assets" / "logo_semarang.png"
    kop_text = [
        Paragraph("PEMERINTAH KOTA SEMARANG", header_big),
        Paragraph("DINAS KESEHATAN", header_big),
        Paragraph("UPTD PUSKESMAS BUGANGAN", header_med),
        Paragraph("Jl. Musi Raya No. 22 Telp. 3546061 Semarang", header_sub),
    ]
    if logo_path.exists():
        logo_img = RLImage(str(logo_path), width=2.2*cm, height=2.6*cm)
        kop_tbl = Table([[logo_img, kop_text]], colWidths=[2.6*cm, 15.4*cm])
        kop_tbl.setStyle(TableStyle([
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("ALIGN", (0,0), (0,0), "CENTER"),
        ]))
        story.append(kop_tbl)
    else:
        for p in kop_text:
            story.append(p)
    story.append(Spacer(1, 2))
    # Double horizontal line
    line_tbl = Table([[""]], colWidths=[18*cm])
    line_tbl.setStyle(TableStyle([
        ("LINEABOVE", (0,0), (-1,-1), 1.5, colors.black),
        ("LINEBELOW", (0,0), (-1,-1), 0.5, colors.black),
        ("TOPPADDING", (0,0), (-1,-1), 2),
        ("BOTTOMPADDING", (0,0), (-1,-1), 1),
    ]))
    story.append(line_tbl)
    story.append(Spacer(1, 6))

    # Date right
    today_str = _id_date(row.get("approved_at", row["created_at"])[:10]) if row.get("approved_at") else _id_date(row["created_at"][:10])
    addr_tbl = Table([[
        Paragraph(f"Kepada Yth.<br/>Kepala UPTD Puskesmas Bugangan<br/>di Semarang", body),
        Paragraph(f"Semarang, {today_str}", body),
    ]], colWidths=[10*cm, 8*cm])
    addr_tbl.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("ALIGN", (1,0), (1,0), "RIGHT")]))
    story.append(addr_tbl)
    story.append(Spacer(1, 4))

    story.append(Paragraph("FORMULIR PERMINTAAN DAN PEMBERIAN CUTI", title_style))
    story.append(Paragraph(f"No. {row['form_no']}", ParagraphStyle("no", parent=body, alignment=TA_CENTER)))
    story.append(Spacer(1, 6))

    # Data Pegawai
    story.append(Paragraph("<b>I. DATA PEGAWAI</b>", body))
    data_rows = [
        ["Nama", ":", pegawai["name"] if pegawai else row["user_name"]],
        ["NIP", ":", pegawai["nip"] if pegawai and pegawai.get("is_asn") else f"Non ASN ({pegawai['nik']})" if pegawai else "Non ASN"],
        ["Jabatan", ":", pegawai["jabatan"] if pegawai else ""],
        ["Masa Kerja", ":", f"{pegawai['masa_kerja_tahun']:02d} th {pegawai['masa_kerja_bulan']:02d} bln" if pegawai else ""],
        ["Unit Kerja", ":", pegawai["unit_kerja"] if pegawai else "UPTD Puskesmas Bugangan"],
    ]
    t = Table(data_rows, colWidths=[3*cm, 0.4*cm, 14.6*cm])
    t.setStyle(TableStyle([("FONTNAME", (0,0), (-1,-1), "Helvetica"), ("FONTSIZE", (0,0), (-1,-1), 9), ("VALIGN", (0,0), (-1,-1), "TOP"), ("BOTTOMPADDING", (0,0), (-1,-1), 1), ("TOPPADDING", (0,0), (-1,-1), 1)]))
    story.append(t)
    story.append(Spacer(1, 4))

    # Jenis Cuti
    story.append(Paragraph("<b>II. JENIS CUTI YANG DIAMBIL</b>", body))
    jenis_keys = ["cuti_tahunan", "cuti_bersama", "cuti_sakit", "cuti_melahirkan", "cuti_alasan_penting", "cuti_luar_tanggungan"]
    cuti_rows = []
    for i in range(0, 6, 2):
        left = jenis_keys[i]
        right = jenis_keys[i+1]
        cuti_rows.append([
            f"{i+1}.", LEAVE_TYPE_LABELS[left], "[√]" if row["jenis_cuti"] == left else "[ ]",
            f"{i+2}.", LEAVE_TYPE_LABELS[right], "[√]" if row["jenis_cuti"] == right else "[ ]",
        ])
    t2 = Table(cuti_rows, colWidths=[0.6*cm, 7.4*cm, 1*cm, 0.6*cm, 7.4*cm, 1*cm])
    t2.setStyle(TableStyle([("FONTNAME", (0,0), (-1,-1), "Helvetica"), ("FONTSIZE", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 1), ("TOPPADDING", (0,0), (-1,-1), 1)]))
    story.append(t2)
    story.append(Spacer(1, 4))

    # Alasan
    story.append(Paragraph("<b>III. ALASAN CUTI</b>", body))
    story.append(Paragraph(row["alasan"], body))
    story.append(Spacer(1, 4))

    # Lama
    story.append(Paragraph("<b>IV. LAMANYA CUTI</b>", body))
    story.append(Paragraph(
        f"Selama <b>{row['lamanya']}</b> (hari) mulai tanggal <b>{_id_date(row['tanggal_mulai'])}</b> s/d <b>{_id_date(row['tanggal_selesai'])}</b>",
        body))
    story.append(Spacer(1, 4))

    # Catatan cuti (balances)
    story.append(Paragraph("<b>V. CATATAN CUTI</b>", body))
    bal = (pegawai or {}).get("balances", {}) if pegawai else {}
    cat = [
        ["Cuti Tahunan", str(bal.get("cuti_tahunan", 0)), "Cuti Melahirkan", str(bal.get("cuti_melahirkan", 0))],
        ["Cuti Besar", str(bal.get("cuti_besar", 0)), "Cuti Karena Alasan Penting", str(bal.get("cuti_alasan_penting", 0))],
        ["Cuti Sakit", str(bal.get("cuti_sakit", 0)), "Cuti di Luar Tanggungan Negara", str(bal.get("cuti_luar_tanggungan", 0))],
    ]
    t3 = Table([["Jenis Cuti", "Sisa", "Jenis Cuti", "Sisa"]] + cat, colWidths=[5.5*cm, 2*cm, 7.5*cm, 2*cm])
    t3.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("GRID", (0,0), (-1,-1), 0.5, colors.black),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#EAF4F0")),
        ("ALIGN", (1,1), (1,-1), "CENTER"),
        ("ALIGN", (3,1), (3,-1), "CENTER"),
        ("LEFTPADDING", (0,0), (-1,-1), 3),
        ("RIGHTPADDING", (0,0), (-1,-1), 3),
        ("TOPPADDING", (0,0), (-1,-1), 2),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
    ]))
    story.append(t3)
    story.append(Spacer(1, 4))

    # Alamat selama cuti
    story.append(Paragraph("<b>VI. ALAMAT SELAMA MENJALANKAN CUTI</b>", body))
    addr_rows = [
        ["Alamat", ":", row["alamat_selama_cuti"]],
        ["Telp", ":", row["telepon_selama_cuti"]],
    ]
    t4 = Table(addr_rows, colWidths=[3*cm, 0.4*cm, 14.6*cm])
    t4.setStyle(TableStyle([("FONTNAME", (0,0), (-1,-1), "Helvetica"), ("FONTSIZE", (0,0), (-1,-1), 9), ("VALIGN", (0,0), (-1,-1), "TOP"), ("BOTTOMPADDING", (0,0), (-1,-1), 1), ("TOPPADDING", (0,0), (-1,-1), 1)]))
    story.append(t4)
    story.append(Spacer(1, 6))

    # Signature blocks — pakai QR code (barcode) untuk pegawai & kepala
    peg_qr = _build_qr(verify_url)
    kep_qr = _build_qr(verify_url)

    # Pegawai TTD (kanan)
    peg_block = [
        Paragraph("Hormat saya,", body),
        RLImage(peg_qr, width=1.8*cm, height=1.8*cm),
        Paragraph(f"<b><u>{pegawai['name'] if pegawai else row['user_name']}</u></b>", body),
        Paragraph(
            f"NIP: {pegawai['nip'] if pegawai and pegawai.get('is_asn') else 'Non ASN'}", small),
    ]
    sig_tbl = Table([["", peg_block]], colWidths=[10*cm, 8*cm])
    sig_tbl.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(sig_tbl)
    story.append(Spacer(1, 4))

    # Pertimbangan & decision
    story.append(Paragraph("<b>VII. PERTIMBANGAN KEPALA UPTD PUSKESMAS BUGANGAN</b>", body))
    decisions = [
        ("disetujui", "DISETUJUI"),
        ("perubahan", "PERUBAHAN"),
        ("ditangguhkan", "DITANGGUHKAN"),
        ("tidak_disetujui", "TIDAK DISETUJUI"),
    ]
    dec_cells = [["[√] " + lbl if row["status"] == key else "[ ] " + lbl for key, lbl in decisions]]
    t5 = Table(dec_cells, colWidths=[4.5*cm]*4)
    t5.setStyle(TableStyle([("FONTNAME", (0,0), (-1,-1), "Helvetica"), ("FONTSIZE", (0,0), (-1,-1), 9), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("TOPPADDING", (0,0), (-1,-1), 2), ("BOTTOMPADDING", (0,0), (-1,-1), 2)]))
    story.append(t5)
    if row.get("pesan_kepala"):
        story.append(Paragraph(f"<b>Catatan Kepala:</b> {row['pesan_kepala']}", body))
    story.append(Spacer(1, 4))

    # Kepala TTD (kanan) — HANYA muncul jika kepala sudah memutuskan (bukan status menunggu)
    if row["status"] != "menunggu" and row.get("approved_by"):
        kep_block = [
            Paragraph(f"Semarang, {today_str}", body),
            Paragraph("Kepala UPTD Puskesmas Bugangan", body),
            RLImage(kep_qr, width=1.8*cm, height=1.8*cm),
        ]
        kep_name = kepala["name"] if kepala else "____________________"
        kep_nip = kepala["nip"] if kepala and kepala.get("is_asn") else "Non ASN"
        kep_block.append(Paragraph(f"<b><u>{kep_name}</u></b>", body))
        kep_block.append(Paragraph(f"NIP: {kep_nip}", small))
    else:
        # Belum disetujui — tampilkan placeholder kosong (tanpa TTD/QR)
        kep_block = [
            Paragraph(f"Semarang, ____________________", body),
            Paragraph("Kepala UPTD Puskesmas Bugangan", body),
            Spacer(1, 1.8*cm),
            Paragraph("<b><u>____________________</u></b>", body),
            Paragraph("NIP: ____________________", small),
        ]

    sig_tbl2 = Table([["", kep_block]], colWidths=[10*cm, 8*cm])
    sig_tbl2.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(sig_tbl2)

    story.append(Spacer(1, 4))
    story.append(Paragraph("<i>Catatan: N = Cuti tahun berjalan, N-1 = Sisa cuti 1 tahun sebelumnya, N-2 = Sisa cuti 2 tahun sebelumnya. Scan QR code untuk verifikasi keaslian dokumen.</i>", small))

    doc.build(story)
    buf.seek(0)
    headers = {"Content-Disposition": f'inline; filename="cuti-{row["form_no"].replace("/", "-")}.pdf"'}
    return StreamingResponse(buf, media_type="application/pdf", headers=headers)


# ---------------- Mount ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown():
    client.close()
