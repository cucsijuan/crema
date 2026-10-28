"""Helpers shared by the diagnostic tools."""
import os

from bleak import BleakScanner

# Optional: pin the address with EXPERT_ADDRESS; otherwise it is found by name.
ADDRESS = os.environ.get("EXPERT_ADDRESS")


async def find_machine(timeout=20):
    if ADDRESS:
        return await BleakScanner.find_device_by_address(ADDRESS, timeout=timeout)
    return await BleakScanner.find_device_by_filter(
        lambda d, _adv: (d.name or "").startswith("Expert"), timeout=timeout
    )
