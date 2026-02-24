/**
 * Trust Score Algorithms for Resources and Users
 *
 * Both scores are normalized to 0-100 scale.
 * New entities start at ~50 (neutral) and move based on actual data.
 */

// =============================================================================
// RESOURCE SCORE (0-100)
// =============================================================================

interface ResourceScoreInput {
    accessCount: number;
    settledDisputes: number;
    activeDisputes: number;
    merchantScore: number;
    createdAt: Date;
    totalTransactions: number;
}

export function calculateResourceScore(input: ResourceScoreInput): number {
    const {
        accessCount,
        settledDisputes,
        activeDisputes,
        merchantScore,
        createdAt,
        totalTransactions,
    } = input;

    // New resource handling — start neutral with slight merchant influence
    if (accessCount < 3) {
        const merchantInfluence = (merchantScore - 50) * 0.2;
        return Math.round(Math.max(30, Math.min(70, 50 + merchantInfluence)));
    }

    const WEIGHT_ACCESS = 0.25;
    const WEIGHT_DISPUTE = 0.40;
    const WEIGHT_MERCHANT = 0.25;
    const WEIGHT_RECENCY = 0.10;

    // Access score (log scale)
    const accessScore = Math.min(100, Math.log10(accessCount + 1) * 43);

    // Dispute score (success-rate based)
    const totalDisputes = settledDisputes + activeDisputes;
    const successfulTransactions = totalTransactions - totalDisputes;
    let disputeScore: number;

    if (totalTransactions === 0) {
        disputeScore = 50;
    } else {
        const successRate = successfulTransactions / totalTransactions;
        disputeScore = Math.max(0, Math.min(100, 50 + (successRate - 0.5) * 100));
    }

    if (activeDisputes > 0) {
        disputeScore = Math.max(0, disputeScore - activeDisputes * 3);
    }

    // Recency score
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore: number;
    if (ageInDays < 7) {
        recencyScore = 100;
    } else if (ageInDays < 30) {
        recencyScore = 100 - (ageInDays - 7) * 1.3;
    } else if (ageInDays < 90) {
        recencyScore = 70 - (ageInDays - 30) * 0.5;
    } else {
        recencyScore = Math.max(20, 40 - (ageInDays - 90) * 0.1);
    }

    const finalScore =
        accessScore * WEIGHT_ACCESS +
        disputeScore * WEIGHT_DISPUTE +
        merchantScore * WEIGHT_MERCHANT +
        recencyScore * WEIGHT_RECENCY;

    return Math.round(Math.max(0, Math.min(100, finalScore)));
}

// =============================================================================
// MERCHANT (USER) SCORE (0-100)
// =============================================================================

interface MerchantScoreInput {
    resourceCount: number;
    totalEarnings: number;
    totalTransactions: number;
    lostDisputes: number;
    createdAt: Date;
}

export function calculateMerchantScore(input: MerchantScoreInput): number {
    const {
        resourceCount,
        totalEarnings,
        totalTransactions,
        lostDisputes,
        createdAt,
    } = input;

    // Grace period for new merchants
    if (totalTransactions < 5) {
        const resourceBonus = Math.min(10, resourceCount * 2);
        const earlyDisputePenalty = lostDisputes * 5;
        return Math.round(Math.max(30, Math.min(60, 50 + resourceBonus - earlyDisputePenalty)));
    }

    const WEIGHT_RESOURCES = 0.15;
    const WEIGHT_EARNINGS = 0.20;
    const WEIGHT_DISPUTES = 0.45;
    const WEIGHT_AGE = 0.20;

    // Resource count score
    let resourceScore: number;
    if (resourceCount <= 2) {
        resourceScore = 30 + resourceCount * 10;
    } else if (resourceCount <= 5) {
        resourceScore = 50 + (resourceCount - 2) * 10;
    } else if (resourceCount <= 10) {
        resourceScore = 80 + (resourceCount - 5) * 4;
    } else {
        resourceScore = 100;
    }

    // Earnings score (log scale, ETH)
    let earningsScore: number;
    if (totalEarnings <= 0) {
        earningsScore = 20;
    } else {
        earningsScore = Math.min(100, 30 + (Math.log10(totalEarnings + 0.1) + 1) * 35);
    }

    // Dispute score (success-rate)
    const successfulTransactions = totalTransactions - lostDisputes;
    let disputeScore: number;
    if (totalTransactions === 0) {
        disputeScore = 50;
    } else {
        const successRate = successfulTransactions / totalTransactions;
        disputeScore = Math.max(0, Math.min(100, 50 + (successRate - 0.5) * 100));
    }

    // Account age score
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    let ageScore: number;
    if (ageInDays < 7) {
        ageScore = 30;
    } else if (ageInDays < 30) {
        ageScore = 30 + (ageInDays - 7) * 0.87;
    } else if (ageInDays < 90) {
        ageScore = 50 + (ageInDays - 30) * 0.42;
    } else if (ageInDays < 180) {
        ageScore = 75 + (ageInDays - 90) * 0.28;
    } else {
        ageScore = 100;
    }

    const finalScore =
        resourceScore * WEIGHT_RESOURCES +
        earningsScore * WEIGHT_EARNINGS +
        disputeScore * WEIGHT_DISPUTES +
        ageScore * WEIGHT_AGE;

    return Math.round(Math.max(0, Math.min(100, finalScore)));
}

// =============================================================================
// SCORE LABEL
// =============================================================================

export function getScoreLabel(score: number): { label: string; color: string } {
    if (score >= 85) return { label: 'Excellent', color: '#22c55e' };
    if (score >= 70) return { label: 'Good', color: '#84cc16' };
    if (score >= 55) return { label: 'Fair', color: '#eab308' };
    if (score >= 40) return { label: 'Caution', color: '#f97316' };
    return { label: 'High Risk', color: '#ef4444' };
}
