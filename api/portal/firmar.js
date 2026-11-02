// Firma electrónica del convenio por cada parte; con ambas firmas se ancla el contrato firmado.
import { authed } from '../../lib/portal/handler.js';
import { firmar } from '../../lib/portal/service.js';

export default authed(firmar);
