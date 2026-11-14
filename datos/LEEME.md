# Datos oficiales de ONGD — CONGDE y coordinadoras autonómicas

Descargado el 2 de noviembre de 2026 para 3SN.

## Fichero principal

**`proyectos_ongd_pais_unificado.csv`**: 1.763 filas, una por cada combinación de ONGD, país y fuente.

| Columna | Qué es |
|---|---|
| `fuente` | Quién publica el dato |
| `ambito` | Estatal o comunidad autónoma |
| `edicion` | Año del informe |
| `ongd` | Nombre de la ONGD |
| `pais` | País donde trabaja (o "España") |
| `num_proyectos` | Número de proyectos de esa ONGD en ese país |
| `fondos_eur` | Fondos destinados a ese país, en euros |
| `sectores` | Sectores de intervención, separados por `\|` |
| `poblacion_destinataria` | Colectivos atendidos (mujeres, infancia, etc.), separados por `\|` |

| Ámbito | Edición | ONGD | Países | Proyectos | Fondos (M€) |
|---|---|---|---|---|---|
| Estatal (CONGDE) | 2025 | 67 | 99 | 4.322 | 666,0 |
| Euskadi | 2025 | 69 | 69 | 949 | 87,7 |
| Madrid | 2023 | 32 | 62 | 934 | 131,5 |
| Comunitat Valenciana | 2021 | 34 | 42 | 299 | 20,4 |
| Aragón | 2024 | 46 | 46 | 287 | 12,0 |
| Castilla-La Mancha | 2023 | 25 | 33 | 156 | 5,4 |
| La Rioja | 2023 | 20 | 33 | 109 | 4,3 |
| Región de Murcia | 2021 | 5 | 24 | 71 | 1,1 |

Una misma ONGD puede aparecer en varias fuentes, por ejemplo en la estatal y en la de su comunidad. Por eso no hay que sumar las filas de ámbitos distintos.

## Financiación pública y privada por ONGD (añadido el 8/11/2026)

**`ongd_proyectos_y_financiacion_2024.csv`**: una fila por ONGD, con 72 ONGD de la CONGDE y 74 de Euskadi. Para cada una recoge:
- proyectos y países;
- ingresos totales de 2024 y de 2023;
- financiación pública desglosada: AECID, otros organismos estatales, Unión Europea, comunidades autónomas, entidades locales y organismos internacionales;
- financiación privada desglosada: empresas y fundaciones, particulares y otros.

Resumen de 2024 para las 72 ONGD estatales:

| Concepto | Importe | Notas |
|---|---|---|
| Total de ingresos | 958,3 M€ | Coincide con la cifra oficial del informe |
| Financiación pública | 580,0 M€ (60,5 %) | |
| — AECID | 94,9 M€ | 54 ONGD la reciben |
| — Unión Europea | 151,5 M€ | |
| — Comunidades autónomas | 103,0 M€ | |
| — Entidades locales | 25,6 M€ | |
| — Organismos internacionales | 184,5 M€ | |
| Financiación privada | 378,3 M€ | |
| — Empresas y fundaciones | 108,1 M€ | |

En "empresas y fundaciones" entran las subvenciones, donativos, cuotas, convenios y patrocinios de entidades privadas.

**`financiacion_ongd_detalle.csv`**: el desglose línea a línea de la tabla anterior, con 2.525 filas. Incluye el reparto por comunidad autónoma y los financiadores internacionales que nombra cada ONGD.

Avisos sobre estos datos:
- **Son datos declarados por las propias ONGD** al Informe del Sector.
- **En las grandes redes internacionales**, "entidades privadas" puede incluir fondos de la propia red. Un ejemplo es Oxfam Intermón: 37,5 M€ de sus ingresos son subvenciones de entidades privadas.
- **Euskadi no distingue empresas** en su financiación privada; solo separa particulares de otros ingresos.

## Pendiente: proyectos uno a uno y subvenciones públicas detalladas

Desde el entorno en la nube no hay acceso a estas fuentes. Hay que descargarlas desde el ordenador de José Carlos:
- **BDNS (infosubvenciones.es):** concesiones por beneficiario (convocatoria, órgano concedente, importe y fecha) de todas las administraciones, AECID incluida. Tiene API pública: https://www.infosubvenciones.es/bdnstrans/doc/swagger
- **info@OD (infoaod.maec.es/Analisis):** la Ayuda Oficial al Desarrollo española a nivel de actividad, con agente financiador, ONGD, país, sector e importe.
- **Resoluciones de convocatorias de la AECID** (proyectos, convenios y acción humanitaria) y real decretos de concesión directa en el BOE.

## Resto de ficheros

- **`congde_socias.json`**: directorio de las 100 entidades socias de la CONGDE. Son 76 ONGD, 17 coordinadoras autonómicas y 7 entidades asociadas. Incluye dirección, teléfono, web, email y redes sociales.
- **`congde_informe_2025/`**: datos brutos del Informe del Sector 2025 de la CONGDE. Incluye:
  - proyectos y fondos por país;
  - sectores y población destinataria;
  - presencia y actividades en España;
  - oficinas en terreno;
  - ingresos y gastos por ONGD;
  - base social;
  - forma jurídica y tamaño;
  - líneas de trabajo de las coordinadoras.
- **`euskadi_informe_2025/`**: lo mismo para la Coordinadora de ONGD de Euskadi.
- **`regionales_informe/`**: proyectos por país, sectores y forma jurídica de las otras 6 coordinadoras que publican en el mismo sistema.
- **`red_ongd_madrid_mapa_paises.json`**: mapa de actuación de la Red ONGD Madrid, con 81 países y qué ONGD socias trabajan en cada uno.

## Límites de estos datos

1. **No son fichas de proyectos individuales.** Son agregados por ONGD y país (cuántos proyectos y cuánto dinero), sin título, presupuesto ni fechas de cada proyecto. Los proyectos uno a uno están en las bases públicas de subvenciones: BDNS, AECID y las resoluciones autonómicas y municipales.
2. **Licencia.** La web del informe está bajo Creative Commons BY-NC-SA 4.0, es decir, sin uso comercial. La página de descarga los presenta como "datos en abierto" para consulta o investigación, citando la fuente. Para usarlos dentro de un servicio de pago como 3SN, lo prudente es pedir permiso a la CONGDE (informacion@coordinadoraongd.org).
3. **Coordinadoras sin datos descargables.** No encontré datos para Andalucía, Asturias, Baleares, Canarias, Cantabria, Castilla y León, Cataluña (Lafede), Extremadura, Galicia y Navarra. Valencia tiene además una guía web con 109 fichas de ONGD que no he descargado.
4. **Los fondos por país no son el gasto total.** Ejemplo: Acción contra el Hambre declara 225,3 M€ de gasto en cooperación, pero sus fondos asignados a países suman 168,1 M€.

## Fuentes

- Directorio de socias de la CONGDE: https://coordinadoraongd.org/coordinadora/socias-de-la-red/
- Informe del Sector 2025: https://informedelsector.coordinadoraongd.org/ (datos servidos desde datosinforme.coordinadoraongd.org)
- Informe del sector de Euskadi: https://informedelsector.ongdeuskadi.org/
- Red ONGD Madrid, "Nuestra red": https://www.redongdmad.org/somos/nuestra-red/
