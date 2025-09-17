import { Router } from 'express';
import { requireRole } from '../middleware/auth';

const router = Router();

// Compliance monitoring routes
router.get('/metrics', requireRole(['ADMIN', 'PRINCIPAL_INVESTIGATOR']), (req, res) => {
  res.json({ message: 'Compliance metrics endpoint - implementation pending' });
});

router.get('/dashboard', requireRole(['ADMIN', 'PRINCIPAL_INVESTIGATOR']), (req, res) => {
  res.json({ message: 'Compliance dashboard endpoint - implementation pending' });
});

export default router;