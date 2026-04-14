import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { createEventController } from './trazabilidad.controller';

const router = Router();

/**
 * POST /api/trazabilidad
 * Headers: Authorization: Bearer <token>
 * Body: application/json (ver CreateTraceabilityEventDto)
 */
router.post('/', authenticate, createEventController);

export default router;
