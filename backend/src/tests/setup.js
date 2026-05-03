import mongoose from 'mongoose';
import 'dotenv/config';

// Connect to a specific TEST database, not your development one
export const connectTestDB = async () => {
  const testUri = process.env.MONGO_URI.replace('bahi-khata', 'bahi-khata-test');
  await mongoose.connect(testUri);
};

export const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
};

export const closeTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};