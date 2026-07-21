# StadiView · Atlas FC — Demo de boletaje 3D

Demo interactiva de una plataforma de venta de boletos para Atlas FC (Estadio Jalisco), por **Nuclea Solutions**. Combina un flujo de compra con un **estadio en 3D** para ver la vista desde cada asiento antes de comprar.

## 🔗 Demo en vivo

- **Boletaje:** [`/poc/`](https://nuclea-solutions.github.io/stadiview-atlas-demo/poc/) — elige abono o partido, mapa del estadio (2D/3D), selección de asiento, vista 3D y carrito.
- **Estadio 3D:** [`/`](https://nuclea-solutions.github.io/stadiview-atlas-demo/) — estadio interactivo; haz clic en cualquier asiento para ver el partido desde ahí.

## ✨ Qué incluye

- Pantalla de inicio: elegir **Abono** o **Partido** (con lista de próximos partidos y escudos de los rivales).
- Mapa del Estadio Jalisco (9 zonas, precios y disponibilidad).
- Selección de asiento con score de vista y asiento sugerido.
- **Vista 3D desde tu asiento** (modal o pestaña de exploración).
- Identidad Atlas (negro + rojo), precios en pesos, en español, responsive.

## 🚀 Correr en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/` (estadio 3D) y `http://localhost:5173/poc/` (boletaje). Requiere Node 18+.

---

*Prueba de concepto. No procesa pagos reales. Los escudos de clubes se usan con fines de demostración.*
