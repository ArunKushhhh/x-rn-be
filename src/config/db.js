import mongoose from "mongoose";
import { DB_NAME } from "../constants/db_name.js";

export default async function connectDB() {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log("Connect to DB successfully: ", conn.connection.host);
  } catch (error) {
    console.log("Database connection failed: ", error);
    process.exit(1);
  }
}
