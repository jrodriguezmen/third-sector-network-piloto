# 3SN · Marco Lógico con IA

Web que genera la **matriz de Marco Lógico** de un proyecto social a partir de una descripción sencilla, y la cobra por proyecto. Está pensada para funcionar sola: sin base de datos, sin cuentas de usuario y sin intervención manual.

## Cómo funciona

1. La ONG rellena el formulario (problema, población, lugar, duración…).
2. **Vista previa gratis** (`/api/preview`, modelo rápido): árbol de problemas, objetivos y resultados.
3. **Pago único** con Stripe Checkout (`/api/checkout`, 49 € por defecto). Stripe cobra y **envía la factura** a la entidad.
4. **Matriz completa** (`/api/generate`, modelo avanzado): indicadores SMART, fuentes de verificación, supuestos, actividades, precondiciones y riesgos, más un **Word (.docx)** en horizontal listo para editar.

Controles sin base de datos:
- Cada pago queda **ligado a un proyecto** (huella de los datos del formulario), así que no se puede pagar uno y generar otro distinto.
- Cada pago permite **3 versiones** del mismo proyecto. El contador se guarda en los metadatos del pago en Stripe. Si la IA falla, la versión no se gasta.
- El resultado se guarda en el navegador de la persona: al recargar la página no se gasta otra versión.

## Códigos de acceso para el piloto

Para que una ONG obtenga la matriz completa **sin pagar**, crea en Vercel la variable `PILOT_CODES` con códigos separados por comas (por ejemplo `ACOGE-2026,VERDE-2026`) y vuelve a desplegar. La ONG hace la vista previa, pulsa **«¿Tienes un código de acceso?»** debajo del precio y escribe su código. Para desactivar un código, quítalo de la lista y vuelve a desplegar. Cada uso queda anotado en los registros de Vercel (`[piloto] generación con código …`).

## Estructura

```
index.html          Página de venta + formulario + vista previa
gracias.html        Página tras el pago: matriz completa y descarga Word
legal.html          Aviso legal y privacidad (COMPLETAR antes de lanzar)
assets/             CSS y JavaScript del navegador
api/preview.js      Vista previa gratis
api/checkout.js     Crea el pago en Stripe
api/generate.js     Comprueba el pago y genera la matriz completa + Word
lib/                Formulario, prompt, Claude, Word y Stripe
test/               Tests (npm test)
```

## Puesta en marcha (unos 30 minutos)

1. **Clave de Claude:** en console.anthropic.com → API Keys, crea una clave y pon un límite de gasto mensual (por ejemplo, 20 €).
2. **Stripe:** crea la cuenta en stripe.com y copia la clave secreta **de prueba** (`sk_test_…`). En Ajustes → Facturas, activa los datos fiscales que aparecerán en las facturas.
3. **Sube el código a GitHub** (este mismo repositorio).
4. **Vercel:** en vercel.com → Add New Project → importa el repositorio. En *Environment Variables* añade las de `.env.example`:
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `SITE_URL` (la URL que te dé Vercel, sin barra final)
   - Opcionales: `PILOT_CODES`, `PRICE_EUR_CENTS`, `MAX_GENERATIONS`, `MODEL_PREVIEW`, `MODEL_FULL`
5. **Prueba en modo test:** genera una vista previa, paga con la tarjeta de prueba `4242 4242 4242 4242` (cualquier fecha futura y CVC) y comprueba que llegan la matriz y el Word.
6. **Pasa a real:** cambia `STRIPE_SECRET_KEY` por la clave `sk_live_…` y vuelve a desplegar.

## Antes de cobrar de verdad (pendiente)

- **Alta fiscal:** para emitir facturas hace falta estar dado de alta como autónomo (o facturar a través de una sociedad). Revisa también el **IVA (21 %)**: decide si los 49 € lo incluyen y configúralo en Stripe (Stripe Tax o el precio con IVA incluido).
- **Completar `legal.html`** con titular, NIF, domicilio y email de contacto (LSSI y RGPD).
- **Dominio propio** y un email de contacto visible.
- Vigilar el gasto de la API en el panel de Anthropic.

## Coste por venta (aproximado)

- IA: unos céntimos por vista previa y por matriz completa.
- Stripe: ~1,5 % + 0,25 € por pago con tarjeta europea.
- Vercel: el plan gratuito sirve para empezar.

## Desarrollo

```bash
npm install
npm test
```

Para probar en local con el entorno de Vercel: `npx vercel dev` (necesita las variables en `.env`).

---

# Portal de proyectos y financiación (`/portal/`)

Las ONG publican **proyectos** con **líneas financiables**, cada una con **hitos** (entregable + porcentaje) y **contrapartidas** para quien financia (vídeos, difusión, voluntariado…). Las empresas eligen una línea y se comprometen; la ONG acepta y se genera un **convenio** (plantilla tipo convenio de colaboración, Ley 49/2002) que firman ambas partes. Después, la ONG registra la **entrega** de cada hito y el financiador la **valida**: así se libera cada tramo y se devenga la **comisión de 3SN**, que solo cobra cuando se valida la contrapartida.

**Registro en blockchain:** la huella SHA-256 del convenio, de la firma de ambas partes, de cada entrega y de cada validación se ancla en Bitcoin mediante **OpenTimestamps** (gratis, sin cartera ni criptomonedas). Cualquiera puede comprobarla en `/portal/verificar.html` y descargar la prueba `.ots` para verificarla en opentimestamps.org.

**Fase actual (MVP sin dinero real):** los pagos se hacen fuera de la plataforma según los hitos validados. Preparado para la siguiente fase: depósito por hitos con un proveedor de pagos autorizado (Mangopay, Lemonway o Stripe Connect) y, opcionalmente, pagos con stablecoin (EURC) mediante contrato inteligente (requiere revisar MiCA). El punto de conexión está en `validar()` de `lib/portal/service.js`.

## Puesta en marcha del portal

1. Crea un proyecto gratuito en **supabase.com** (región Europa).
2. En **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y pulsa **Run**. Crea las tablas, las reglas de seguridad y el almacenamiento privado de entregas.
3. En **Authentication → URL Configuration**, pon como *Site URL* la dirección de tu web (p. ej. `https://third-sector-network-piloto.vercel.app`) y añade `https://…/portal/panel.html` en *Redirect URLs*.
4. En **Project Settings → API** copia la URL, la clave `anon` y la clave `service_role`.
5. En Vercel añade `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y, si quieres, `COMISION_PCT`. Vuelve a desplegar.
6. Entra en `/portal/entrar.html` con dos emails (uno como ONG y otro como empresa) y prueba el flujo completo.

## Seguridad

- Reglas RLS: el público solo ve proyectos publicados; cada ONG solo edita lo suyo; los compromisos y convenios solo los ven las dos partes; los cambios de estado (aceptar, firmar, entregar, validar) solo los hace el servidor.
- Las entregas se guardan en un bucket privado; el financiador accede con enlaces temporales de 10 minutos.
- `test/sql/rls_test.sql` comprueba estas reglas sobre PostgreSQL (16 comprobaciones).

## Aviso

La plantilla de convenio es orientativa. Antes de mover dinero real, revisa con un abogado el convenio, la posible regulación de servicios de pago y la política de privacidad.
