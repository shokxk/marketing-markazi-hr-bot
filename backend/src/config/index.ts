import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  adminPanelUrl: process.env.ADMIN_PANEL_URL || 'http://localhost:3000',

  botToken: process.env.BOT_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || 'marketingmarkazi_hr_bot',
  supportUsername: process.env.SUPPORT_USERNAME || 'HR_MarketingMarkazi',
  hrTelegramGroupId: process.env.HR_TELEGRAM_GROUP_ID || '',

  databaseUrl: process.env.DATABASE_URL || '',

  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || '',

  amocrm: {
    subdomain: process.env.AMOCRM_SUBDOMAIN || '',
    apiDomain: process.env.AMOCRM_API_DOMAIN || 'api-b.amocrm.ru',
    accountId: process.env.AMOCRM_ACCOUNT_ID || '',
    clientId: process.env.AMOCRM_CLIENT_ID || '',
    clientSecret: process.env.AMOCRM_CLIENT_SECRET || '',
    redirectUri: process.env.AMOCRM_REDIRECT_URI || '',
    accessToken: process.env.AMOCRM_ACCESS_TOKEN || '',
    refreshToken: process.env.AMOCRM_REFRESH_TOKEN || '',
    pipelineId: process.env.AMOCRM_PIPELINE_ID || '',
    initialStatusId: process.env.AMOCRM_INITIAL_STATUS_ID || '',
  },

  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    localDir: process.env.STORAGE_LOCAL_DIR || './uploads',
    s3Endpoint: process.env.S3_ENDPOINT || '',
    s3Bucket: process.env.S3_BUCKET || 'candidate-videos',
    s3AccessKey: process.env.S3_ACCESS_KEY || '',
    s3SecretKey: process.env.S3_SECRET_KEY || '',
    s3Region: process.env.S3_REGION || 'us-east-1',
  },

  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_hr_bot_2026',
};
