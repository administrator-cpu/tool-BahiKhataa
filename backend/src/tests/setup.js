import mongoose from 'mongoose';
import 'dotenv/config';

// Tests wipe and drop their database, so they must never touch a real one.
// Use MONGO_URI_TEST if set; otherwise derive it from MONGO_URI (old behaviour).
// Either way, refuse to run unless the connected database name contains "test".
const getTestUri = () => {
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;

  const baseUri = process.env.MONGO_URI || '';
  const derivedUri = baseUri.replace('bahi-khata', 'bahi-khata-test');
  if (!baseUri || derivedUri === baseUri) {
    throw new Error('Refusing to run tests: set MONGO_URI_TEST to a dedicated test database.');
  }
  return derivedUri;
};

const assertTestDatabase = () => {
  const dbName = mongoose.connection.name || '';
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to modify database "${dbName}": test database name must contain "test".`);
  }
};

export const connectTestDB = async () => {
  await mongoose.connect(getTestUri());
  try {
    assertTestDatabase();
  } catch (err) {
    await mongoose.connection.close();
    throw err;
  }
};

export const clearTestDB = async () => {
  assertTestDatabase();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
};

export const closeTestDB = async () => {
  if (mongoose.connection.readyState === 1) {
    assertTestDatabase();
    await mongoose.connection.dropDatabase();
  }
  await mongoose.connection.close();
};
