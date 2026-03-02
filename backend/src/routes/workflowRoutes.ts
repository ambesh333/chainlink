import { Router } from 'express';
import {
    listWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    pauseWorkflow,
    testWorkflow,
    generateWorkflow,
} from '../controllers/workflowController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/workflows/generate - AI-generate workflow (before :id routes)
router.post('/generate', generateWorkflow);

// GET /api/workflows - List all workflows
router.get('/', listWorkflows);

// GET /api/workflows/:id - Get single workflow with executions
router.get('/:id', getWorkflow);

// POST /api/workflows - Create new workflow
router.post('/', createWorkflow);

// PATCH /api/workflows/:id - Update workflow
router.patch('/:id', updateWorkflow);

// DELETE /api/workflows/:id - Delete workflow
router.delete('/:id', deleteWorkflow);

// POST /api/workflows/:id/activate - Activate workflow
router.post('/:id/activate', activateWorkflow);

// POST /api/workflows/:id/pause - Pause workflow
router.post('/:id/pause', pauseWorkflow);

// POST /api/workflows/:id/test - Test-run workflow
router.post('/:id/test', testWorkflow);

export default router;
