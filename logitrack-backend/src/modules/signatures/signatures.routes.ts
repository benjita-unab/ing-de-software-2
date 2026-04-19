import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { uploadSignatureController } from './signatures.controller';

const router = Router();

/**
 * POST /api/signatures
 * Headers: Authorization: Bearer <token>
 * Body: application/json { base64: string, rutaId?: string }
 */
router.post('/', authenticate, uploadSignatureController);

export default router;
