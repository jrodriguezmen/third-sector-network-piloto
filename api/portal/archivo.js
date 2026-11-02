// Enlace temporal al archivo de una entrega (almacenamiento privado), solo para las partes.
import { authed } from '../../lib/portal/handler.js';
import { archivo } from '../../lib/portal/service.js';

export default authed(archivo);
