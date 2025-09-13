const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  handleProductCreate,
  handleCustomerCreate,
  handleOrderCreate,
} = require('./services/webhookHandlers');

const app = express();

// A simple health check route
app.get('/', (req, res) => {
  res.send('Server is alive and running!');
});

// This is the single endpoint for all Shopify webhooks
// IMPORTANT: We use express.raw to get the raw request body, which is required for HMAC verification.
// This must come BEFORE any other body-parsing middleware like express.json().
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
    
    // --- 1. HMAC Signature Verification ---
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body;
    const shopifySecret = process.env.SHOPIFY_API_SECRET;

    const hash = crypto
      .createHmac('sha256', shopifySecret)
      .update(body, 'utf8')
      .digest('base64');
    
    if (hash !== hmacHeader) {
      console.log('⚠️ Webhook verification failed: HMAC mismatch.');
      return res.status(401).send('Unauthorized');
    }
    console.log('✅ Webhook Verified');

    // --- 2. Identify Tenant and Topic ---
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const topic = req.get('X-Shopify-Topic');
    const payload = JSON.parse(body.toString());

    try {
        // --- 3. Find or Create the Tenant ---
        const tenant = await prisma.tenant.upsert({
            where: { shopDomain: shopDomain },
            update: {},
            create: { shopDomain: shopDomain },
        });

        // --- 4. Route to the Correct Handler based on Topic ---
        console.log(`Received webhook for topic: ${topic}`);
        switch (topic) {
            case 'products/create':
                await handleProductCreate(payload, tenant.id);
                break;
            case 'customers/create':
                await handleCustomerCreate(payload, tenant.id);
                break;
            case 'orders/create':
                await handleOrderCreate(payload, tenant.id);
                break;
            default:
                console.log(`Unhandled topic: ${topic}`);
                break;
        }

        // --- 5. Respond to Shopify ---
        // It's crucial to send a 200 OK response quickly
        res.status(200).send('OK');

    } catch (error) {
        console.error('Error processing webhook:', error);
        // If an error occurs, send a 500 status code. Shopify will then retry the webhook.
        res.status(500).send('Error processing webhook');
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});