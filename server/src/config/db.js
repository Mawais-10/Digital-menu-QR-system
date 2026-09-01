import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';

export async function connectDB() {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string to server/.env');
  }
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  } catch (err) {
    // Node's resolver on Windows sometimes can't answer SRV queries (querySrv ECONNREFUSED)
    // even though the OS resolver can — retry once using public DNS servers.
    const srvIssue = err?.syscall === 'querySrv' || /querySrv/.test(err?.message || '');
    if (!srvIssue) throw err;
    console.warn('[db] SRV DNS lookup failed via system resolver — retrying with public DNS (8.8.8.8 / 1.1.1.1)');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  }
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}
