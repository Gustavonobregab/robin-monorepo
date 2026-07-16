# Robin API

API built with Bun and ElysiaJS for managing API keys, usage tracking, and billing.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set environment variables:
```bash
MONGODB_URI=mongodb://localhost:27017/robin
```

3. Run the development server:
```bash
bun run dev
```

## Project Structure

```
src/
├── modules/
│   ├── auth/          # Authentication routes and services
│   ├── keys/          # API key management
│   ├── usage/         # Usage tracking and events
│   ├── billing/       # Billing information
│   └── subscriptions/ # Subscription management
├── config/            # Database configuration
├── middlewares/       # API key validation middleware
└── server.ts          # Main server file
```

## Models

- **API_KEYS**: Manage API keys for users
- **USAGE_EVENTS**: Track individual usage events
- **USAGE_MONTHLY**: Aggregated monthly usage statistics
- **PLANS**: Available subscription plans
- **SUBSCRIPTIONS**: User subscriptions and quotas
