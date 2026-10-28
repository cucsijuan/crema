"""Envía un comando crudo a 3a42 y muestra la respuesta de 3a52.

Uso: python tools/cmd.py "01 10 05 00 04 02 00 96"
"""
import asyncio
import sys
from pathlib import Path

from bleak import BleakClient

from common import find_machine

ROOT = Path(__file__).resolve().parent.parent
KEY = bytes.fromhex((ROOT / "clave-cafetera.txt").read_text().strip())


def u(short):
    return f"06aa{short}-f22a-11e3-9daa-0002a5d5c51b"


async def session(cmd):
    dev = await find_machine()
    async with BleakClient(dev, timeout=20) as c:
        await c.pair()
        await asyncio.sleep(1)
        await c.write_gatt_char(u("3a61"), b"\x01", response=True)
        await c.write_gatt_char(u("3a41"), KEY, response=True)
        got = asyncio.Queue()
        await c.start_notify(u("3a52"), lambda _s, b: got.put_nowait(b.hex(" ")))
        await c.start_notify(u("3a12"), lambda _s, b: print("estado", b.hex(" ")))
        print("estado", (await c.read_gatt_char(u("3a12"))).hex(" "))
        print("enviando", cmd.hex(" "))
        await c.write_gatt_char(u("3a42"), cmd, response=True)
        try:
            while True:
                print("respuesta", await asyncio.wait_for(got.get(), 6))
        except asyncio.TimeoutError:
            pass


async def main(cmd):
    for i in range(5):
        try:
            return await session(cmd)
        except Exception as e:  # noqa: BLE001
            print(f"intento {i + 1} falló: {e}")
            await asyncio.sleep(3)


asyncio.run(main(bytes.fromhex(sys.argv[1].replace(" ", ""))))
