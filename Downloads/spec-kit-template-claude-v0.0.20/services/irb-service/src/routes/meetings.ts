import { Router } from 'express';
import { requireRole } from '../middleware/auth';

const router = Router();

// IRB meeting management routes
router.post('/', requireRole(['ADMIN']), (req, res) => {
  res.json({ message: 'Create IRB meeting endpoint - implementation pending' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get IRB meeting endpoint - implementation pending' });
});

export default router;