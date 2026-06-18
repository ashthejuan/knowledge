from os import getenv


def build_allowed_origins() -> list[str]:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    frontend_url = getenv("FRONTEND_URL")
    if frontend_url:
        origin = frontend_url.strip().rstrip("/")
        if origin:
            origins.append(origin)

    nextauth_url = getenv("NEXTAUTH_URL")
    if nextauth_url:
        origin = nextauth_url.strip().rstrip("/")
        if origin:
            origins.append(origin)

    vercel_url = getenv("VERCEL_URL")
    if vercel_url:
        origin = vercel_url.strip().rstrip("/")
        if origin:
            if "://" not in origin:
                origin = f"https://{origin}"
            origins.append(origin)

    cors_origins = getenv("CORS_ORIGINS")
    if cors_origins:
        for raw_origin in cors_origins.split(","):
            origin = raw_origin.strip().rstrip("/")
            if origin:
                origins.append(origin)

    return list(dict.fromkeys(origins))