#!/usr/bin/env python3
"""
PlayForge VPS deployment via paramiko.
Usage: python deploy.py
"""
import io
import os
import secrets
import sys
import tarfile
import time
import base64

import paramiko

# ── Config ────────────────────────────────────────────────────────────────────
VPS_HOST   = "2.25.133.158"
VPS_USER   = "root"
VPS_PASS   = "REDACTED-ROTATE-ME"
APP_DIR    = "/opt/playforge"
DB_USER    = "playforge"
DB_NAME    = "playforge"
NEXTAUTH_URL = f"http://{VPS_HOST}"
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

EXCLUDE_DIRS  = {"node_modules", ".next", ".git", "docs"}
EXCLUDE_NAMES = {".env", ".env.local", ".env.development", ".env.production",
                 ".env.example", "deploy.py"}

# ── Helpers ───────────────────────────────────────────────────────────────────

def gen_secret(n: int = 32) -> str:
    return base64.b64encode(secrets.token_bytes(n)).decode()

def gen_password(n: int = 16) -> str:
    return secrets.token_hex(n)

def tarball_filter(ti: tarfile.TarInfo):
    parts = ti.name.replace("\\", "/").split("/")
    for part in parts:
        if part in EXCLUDE_DIRS:
            return None
        if part in EXCLUDE_NAMES:
            return None
        if part.startswith(".env"):
            return None
    return ti

def make_tarball() -> io.BytesIO:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add(PROJECT_ROOT, arcname="playforge", filter=tarball_filter)
    buf.seek(0)
    return buf

def ssh_run(client: paramiko.SSHClient, cmd: str, check: bool = True) -> str:
    short = cmd[:90] + ("…" if len(cmd) > 90 else "")
    print(f"  $ {short}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    rc  = stdout.channel.recv_exit_status()
    combined = (out + err).strip()
    if combined:
        for line in combined.splitlines()[-6:]:   # last 6 lines of output
            print(f"    {line}")
    if check and rc != 0:
        raise RuntimeError(f"Command failed (rc={rc}): {cmd[:80]}")
    return out

def connect(host: str, user: str, password: str, retries: int = 6) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    for attempt in range(1, retries + 1):
        try:
            client.connect(host, username=user, password=password, timeout=15,
                           look_for_keys=False, allow_agent=False)
            return client
        except Exception as exc:
            print(f"  Attempt {attempt}/{retries}: {exc}")
            if attempt < retries:
                time.sleep(5)
    raise RuntimeError("Could not connect to VPS after retries")

# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 62)
    print("  PlayForge -> VPS Deployment")
    print(f"  Target : {VPS_USER}@{VPS_HOST}:{APP_DIR}")
    print("=" * 62)

    # ── 1. Connect ────────────────────────────────────────────────────────────
    print("\n[1/7] Connecting to VPS …")
    client = connect(VPS_HOST, VPS_USER, VPS_PASS)
    print("  Connected.")

    # ── 2. Install Docker if missing ──────────────────────────────────────────
    print("\n[2/7] Checking Docker …")
    ver = ssh_run(client, "docker --version 2>/dev/null || echo MISSING", check=False)
    if "MISSING" in ver:
        print("  Installing Docker …")
        ssh_run(client, "curl -fsSL https://get.docker.com | sh")
        ssh_run(client, "systemctl enable --now docker")
        ssh_run(client, "apt-get install -y docker-compose-plugin 2>&1 || true", check=False)
    else:
        print(f"  Already installed: {ver.strip()[:60]}")

    # Ensure Compose plugin is present
    comp = ssh_run(client, "docker compose version 2>/dev/null || echo MISSING", check=False)
    if "MISSING" in comp:
        print("  Installing docker-compose-plugin …")
        ssh_run(client, "apt-get install -y docker-compose-plugin 2>&1")

    # ── 3. Prepare app directory ──────────────────────────────────────────────
    print(f"\n[3/7] Preparing {APP_DIR} …")
    ssh_run(client, f"mkdir -p {APP_DIR}")

    # ── 4. Upload project source ──────────────────────────────────────────────
    print("\n[4/7] Packaging project …")
    tb = make_tarball()
    size_mb = tb.seek(0, 2) / 1024 / 1024
    tb.seek(0)
    print(f"  Archive: {size_mb:.1f} MB")

    sftp = client.open_sftp()
    remote_tar = "/tmp/playforge-deploy.tar.gz"
    print("  Uploading …")
    sftp.putfo(tb, remote_tar)
    sftp.close()

    print("  Extracting on VPS …")
    ssh_run(client, f"tar -xzf {remote_tar} -C /tmp/")
    ssh_run(client, f"cp -r /tmp/playforge/. {APP_DIR}/")
    ssh_run(client, f"rm -rf /tmp/playforge /tmp/playforge-deploy.tar.gz")

    # ── 5. Write .env.production (only if it doesn't already exist) ───────────
    print("\n[5/7] Environment …")
    exists = ssh_run(client,
        f"test -f {APP_DIR}/.env.production && echo EXISTS || echo NEW", check=False)

    if "NEW" in exists:
        db_pass        = gen_password()
        nextauth_secret = gen_secret()
        env_content = (
            f"DATABASE_URL=postgresql://{DB_USER}:{db_pass}@db:5432/{DB_NAME}\n"
            # Postgres container vars (picked up via env_file by the db service)
            f"POSTGRES_USER={DB_USER}\n"
            f"POSTGRES_PASSWORD={db_pass}\n"
            f"POSTGRES_DB={DB_NAME}\n"
            f"NEXTAUTH_URL={NEXTAUTH_URL}\n"
            f"NEXTAUTH_SECRET={nextauth_secret}\n"
            f"NODE_ENV=production\n"
        )
        sftp = client.open_sftp()
        with sftp.open(f"{APP_DIR}/.env.production", "w") as fh:
            fh.write(env_content)
        sftp.close()
        print("  Created .env.production with fresh secrets.")
        print(f"  DB password stored in .env.production on VPS.")
    else:
        print("  .env.production already exists — keeping existing secrets.")

    # ── 6. Build & start ──────────────────────────────────────────────────────
    print("\n[6/7] Building Docker image (this takes a few minutes) …")
    ssh_run(client, f"cd {APP_DIR} && docker compose build 2>&1")

    print("  Starting services …")
    ssh_run(client, f"cd {APP_DIR} && docker compose up -d 2>&1")

    # ── 7. Prisma migrations ──────────────────────────────────────────────────
    print("\n[7/7] Running Prisma migrations …")
    # Wait a moment for the DB container to be ready
    time.sleep(8)
    ssh_run(client,
        f"cd {APP_DIR} && docker compose --profile migration run --rm migrate 2>&1",
        check=False)

    client.close()

    print("\n" + "=" * 62)
    print("  Deployment complete!")
    print(f"  App URL : http://{VPS_HOST}")
    print(f"  Secrets : {APP_DIR}/.env.production (on VPS)")
    print("=" * 62)


if __name__ == "__main__":
    main()
