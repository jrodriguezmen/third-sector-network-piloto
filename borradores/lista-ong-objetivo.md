# Lista de 30 ONG objetivo para el piloto

*Hecha el 14/11/2026. La tabla completa está en `datos/ong_objetivo_piloto.csv`.*

## Cómo se ha elegido

Punto de partida: las 72 ONGD que declaran ingresos en el Informe del Sector 2025 de la Coordinadora de ONGD (datos de 2024, declarados por las propias organizaciones). Se quedan las que cumplen todo esto:

- **Tamaño medio:** ingresos de 2024 entre 0,3 y 10 millones de euros. Las más grandes ya tienen departamentos de formulación y de alianzas con empresas; las más pequeñas apenas presentan proyectos.
- **Poca financiación de empresas:** las empresas y fundaciones aportan el 10 % o menos de sus ingresos. Son las que más pueden ganar con el portal.
- **Orden:** primero las que tienen sede en Madrid (20) y después el resto (10). Dentro de cada grupo, primero las que más dependen del dinero público.

## Las 30

| # | ONGD | Sede | Ingresos 2024 (M€) | % público | % empresas y fundaciones |
|---|---|---|---|---|---|
| 1 | FAD | Madrid | 3,66 | 100,0 | 0,0 |
| 2 | RESCATE | Madrid | 3,61 | 99,8 | 0,1 |
| 3 | Amigos de la Tierra | Madrid | 0,80 | 99,6 | 0,0 |
| 4 | AIETI | Madrid | 1,29 | 99,3 | 0,0 |
| 5 | Movimiento por la Paz -MPDL- | Madrid | 8,35 | 96,5 | 2,3 |
| 6 | Fundación de Religiosos para la Salud | Madrid | 3,21 | 95,8 | 2,8 |
| 7 | Economistas Sin Fronteras | Madrid | 0,51 | 93,0 | 0,2 |
| 8 | Fundación Promoción Social | Madrid | 4,87 | 92,5 | 0,8 |
| 9 | ONGAWA | Madrid | 2,36 | 87,3 | 4,2 |
| 10 | Paz con Dignidad | Madrid | 3,56 | 86,4 | 0,0 |
| 11 | COPADE | Madrid | 1,17 | 85,4 | 1,7 |
| 12 | Fundación Adsis | Madrid | 2,59 | 83,0 | 0,0 |
| 13 | InteRed | Madrid | 6,53 | 81,9 | 5,7 |
| 14 | Fundación CIDEAL | Madrid | 3,86 | 81,8 | 1,1 |
| 15 | AIDA | Madrid | 6,09 | 80,4 | 0,0 |
| 16 | Fundación Proclade | Madrid | 1,96 | 67,6 | 4,6 |
| 17 | Fundación del Valle | Madrid | 4,88 | 60,0 | 5,3 |
| 18 | SED | Madrid | 3,34 | 53,5 | 5,0 |
| 19 | ADRA | Madrid | 1,54 | 52,9 | 6,1 |
| 20 | Fundación Madreselva | Madrid | 0,33 | 16,3 | 0,0 |
| 21 | Paz y Desarrollo | Málaga | 3,51 | 99,4 | 0,4 |
| 22 | Mujeres en Zona de Conflicto (MZC) | Córdoba | 2,92 | 98,6 | 0,0 |
| 23 | Arquitectura Sin Fronteras | Barcelona | 3,08 | 97,3 | 0,0 |
| 24 | MUNDUBAT | Bilbao | 8,88 | 97,2 | 0,0 |
| 25 | Justicia Alimentaria | Barcelona | 5,08 | 97,2 | 0,0 |
| 26 | Asociación Entrepueblos | Barcelona | 3,56 | 97,2 | 0,0 |
| 27 | Fundación Mainel | Valencia | 1,00 | 91,7 | 0,0 |
| 28 | CERAI | Catarroja (Valencia) | 4,53 | 90,9 | 5,7 |
| 29 | Proyecto Solidario | Málaga | 0,58 | 90,8 | 8,6 |
| 30 | NOVACT | Barcelona | 3,68 | 84,7 | 5,8 |

## Avisos

- La lista ordena por datos, no por facilidad de acceso. Si José Carlos conoce a alguien en alguna, esa pasa delante.
- "Empresas y fundaciones" incluye donativos, convenios, patrocinios y subvenciones de entidades privadas, tal como lo declara cada ONGD.
- El dato de personal del CSV viene del informe tal cual; no está comprobado qué incluye (España, terreno o ambos).
- No se ha comprobado una a una que las webs del directorio sigan activas.
- Aquí no hay nombres ni correos de personas. El contacto concreto de cada organización se busca al preparar cada envío y no se guarda en el repositorio.
- Fuente: Coordinadora de ONGD de España, Informe del Sector 2025 y directorio de socias (licencia CC BY-NC-SA 4.0). Uso interno para decidir a quién escribir; no se publica dentro del producto.

Para rehacer la lista con otros criterios: `python3 hacer_lista_ong_objetivo.py` dentro de `datos/` (los criterios están al principio del archivo).
