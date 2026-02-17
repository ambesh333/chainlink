import { Router } from 'express';
import { accessResource } from '../controllers/gatewayController';

const router = Router();

// x402 Gateway — publicly accessible (no auth required)
// Agents/clients pay via ETH on Sepolia to access resources
router.get('/resource/:resourceId', accessResource);

export default router;
