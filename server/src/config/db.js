import mongoose from "mongoose";

export const databaseState = {
  connected: false,
};

export const connectDatabase = async () => {
  const databaseUri = process.env.DATABASE_URI;

  if (!databaseUri) {
    console.warn("DATABASE_URI not provided. Starting in demo fallback mode.");
    databaseState.connected = false;
    return false;
  }

  try {
    await mongoose.connect(databaseUri);
    databaseState.connected = true;
    console.log("Connected to MongoDB.");
    return true;
  } catch (error) {
    console.warn("MongoDB connection failed. Starting in demo fallback mode.");
    console.warn(error.message);
    databaseState.connected = false;
    return false;
  }
};

