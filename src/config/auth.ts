import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.db as any),
  baseURL: "http://localhost:3000/api/auth",
  clientURL: "http://localhost:3333",
  trustedOrigins: [
    "http://localhost:3333",
    "http://localhost:3000"
  ],
  socialProviders: {
    google: {
      clientId: googleId as string,
      clientSecret: googleSecret as string,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    modelName: "users",
  }
});
