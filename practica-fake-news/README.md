# Práctica: Reto Big Data — Detección de fake news (UT1)

**Explicación visual tipo "vídeo seminteractivo"** para comprender el razonamiento detrás de cada respuesta de la práctica, no solo memorizarla.

## Cómo usarla

Abre `index.html` en cualquier navegador (no necesita servidor ni dependencias).

Cada escena tiene un **reproductor**: ▶/⏸ reproducir-pausar, ◀▶ avanzar/retroceder paso, ⟲ reiniciar, y puntos para saltar a un paso concreto. Al lado, los paneles de explicación se iluminan sincronizados con la visualización. **Los controles dentro de cada simulación (sliders, botones, selectores) pausan el autoplay** para que puedas experimentar.

## Estructura

```
index.html      — estructura y contenido (respuestas + justificaciones con página de la UT1)
styles.css      — estilos (modo oscuro, responsive)
js/player.js    — motor del reproductor (pasos, autoplay, controles)
js/sims.js      — simulaciones SVG (una por concepto)
js/app.js       — montaje: sidebar, navegación, escenas
```

## Escenas y simulaciones

| Escena | Concepto | Interacción |
|---|---|---|
| 0 · El problema | Por qué es Big Data: saturación de 1 máquina vs clúster (UT1 p. 4, 17–19) | Slider de nodos (scale-out) |
| 1 · Infraestructura | Capas de la arquitectura (UT1 p. 35–36) + batch/streaming + cloud | Pasos animados |
| 2 · Diagrama | Pipeline fuente→cliente, búfer Kafka, teorema CAP (p. 26) | Slider de producción + selector CAP |
| 3 · Datos e IA | Señales→score, reglas vs modelo supervisado | Señales clicables, "mutar bulo" |
| 4 · Decisión | Umbrales, matriz de confusión, coste asimétrico | Sliders umbral/zona gris |
| 5 · Fases | Implantación por fases vs big-bang, métricas | Comparación en gráfico |
| 6 · Repaso | Las 5 Vs conectadas al diseño (UT1 p. 8–14) | Animación de síntesis |

## Honestidad académica

- Las citas `UT1 · p. X` referencian páginas reales del PDF de teoría.
- Lo marcado como **"extra"** (señales concretas de fake news, BERT, Kafka, modo sombra...) es conocimiento adicional de ciencia de datos, **no contenido de la UT1**, y está señalado como tal.
- Las simulaciones son **simplificaciones pedagógicas** (p. ej., el score de la escena 3 es una suma de pesos; un modelo real aprende los pesos del histórico). Las simplificaciones relevantes están declaradas en el propio texto.
