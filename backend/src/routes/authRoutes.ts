import { Router } from 'express';
import {
    generateNonce,
    verifySignature,
    getMe,
    setShieldedAddress,
    getPrivateBalance,
    withdrawToEth,
    logout
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// GET /api/auth/me - Check session / get current user
router.get('/me', getMe);

// POST /api/auth/nonce - Generate authentication challenge
router.post('/nonce', generateNonce);

// POST /api/auth/verify - Verify signature and log in
router.post('/verify', verifySignature);

// POST /api/auth/shielded-address - Save user's shielded address
router.post('/shielded-address', authMiddleware, setShieldedAddress);

// POST /api/auth/private-balance - Get user's private token balance
router.post('/private-balance', authMiddleware, getPrivateBalance);

// POST /api/auth/withdraw-eth - Convert private CLAG balance to ETH
router.post('/withdraw-eth', authMiddleware, withdrawToEth);

// POST /api/auth/logout - Clear session
router.post('/logout', logout);

export default router;
