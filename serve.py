#!/usr/bin/env python3
"""Launch the Dropzone X backend and static file server."""
from pathlib import Path
import uvicorn


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    app_path = "backend.app:app"

    print("Starting Dropzone X backend on http://127.0.0.1:8000")
    print("Apri http://127.0.0.1:8000/ nel browser per raggiungere la lobby.")
    uvicorn.run(app_path, host="0.0.0.0", port=8000, reload=False, app_dir=str(base_dir))


if __name__ == "__main__":
    main()
