import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@codecraft/database';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const CLAIM_EXPIRATION_QUEUE_NAME = 'claim-expiration-queue';

export const claimQueue = new Queue(CLAIM_EXPIRATION_QUEUE_NAME, {
  connection: redisConnection as any,
});

export interface ClaimExpirationJobData {
  projectId: string;
  techId: string;
}

// Worker to automatically expire abandoned claim holds after 15 minutes
export const claimWorker = new Worker<ClaimExpirationJobData>(
  CLAIM_EXPIRATION_QUEUE_NAME,
  async (job) => {
    const { projectId, techId } = job.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    // If still in CLAIMED status, held by this tech, but not confirmed, release it back to OPEN_FOR_CLAIM
    if (
      project &&
      project.claimedById === techId &&
      !project.isClaimConfirmed &&
      project.status === 'CLAIMED'
    ) {
      console.log(
        `[ClaimQueue] Hold expired for project ${projectId}. Reverting to OPEN_FOR_CLAIM.`
      );
      await prisma.project.update({
        where: { id: projectId },
        data: {
          claimedById: null,
          claimHoldStartedAt: null,
          claimHoldExpiresAt: null,
          status: 'OPEN_FOR_CLAIM',
        },
      });
    }
  },
  { connection: redisConnection as any }
);

/**
 * Schedule delayed job to expire 15-minute hold
 */
export async function scheduleClaimExpiration(
  projectId: string,
  techId: string,
  delayMs: number = 15 * 60 * 1000 // 15 minutes default
) {
  const jobId = `claim-expire-${projectId}-${techId}`;
  await claimQueue.add(
    'expire-hold',
    { projectId, techId },
    {
      jobId,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
}

