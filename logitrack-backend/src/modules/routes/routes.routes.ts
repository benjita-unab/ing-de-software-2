import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getRouteController } from './routes.controller';

const router = Router();

/**
 * GET /api/routes/:id
 * Headers: Authorization: Bearer <token>
 */
router.get('/:id', authenticate, getRouteController);

export default router;
