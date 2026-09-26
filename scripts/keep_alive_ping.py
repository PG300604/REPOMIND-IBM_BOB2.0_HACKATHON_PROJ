"""
Render Backend Keep-Alive Ping Service

Pings your Render FastAPI backend every 10 minutes to prevent the
free-tier 15-minute inactivity spin-down.

Usage:
  python scripts/keep_alive_ping.py [BACKEND_URL] [INTERVAL_MINUTES]
Example:
  python scripts/keep_alive_ping.py https://repomind-backend.onrender.com 10
"""

import sys
import time
from datetime import datetime
import urllib.request
import urllib.error

DEFAULT_URL = "https://repomind-backend.onrender.com"
DEFAULT_INTERVAL_MIN = 10


def ping_health(backend_url: str) -> bool:
    target = backend_url.rstrip("/")
    if not target.endswith("/health"):
        target += "/health"

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    req = urllib.request.Request(
        target,
        headers={"User-Agent": "RepoMind-KeepAlive/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            print(f"[{now_str}] Ping to {target} -> HTTP {status} OK")
            return status == 200
    except urllib.error.HTTPError as e:
        print(f"[{now_str}] Ping to {target} -> HTTP {e.code} (Service active)")
        return True
    except Exception as e:
        print(f"[{now_str}] Ping to {target} failed: {e}")
        return False


def main():
    backend_url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    interval_min = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_INTERVAL_MIN
    interval_sec = interval_min * 60

    print(f"--- RepoMind Keep-Alive Daemon Started ---")
    print(f"Target: {backend_url}")
    print(f"Interval: Every {interval_min} minutes ({interval_sec}s)")
    print(f"Press Ctrl+C to terminate.")

    while True:
        ping_health(backend_url)
        time.sleep(interval_sec)


if __name__ == "__main__":
    main()
