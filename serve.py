#!/usr/bin/env python3
"""Run a lightweight static server for Dropzone X assets."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os


def main() -> None:
    root = Path(__file__).resolve().parent
    handler = SimpleHTTPRequestHandler
    server = ThreadingHTTPServer(("0.0.0.0", 8000), handler)

    print("Serving Dropzone X at http://127.0.0.1:8000/index.html")
    print("Press Ctrl+C to stop the server.")

    try:
        with server:
            # Ensure we serve files from repository root
            os.chdir(root)
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
