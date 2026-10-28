"""Utilidades compartidas por las herramientas de diagnóstico."""
import os

from bleak import BleakScanner

# Opcional: fijar la dirección con EXPERT_ADDRESS; si no, se busca por nombre.
ADDRESS = os.environ.get("EXPERT_ADDRESS")


async def find_machine(timeout=20):
    if ADDRESS:
        return await BleakScanner.find_device_by_address(ADDRESS, timeout=timeout)
    return await BleakScanner.find_device_by_filter(
        lambda d, _adv: (d.name or "").startswith("Expert"), timeout=timeout
    )
