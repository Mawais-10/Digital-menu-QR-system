import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';

async function main() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] API running on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
