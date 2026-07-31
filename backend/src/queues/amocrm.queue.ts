import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import { syncApplicationToAmoCrm } from '../services/amocrm.service';

const redisConnection = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword || undefined,
};

export const amocrmQueue = new Queue('amocrm-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export async function enqueueAmoCrmSync(applicationId: string) {
  try {
    await amocrmQueue.add('sync-lead', { applicationId });
    console.log(`📥 Enqueued amoCRM sync for application ${applicationId}`);
  } catch (err) {
    console.log('⚠️ Redis queue fallback: executing inline amoCRM sync');
    await syncApplicationToAmoCrm(applicationId).catch(console.error);
  }
}

// Worker setup
if (process.env.NODE_ENV !== 'test') {
  try {
    const worker = new Worker(
      'amocrm-sync',
      async (job) => {
        const { applicationId } = job.data;
        console.log(`⚙️ Processing amoCRM sync job for ${applicationId}...`);
        await syncApplicationToAmoCrm(applicationId);
      },
      { connection: redisConnection }
    );

    worker.on('completed', (job) => {
      console.log(`✅ amoCRM sync job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ amoCRM sync job ${job?.id} failed: ${err.message}`);
    });
  } catch (e) {
    console.log('⚠️ Redis worker not active, using fallback inline execution');
  }
}
