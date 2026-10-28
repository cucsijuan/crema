"""BLE diagnostic tool for the Nespresso Expert.

Usage:
  python tools/probe.py info        # reads data without authenticating
  python tools/probe.py onboard     # stores machine-key.txt in the machine (only if it has no key)
  python tools/probe.py status      # authenticates and reads every sensor
"""
import asyncio
import sys
from pathlib import Path

from bleak import BleakClient

from common import find_machine

KEY_FILE = Path(__file__).resolve().parent.parent / "machine-key.txt"


def u(short):
    return f"06aa{short}-f22a-11e3-9daa-0002a5d5c51b"


ONBOARD = u("3a51")
PAIR = u("3a61")
AUTH = u("3a41")
INFO = u("3a21")
SERIAL = u("3a31")
STATE = u("3a12")
SLIDER = u("3a22")
CMD = u("3a42")
RESP = u("3a52")
CAPS = u("3a15")
HARDNESS = u("3a44")
UNKNOWN = [u(x) for x in ("3a11", "3a13", "3a23", "3a14", "3a24", "3a34", "3a25", "3a35", "3a45", "3a32")]


async def read(client, uuid):
    try:
        return (await client.read_gatt_char(uuid)).hex(" ")
    except Exception as e:  # noqa: BLE001
        return f"ERR {e}"


async def main(mode):
    dev = await find_machine()
    if not dev:
        sys.exit("Machine not found (is it on and nearby?)")
    async with BleakClient(dev, timeout=20) as c:
        print("connected")
        print("onboard:", await read(c, ONBOARD))
        print("info:   ", await read(c, INFO))
        print("serial: ", bytes.fromhex((await read(c, SERIAL)).replace(" ", "")).decode(errors="replace"))
        if mode == "info":
            return
        key = bytes.fromhex(KEY_FILE.read_text().strip())
        if mode == "onboard":
            await c.write_gatt_char(PAIR, b"\x01", response=True)
            print("txLevel written")
            try:
                await c.write_gatt_char(AUTH, key, response=True)
                print("key written (unencrypted)")
            except Exception as e:  # noqa: BLE001
                print("key rejected, bonding:", e)
                await c.pair()
                await c.write_gatt_char(AUTH, key, response=True)
                print("key written after bonding")
            await asyncio.sleep(2)
            print("onboard:", await read(c, ONBOARD))
            return
        try:
            await c.write_gatt_char(AUTH, key, response=True)
        except Exception as e:  # noqa: BLE001
            print("auth failed, bonding:", e)
            await c.pair()
            await c.write_gatt_char(AUTH, key, response=True)
        print("authenticated")
        for name, uuid in [("state", STATE), ("slider", SLIDER), ("caps", CAPS), ("hardness", HARDNESS)] + [
            (x[4:8], x) for x in UNKNOWN
        ]:
            print(f"{name:9}", await read(c, uuid))


asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "info"))
