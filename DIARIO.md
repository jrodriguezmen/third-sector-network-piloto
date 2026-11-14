# Diario del agente 3SN

La entrada más reciente va arriba.

## 14/11/2026 (tarde, segunda ejecución) — Posicionamiento y correo a la Coordinadora

La ejecución llegó con el encargo de priorizar posicionamiento, guion y lista de 30 ONG. Guion y lista ya estaban hechos en la ejecución anterior; no se repitieron.

**Hecho:**
- Documento de posicionamiento de una página: `borradores/posicionamiento.md`.
- Borrador de correo a la Coordinadora de ONGD: `borradores/correo-congde.md`. Copia como borrador en Gmail, sin destinatario.

**Comprobado:**
- Las cifras del posicionamiento (60,5 % público, 11,3 % empresas y fundaciones) salen de `datos/LEEME.md` y están recalculadas.
- Lo que dice del producto coincide con el README de `main`.
- Textos releídos.

**Sin hacer o sin comprobar:**
- La web sigue sin poder comprobarse por el mismo motivo (permiso de lectura no concedido). Segundo intento del día.
- Las alternativas citadas (Worldcoo, Fonselp, Donadoo) son solo nombres de una búsqueda; el documento lo avisa.
- El posicionamiento entero es hipótesis hasta la primera conversación.

## 14/11/2026 (tarde) — Preparar las conversaciones con ONG

**Hecho** (todo para la fase 1, que hoy está en 0 de 15 conversaciones):
- Lista de 30 ONG objetivo: `datos/ong_objetivo_piloto.csv`, con el programa que la genera (`datos/hacer_lista_ong_objetivo.py`) y la explicación en `borradores/lista-ong-objetivo.md`.
- Guion de entrevista de 20 minutos con ficha de resultados: `borradores/guion-entrevista-ong.md`.
- Correo a ONG piloto, variante corta y recordatorio: `borradores/correo-ong-piloto.md`. Copia como borrador en Gmail, sin destinatario.

**Comprobado:**
- La lista sale de los datos de la CONGDE ya descargados; revisé a mano los cruces de nombres (corregidos dos: AIDA y la sede de NOVACT). Las 30 cumplen los criterios.
- Textos releídos; quité dos frases que afirmaban cosas no comprobadas.

**Sin hacer o sin comprobar:**
- La web (portada, `/portal/` y `/api/portal/config`) no se pudo comprobar: la herramienta de lectura de páginas no obtuvo permiso en esta ejecución. No lo intenté por otra vía.
- No encontré la herramienta `add_repo`; el repositorio ya estaba disponible y el push a la rama `agente` funcionó.
- No comprobé una a una las webs de las 30 ONG.
- No toqué código: sin poder ver la web no tenía sentido cambiar la portada ni el SEO.
- Los correos no pueden salir hasta que haya firma y códigos de piloto.

## 14/11/2026 — Creación

- Creada esta rama con el manual, el estado inicial y los datos descargados (CONGDE, Euskadi, seis coordinadoras autonómicas y financiación por ONGD).
- Punto de partida: plataforma en producción y conectada a Supabase; ningún usuario real todavía; Stripe en modo de prueba.
