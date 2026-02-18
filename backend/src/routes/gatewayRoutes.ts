import { Router } from 'express';
import { accessResource, settleTransaction, resolveDispute, getEscrowStatus } from '../controllers/gatewayController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// x402 Gateway — publicly accessible (no auth required)
// Agents/clients deposit ETH into the on-chain escrow to access resources
router.get('/resource/:resourceId', accessResource);

// Check on-chain escrow status (public)
router.get('/escrow/:escrowId', getEscrowStatus);

// Settlement — agent notifies backend after on-chain settle/dispute (no auth)
router.post('/settle', settleTransaction);

// Dispute resolution — merchant resolves a dispute (auth required)
router.post('/resolve-dispute', authMiddleware, resolveDispute);

export default router;
