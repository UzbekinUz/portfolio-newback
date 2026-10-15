// Lokal bazadagi ma'lumotlarni (profil, loyihalar, blog...) boshqa bazaga (Atlas) ko'chiradi.
// Ishlatish:  node scripts/copy-db.js <SOURCE_URI> <TARGET_URI>
// Diqqat: TARGET dagi shu kolleksiyalar avval tozalanadi.
import mongoose from 'mongoose';

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error('Usage: node scripts/copy-db.js <SOURCE_URI> <TARGET_URI>');
  process.exit(1);
}

const from = await mongoose.createConnection(src).asPromise();
const to = await mongoose.createConnection(dst).asPromise();

for (const { name } of await from.db.listCollections().toArray()) {
  if (name.startsWith('system.')) continue;
  const docs = await from.db.collection(name).find({}).toArray();
  await to.db.collection(name).deleteMany({});
  if (docs.length) await to.db.collection(name).insertMany(docs);
  console.log(`${name}: ${docs.length}`);
}
await from.close();
await to.close();
console.log('done');
