# Crema

Control por Bluetooth para la cafetera **Nespresso Expert**, ahora que la app
oficial ya no la soporta. Funciona como página web (Chrome en la PC, Bluefy en
iPhone) y como app de iPhone.

> Proyecto independiente, sin relación con Nespresso. "Nespresso" y "Expert"
> son marcas de sus dueños y se mencionan sólo para indicar compatibilidad.

## Qué hace

- Estado en vivo: calentando, lista, preparando, en reposo, sin agua,
  descalcificar, palanca abierta.
- Preparar ristretto, espresso, lungo, americano o agua caliente, con
  temperatura baja, media o alta.
- **Programar** una preparación para más tarde: la cafetera la hace sola.
- Recetas a medida (ml de café + ml de agua) y guardarlas.
- **Tamaños de la perilla**: cambiar cuántos ml sirve cada bebida.
- **Apagado automático**: 9 min, 30 min, 2 h u 8 h.
- Contador de cápsulas con aviso de stock bajo.
- Dureza del agua, datos de la máquina y clave de vinculación.

## Usarla

### Página web

<https://cucsijuan.github.io/crema/>

- **PC:** Google Chrome o Edge. En Linux hay que activar
  `chrome://flags/#enable-experimental-web-platform-features`.
- **iPhone:** abrila con el navegador **Bluefy** (Safari no tiene Bluetooth web).

"Probar en modo demo" simula una cafetera para ver la app sin Bluetooth.

### App de iPhone (sideload desde Windows)

Cada cambio en `main` compila un `.ipa` sin firmar con GitHub Actions y lo
publica en [Releases → Última versión](../../releases/tag/latest).

1. Instalá **iTunes** (versión web de Apple, no la de Microsoft Store) e
   **iCloud** en Windows, y después [Sideloadly](https://sideloadly.io/).
2. Conectá el iPhone por cable y confiá en la computadora.
3. Arrastrá `Crema.ipa` a Sideloadly, poné tu Apple ID y tocá **Start**.
4. En el iPhone: Ajustes → General → VPN y gestión de dispositivos → confiá en
   tu Apple ID. En iOS 16 o superior también hay que activar
   Ajustes → Privacidad y seguridad → **Modo desarrollador**.

Con un Apple ID gratuito la app dura **7 días**; después se vuelve a instalar
igual (Sideloadly puede renovarla solo si queda abierto).

### Local

```bash
npm run serve
```

y abrir <http://localhost:8765>.

## Clave de vinculación

La cafetera sólo acepta comandos de quien le presenta una clave de 8 bytes. La
primera vez, "Vincular esta cafetera" genera una; después se ve y se copia en
Máquina → Clave, para usar la misma en todos los dispositivos ("Ya tengo una
clave"). La máquina guarda unas 25 vinculaciones en total: no vincules de nuevo
si no hace falta.

## Estructura

| Ruta | Qué es |
|---|---|
| `web/js/protocol.js` | UUIDs, comandos y decodificación |
| `web/js/transport.js` | Transportes: Web Bluetooth, Bluetooth nativo (iPhone) y simulador |
| `web/js/machine.js` | Conexión, vinculación y comandos de alto nivel |
| `web/js/app.js` | Interfaz |
| `native/`, `scripts/`, `capacitor.config.json` | Empaquetado como app de iPhone con Capacitor |
| `tools/` | Diagnóstico desde Linux con Python y `bleak` |
| `.github/workflows/` | Publicación de la página y compilación del `.ipa` |

Las herramientas de `tools/` leen la clave de `clave-cafetera.txt` (no se sube
al repo) y buscan la cafetera por nombre; con `EXPERT_ADDRESS` se puede fijar la
dirección.

## Créditos

El protocolo se basa en el trabajo de
[bulldog5046/ha_nespresso_integration](https://github.com/bulldog5046/ha_nespresso_integration),
[petergullberg/brewbutton](https://github.com/petergullberg/brewbutton) y
[renaudallard/homeassistant_nespresso_smart](https://github.com/renaudallard/homeassistant_nespresso_smart),
más lo documentado abajo.

## Notas de protocolo

- La memoria de vinculaciones está llena: la clave se acepta pero no se guarda,
  así que la app manda `3a61=01` + clave en cada conexión. Los primeros intentos
  a veces fallan con "Unlikely Error"; hay que reintentar.
- Estado `3a12` byte1: nibble bajo = estado; bit 5 (0x20) = programando un
  tamaño de taza con el botón (visto `00 24 ...` mientras se programaba agua caliente).
- Al terminar de programar el tamaño la máquina notificó en `3a52`: `c0 00 01 22`.
- Programar el agua caliente a 100 ml no cambió ninguna característica legible
  (ver `snapshots/base.json` vs `snapshots/agua100.json`): los tamaños de la
  perilla no se exponen por lectura directa.
- Receta `01 10 <len> <id:2> <ingr> <ml:2> ...`: requiere café **y** agua
  (`01 10 05 ...` sólo con agua → `c1 10 02 34 30`). El campo `id` de 2 bytes
  sólo acepta `00 00`; cualquier otro valor (1, 2, 3, 4, 99, o el byte alto en 1)
  → `c1 10 02 36 01` (fuera de rango, parámetro 1). Café 0 ml también da fuera de rango.
  Conclusión: este comando no sirve para cambiar los tamaños de la perilla.
- Respuestas en `3a52`: `0x80|cmd`, subcmd, largo, datos. Con error se suma `0x40`;
  `0x20` = OK, `0x34` = formato inválido, `0x36` = fuera de rango (+ índice del parámetro).

## Protocolo de la app oficial

SDK `com.nestle.connecteddevices.nespresso`. UUID = `06aaXXXX-f22a-11e3-9daa-0002a5d5c51b`.

| Función | Característica | Formato |
|---|---|---|
| Tamaño de taza: elegir bebida | `3a14` (servicio 1940) | `00 kind` — 0 ristretto, 1 espresso, 2 lungo, 3 americano café, 4 americano agua, 5 agua caliente |
| Tamaño de taza: ml | `3a24` | leer: `ml:2` · escribir: `ml:2 ff ff` (esperar ~600 ms tras elegir) |
| Apagado automático | `3a44` | `segundos:2 ff` — 540, 1800, 7200, 28800 |
| Dureza del agua | `3a44` | `ff ff nivel` |
| Preparar / programar | `3a42` | `03 05 07 04 retardo:4 temp tipo` — retardo en segundos, 0 = ahora |
| Leer programación | `3a32` | `segundos:4 temp tipo` (todo 0 = nada programado) |
| Cancelar | `3a42` | `03 06 01 02` |
| Stock de cápsulas / umbral de aviso | `3a15` / `3a25` | `n:2` |
| Restablecer de fábrica | `3a42` | `03 07 00` (no usado) |
| Último error | escribir `00` en `3a13`, leer `3a23` | |

Límites (ml): ristretto 15–30, espresso 30–70, lungo 70–130, americano café 15–110,
americano agua 25–300, agua caliente 50–300.

Verificado en una Expert C80: lectura de tamaños y escritura (agua caliente 98 → 200).
Programar sin cápsula responde `24 12` (palanca no ciclada), igual que preparar.
