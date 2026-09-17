"""Seed a few DEMO records so the mobile scan+location feature can be tested/demoed.
Safe to re-run: it removes existing DEMO_MOBILE records first. These are clearly
labelled (kebun starts with 'DEMO') so they can be deleted anytime from the dashboard.
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

now = datetime.now(timezone.utc).isoformat()

demos = [
    {
        "kebun": "DEMO", "afdeling": "1", "blok": "A01", "code_lsu": "DEMO1LSU01",
        "luas_ha": 8.5, "jumlah_pokok": 1200, "titik_sample": "TS01",
        "koord_x": 109.888577, "koord_y": 0.164244,  # x=lng, y=lat
        "kategori": "Sudah LSU dan tagging", "keterangan": "",
    },
    {
        "kebun": "DEMO", "afdeling": "1", "blok": "A01", "code_lsu": "DEMO1LSU01",
        "luas_ha": 8.5, "jumlah_pokok": 1200, "titik_sample": "TS02",
        "koord_x": 109.889100, "koord_y": 0.164800,
        "kategori": "Sudah LSU dan tagging", "keterangan": "",
    },
    {
        "kebun": "DEMO", "afdeling": "2", "blok": "B07", "code_lsu": "DEMO2LSU07",
        "luas_ha": 10.2, "jumlah_pokok": 1350, "titik_sample": "TS01",
        "koord_x": 109.900000, "koord_y": 0.170000,
        "kategori": "Sudah LSU dan tagging", "keterangan": "",
    },
]

meas_defaults = {
    "jumlah_pelepah": 0, "panjang_pelepah": 0, "lebar_petiol": 0, "tebal_petiol": 0,
    "panjang_helai_1": 0, "panjang_helai_2": 0, "lebar_helai_1": 0, "lebar_helai_2": 0,
    "jumlah_anak_daun": 0, "sph": 0, "la": 0, "lai": 0, "tanggal_lsu": "",
}

db.records.delete_many({"kebun": "DEMO"})
for d in demos:
    d.update(meas_defaults)
    d["created_at"] = now
    d["tagged_at"] = now
res = db.records.insert_many(demos)
print(f"Inserted {len(res.inserted_ids)} DEMO records.")
for d in demos:
    id_actual = f"{d['kebun']}{d['afdeling']}{d['blok']}{d['titik_sample']}"
    # coord format with comma decimal (mirror backend fmt_num)
    def fmt(v):
        f = float(v)
        if f == int(f):
            return str(int(f))
        return f"{f:.6f}".rstrip("0").rstrip(".").replace(".", ",")
    id_actual += fmt(d["koord_x"]) + fmt(d["koord_y"])
    print(f"  id_actual = {id_actual}  (lat={d['koord_y']}, lng={d['koord_x']})")
print("Done.")
