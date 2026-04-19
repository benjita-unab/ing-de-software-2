import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { closeDispatchController } from './dispatch.controller';

const router = Router();

/**
 * POST /api/dispatch/close
 * Headers: Authorization: Bearer <token>
 * Body: application/json { ruta_id: string, firma_url: string }
 */
router.post('/close', authenticate, closeDispatchController);

export default router;
