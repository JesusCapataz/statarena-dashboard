---
inclusion: always
---

# StatArena — Sistema de diseño y reglas de UI (obligatorio)

Todo panel, pantalla o componente nuevo del producto **DEBE** seguir estas reglas.
Sintetizan las 5 skills instaladas en `.kiro/skills/` (frontend-design,
frontend-design-principles, frontend-design-review, frontend-ui-dark-ts, theme-factory).

## Principio rector
Estética **editorial / de difusión deportiva** (referencias: FotMob, Opta, Sofascore).
Denso en datos, intencional, con carácter. **Nunca** debe parecer una plantilla
genérica de IA.

## No hacer (señales de "AI genérico")
- Fuentes de sistema/genéricas (Inter, Roboto, Arial) como display.
- Degradados morado→teal, glassmorphism por todas partes, tarjetas "Pro ★".
- Emojis decorativos en la UI de producto.
- Esquinas muy redondeadas en todo; sombras/glow excesivos.
- Color sin significado.

## Tipografía
- Display / UI: **Archivo** (400–900).
- Numerales / marcadores: **Barlow Condensed** y **Barlow Semi Condensed**
  (`--font-num`, `--font-cond`), siempre con `font-variant-numeric: tabular-nums`.

## Color (solo cuando comunica)
- Léxico de dominio: `--floodlight` (acento acción), `--pitch` (positivo),
  `--card-yellow` (aviso), `--card-red` (negativo), `--kickoff` (info).
- Un único acento por tema. Estados semánticos para W/D/L y deltas.
- Tokens leídos por JS (`--brand`, `--accent`, `--win`, etc.) deben ser **literales**
  en cada bloque de tema (getComputedStyle no resuelve cadenas de `var()` de forma fiable).

## Temas (theme-factory)
4 temas vía `data-theme`: `dark` (Floodlight), `terminal`, `cobalt`, `light` (Broadcast).
Cada tema declara TODO el set de tokens, incluido el acento, con `color-scheme`.

## Estados obligatorios (frontend-design-review)
Cada vista/feature interactiva debe incluir: **hover, focus-visible, loading
(skeleton), empty, error**. Navegación completa por teclado (`:focus-visible`
visible, `Esc`, `Enter`, `tabindex`/`role` en elementos no nativos).

## Profundidad y movimiento
- Atmósfera sutil (grano + halos radiales de fondo), sin saturar.
- Reveal escalonado en carga; transiciones 120–200ms; respeta `prefers-reduced-motion`.

## Confianza (pilar "trustworthy")
- Escudos/fotos reales vía CDN del proveedor, con fallback a monograma con color del club.
- Disclaimer visible cuando los datos sean simulados o generados.

## Datos
- La UI consume SIEMPRE un shape interno estable (api-client). Cambiar de fuente
  (demo ↔ backend real) no cambia los componentes.
