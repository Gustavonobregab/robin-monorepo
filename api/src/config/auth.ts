import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { PlanModel } from '../modules/plans/plans.model';
import { UserModel } from '../modules/users/users.model';
import { addDays } from 'date-fns';

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
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: true,
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
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const defaultPlan = await PlanModel.findOne({ isDefault: true, active: true }).lean();
          if (!defaultPlan) {
            console.error('[AUTH] No default plan found for new user');
            return;
          }

          const now = new Date();
          await UserModel.findOneAndUpdate(
            { email: user.email },
            {
              $set: {
                plan: defaultPlan._id,
                subscription: {
                  status: 'active',
                  credits: {
                    limit: defaultPlan.credits,
                    used: 0,
                  },
                  currentPeriodStart: now,
                  currentPeriodEnd: addDays(now, 30),
                },
              },
            }
          );
        },
      },
    },
  },
});
