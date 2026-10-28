"""Se queda conectado y registra todas las notificaciones durante N segundos.

Uso: python tools/monitor.py 300
"""
import asyncio
import sys
import time
from pathlib import Path

from bleak import BleakClient

from common import find_machine

ROOT = Path(__file__).resolve().parent.parent
KEY = bytes.fromhex((ROOT / "clave-cafetera.txt").read_text().strip())
LOG = ROOT / "snapshots" / "monitor.log"


def u(short):
    return f"06aa{short}-f22a-11e3-9daa-0002a5d5c51b"


def log(line):
    stamp = time.strftime("%H:%M:%S")
    print(f"{stamp} {line}", flush=True)
    with LOG.open("a") as f:
        f.write(f"{stamp} {line}\n")


async def session(seconds):
    dev = await find_machine()
    async with BleakClient(dev, timeout=20) as c:
        await c.pair()
        await asyncio.sleep(1)
        await c.write_gatt_char(u("3a61"), b"\x01", response=True)
        await c.write_gatt_char(u("3a41"), KEY, response=True)
        log("conectado y autenticado")
        for svc in c.services:
            for ch in svc.characteristics:
                if "notify" in ch.properties:
                    name = ch.uuid[4:8]
                    await c.start_notify(ch, lambda _s, b, n=name: log(f"{n}  {b.hex(' ')}"))
                    log(f"suscripto a {name}")
        end = time.time() + seconds
        while time.time() < end and c.is_connected:
            await asyncio.sleep(1)
        log("fin" if c.is_connected else "desconectado")


async def main(seconds):
    LOG.parent.mkdir(exist_ok=True)
    for i in range(5):
        try:
            return await session(seconds)
        except Exception as e:  # noqa: BLE001
            log(f"intento {i + 1} falló: {e}")
            await asyncio.sleep(3)


asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 300))
