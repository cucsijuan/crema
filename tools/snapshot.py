"""Reads every readable characteristic (without writing any setting) and saves
them to snapshots/<name>.json to compare settings changes.

Usage:
  python tools/snapshot.py before
  python tools/snapshot.py after
  python tools/snapshot.py --diff before after
"""
import asyncio
import json
import sys
from pathlib import Path

from bleak import BleakClient

from common import find_machine

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "snapshots"
KEY = bytes.fromhex((ROOT / "machine-key.txt").read_text().strip())


def u(short):
    return f"06aa{short}-f22a-11e3-9daa-0002a5d5c51b"


async def snapshot(name):
    dev = await find_machine()
    if not dev:
        sys.exit("Machine not found")
    async with BleakClient(dev, timeout=20) as c:
        await c.pair()
        await asyncio.sleep(1)
        await c.write_gatt_char(u("3a61"), b"\x01", response=True)
        await c.write_gatt_char(u("3a41"), KEY, response=True)
        data = {}
        for svc in c.services:
            for ch in svc.characteristics:
                if "read" not in ch.properties:
                    continue
                try:
                    data[ch.uuid[4:8]] = (await c.read_gatt_char(ch)).hex(" ")
                except Exception as e:  # noqa: BLE001
                    data[ch.uuid[4:8]] = f"ERR {e}"
    OUT.mkdir(exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(data, indent=2, sort_keys=True))
    for k, v in sorted(data.items()):
        print(f"{k}  {v}")


def diff(a, b):
    da = json.loads((OUT / f"{a}.json").read_text())
    db = json.loads((OUT / f"{b}.json").read_text())
    for k in sorted(set(da) | set(db)):
        if da.get(k) != db.get(k):
            print(f"{k}\n  {a}: {da.get(k)}\n  {b}: {db.get(k)}")


async def with_retries(name, tries=3):
    # The machine sometimes rejects the first authentication attempt.
    for i in range(tries):
        try:
            return await snapshot(name)
        except Exception as e:  # noqa: BLE001
            print(f"attempt {i + 1} failed: {e}")
            await asyncio.sleep(3)
    sys.exit("Could not authenticate")


if sys.argv[1] == "--diff":
    diff(sys.argv[2], sys.argv[3])
else:
    asyncio.run(with_retries(sys.argv[1]))
