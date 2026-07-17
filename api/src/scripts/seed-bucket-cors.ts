/* Applies the CORS rules the browser needs for presigned PUT uploads.
   Origins come from CLIENT_URL plus local dev. Run: bun run seed:cors */
import { GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { S3_BUCKET, s3 } from '../config/storage';

const clientUrl = process.env.CLIENT_URL;
if (!clientUrl) {
  console.error('CLIENT_URL is not set');
  process.exit(1);
}

const origins = [
  clientUrl,
  clientUrl.replace('://', '://www.'),
  'http://localhost:3000',
  'http://localhost:3333',
];

await s3.send(
  new PutBucketCorsCommand({
    Bucket: S3_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['content-type'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const applied = await s3.send(new GetBucketCorsCommand({ Bucket: S3_BUCKET }));
console.log('CORS aplicado:', JSON.stringify(applied.CORSRules, null, 1));
process.exit(0);
