# Crema

Bluetooth control for the **Nespresso Expert** coffee machine, now that the
official app no longer supports it. Works as a web page (Chrome on a computer,
Bluefy on iPhone) and as an iPhone app. Available in English and Spanish.

> Independent project, not affiliated with Nespresso. "Nespresso" and "Expert"
> are trademarks of their owners and are only mentioned to state compatibility.

## Features

- Live status: heating up, ready, brewing, sleeping, no water, descale,
  lever open.
- Brew ristretto, espresso, lungo, americano or hot water at low, medium or
  high temperature.
- **Schedule** a brew for later: the machine starts it on its own.
- Custom recipes (ml of coffee + ml of water) that can be saved.
- **Dial cup sizes**: change how many ml each drink pours.
- **Auto power-off**: 9 min, 30 min, 2 h or 8 h.
- Capsule counter with a low-stock warning.
- Water hardness, machine details and pairing key.
- English and Spanish UI, following the device language (can be changed under
  Machine → Language).

## Usage

### Web page

<https://cucsijuan.github.io/crema/>

- **Computer:** Google Chrome or Edge. On Linux, enable
  `chrome://flags/#enable-experimental-web-platform-features`.
- **iPhone:** open it with the **Bluefy** browser (Safari has no Web Bluetooth).

"Try demo mode" simulates a machine so the app can be explored without Bluetooth.

### iPhone app (sideloaded from Windows)

Every push to `main` builds an unsigned `.ipa` with GitHub Actions and publishes
it under [Releases → Latest build](../../releases/tag/latest).

1. Install **iTunes** (Apple's web installer, not the Microsoft Store version)
   and **iCloud** on Windows, then [Sideloadly](https://sideloadly.io/).
2. Connect the iPhone with a cable and trust the computer.
3. Drag `Crema.ipa` into Sideloadly, enter your Apple ID and press **Start**.
4. On the iPhone: Settings → General → VPN & Device Management → trust your
   Apple ID. On iOS 16 or later also enable
   Settings → Privacy & Security → **Developer Mode**.

With a free Apple ID the app lasts **7 days**; after that, install it again the
same way (Sideloadly can refresh it automatically while it stays open).

### Local

```bash
npm run serve
```

then open <http://localhost:8765>.

## Pairing key

The machine only accepts commands from clients that present an 8-byte key. The
first time, "Pair this machine" generates one; afterwards it can be viewed and
copied under Machine → Key, to use the same key on every device ("I already
have a key"). The machine stores about 25 pairings in total, so avoid pairing
again unless needed.

## Layout

| Path | What it is |
|---|---|
| `web/js/protocol.js` | UUIDs, commands and decoding |
| `web/js/transport.js` | Transports: Web Bluetooth, native Bluetooth (iPhone) and simulator |
| `web/js/machine.js` | Connection, pairing and high-level commands |
| `web/js/i18n.js` | UI strings (English and Spanish) |
| `web/js/app.js` | User interface |
| `native/`, `scripts/`, `capacitor.config.json` | iPhone packaging with Capacitor |
| `tools/` | Diagnostics from Linux with Python and `bleak` |
| `.github/workflows/` | Web page deployment and `.ipa` build |

The scripts in `tools/` read the key from `machine-key.txt` (never committed)
and look the machine up by name; `EXPERT_ADDRESS` pins a specific address.

## Credits

The protocol builds on the work of
[bulldog5046/ha_nespresso_integration](https://github.com/bulldog5046/ha_nespresso_integration),
[petergullberg/brewbutton](https://github.com/petergullberg/brewbutton) and
[renaudallard/homeassistant_nespresso_smart](https://github.com/renaudallard/homeassistant_nespresso_smart),
plus the notes below.

## Protocol notes

- The pairing memory is full: the key is accepted but not persisted, so the app
  sends `3a61=01` + key on every connection. The first attempts sometimes fail
  with "Unlikely Error" and need a retry.
- State `3a12` byte1: low nibble = state; bit 5 (0x20) = programming a cup size
  with the button (seen `00 24 ...` while programming hot water).
- After programming a size, the machine notified `c0 00 01 22` on `3a52`.
- Programming hot water to 100 ml from the machine changed no directly readable
  characteristic: dial sizes are only reachable through `3a14`/`3a24` (below).
- Recipe `01 10 <len> <id:2> <ingr> <ml:2> ...`: requires coffee **and** water
  (`01 10 05 ...` with water only → `c1 10 02 34 30`). The 2-byte `id` field
  only accepts `00 00`; any other value (1, 2, 3, 4, 99, or high byte 1)
  → `c1 10 02 36 01` (out of range, parameter 1). 0 ml of coffee is also out of
  range. This command cannot change the dial sizes.
- Responses on `3a52`: `0x80|cmd`, subcmd, length, data. Errors add `0x40`;
  `0x20` = OK, `0x34` = invalid format, `0x36` = out of range (+ parameter index).

## Official app protocol

SDK `com.nestle.connecteddevices.nespresso`. UUID = `06aaXXXX-f22a-11e3-9daa-0002a5d5c51b`.

| Function | Characteristic | Format |
|---|---|---|
| Cup size: select drink | `3a14` (service 1940) | `00 kind` — 0 ristretto, 1 espresso, 2 lungo, 3 americano coffee, 4 americano water, 5 hot water |
| Cup size: ml | `3a24` | read: `ml:2` · write: `ml:2 ff ff` (wait ~600 ms after selecting) |
| Auto power-off | `3a44` | `seconds:2 ff` — 540, 1800, 7200, 28800 |
| Water hardness | `3a44` | `ff ff level` |
| Brew / schedule | `3a42` | `03 05 07 04 delay:4 temp type` — delay in seconds, 0 = now |
| Read schedule | `3a32` | `seconds:4 temp type` (all zeros = nothing scheduled) |
| Cancel | `3a42` | `03 06 01 02` |
| Capsule stock / warning threshold | `3a15` / `3a25` | `n:2` |
| Factory reset | `3a42` | `03 07 00` (unused) |
| Last error | write `00` to `3a13`, read `3a23` | |

Limits (ml): ristretto 15–30, espresso 30–70, lungo 70–130, americano coffee 15–110,
americano water 25–300, hot water 50–300.

Verified on an Expert C80: reading sizes and writing them (hot water 98 → 200).
Scheduling without a capsule answers `24 12` (lever not cycled), same as brewing.
