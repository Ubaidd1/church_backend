import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongodbUri);

  console.log("MongoDB connected");
  return mongoose;
}
