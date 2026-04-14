import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { upload } from '../../middleware/upload';
import { uploadFileController } from './storage.controller';

const router = Router();

/**
 * POST /api/storage/upload
 * Headers: Authorization: Bearer <token>
 * Body: multipart/form-data { file: <archivo> }
 * Query: ?folder=fotos  (opcional)
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  uploadFileController
);

export default router;
