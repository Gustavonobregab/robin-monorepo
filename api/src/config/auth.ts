import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

const baseURL = process.env.BETTER_AUTH_URL;
const clientURL = process.env.CLIENT_URL;

if (!baseURL || !clientURL) {
  throw new Error('BETTER_AUTH_URL and CLIENT_URL must be set');
}

export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection.db as any),
  baseURL,
  clientURL,
  trustedOrigins: [clientURL],
  advanced: {
    cookies: {
      state: {
        attributes: {
          sameSite: 'none',
          secure: true,
        },
      },
      session_token: {
        attributes: {
          sameSite: 'none',
          secure: true,
        },
      },
    },
  },
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
