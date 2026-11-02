// La ONG registra la entrega de un hito; se calcula su huella y se ancla en blockchain.
import { authed } from '../../lib/portal/handler.js';
import { entregar } from '../../lib/portal/service.js';

export default authed(entregar);
