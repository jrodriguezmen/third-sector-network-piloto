// El financiador valida o rechaza una entrega; al validar todos los hitos, la línea se cierra.
import { authed } from '../../lib/portal/handler.js';
import { validar } from '../../lib/portal/service.js';

export default authed(validar);
