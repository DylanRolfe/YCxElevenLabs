"""Entry point. Maritime injects PORT; never hardcode it or set it yourself."""

import os

import uvicorn


def ensure_localhost() -> None:
    # Maritime's micro-VM starts with an empty /etc/hosts.
    try:
        with open("/etc/hosts", "r+", encoding="utf-8") as hosts:
            if "localhost" not in hosts.read():
                hosts.write("\n127.0.0.1 localhost\n")
    except OSError:
        pass


if __name__ == "__main__":
    ensure_localhost()
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
