import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './context';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

import { startSettlementListener } from './services/settlementListener';
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';
import gatewayRoutes from './routes/gatewayRoutes';
import exploreRoutes from './routes/exploreRoutes';
import disputeRoutes from './routes/disputeRoutes';
import creWebhookRoutes from './routes/creWebhookRoutes';

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    exposedHeaders: [
        'X-Receipt-Code', 'X-Auto-Settle-At', 'X-Transaction-ID',
        'X-Payment-Required', 'X-Payment-Amount', 'X-Payment-Token',
        'X-Payment-Network', 'X-Resource-ID', 'X-Escrow-Id', 'X-Escrow-Contract',
    ],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased for base64 image uploads

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/gateway', gatewayRoutes);
app.use('/api/explore', exploreRoutes);  // Public routes for AI agent discovery
app.use('/api/disputes', disputeRoutes); // AI dispute resolution
app.use('/api/cre', creWebhookRoutes);  // CRE workflow webhooks (public, read-only)

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Chainlink Agent Backend running on port ${PORT}`);

    // Settlement finalization is now handled by the CRE settlement-verifier workflow.
    // startSettlementListener();
});

// Handle shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit();
});
