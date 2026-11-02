// La ONG acepta o rechaza un compromiso de financiación. Al aceptar se genera el convenio y se ancla.
import { authed } from '../../lib/portal/handler.js';
import { responder } from '../../lib/portal/service.js';

export default authed(responder);
