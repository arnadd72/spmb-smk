import os

from fastapi import FastAPI

app = FastAPI(title="SPMB OCR Service", docs_url=None, redoc_url=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "engine": os.getenv("OCR_ENGINE", "belum-ditetapkan"),
        "version": "0.0.0",
    }
