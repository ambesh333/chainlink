import { Router } from 'express';
import {
    listAllPublicResources,
    getPopularResources,
    getPublicResource,
    accessResource,
} from '../controllers/publicResourceController';

const router = Router();

// Public routes — no auth required (for AI agent discovery)

// GET /api/explore - List all active resources with trust scores
router.get('/', listAllPublicResources);

// GET /api/explore/popular - Top resources by transaction count
router.get('/popular', getPopularResources);

// GET /api/explore/:id - Single resource details + payment info
router.get('/:id', getPublicResource);

// GET /api/explore/:id/access - Access resource (returns 402 if paid)
router.get('/:id/access', accessResource);

export default router;
