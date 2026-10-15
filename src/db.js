import mongoose from 'mongoose';

export async function connectDB() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') throw new Error('MONGO_URI is required in production');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('portfolio');
    console.log('[db] using in-memory MongoDB (data is lost on restart)');
  }
  await mongoose.connect(uri);
  console.log('[db] connected');
}
