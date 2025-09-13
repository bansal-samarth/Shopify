const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  handleProductCreate,
  handleCustomerCreate,
  handleOrderCreate,
  handleFulfillmentCreate,
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
    const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // Debug logging (consider removing in production)
    console.log('🔍 Debug Info:');
    console.log('HMAC Header:', hmacHeader);
    console.log('Body type:', typeof body);
    console.log('Body length:', body ? body.length : 'undefined');
    console.log('Secret exists:', !!shopifySecret);

    // Verify we have all required data
    if (!hmacHeader) {
        console.log('❌ No HMAC header found');
        return res.status(401).send('No HMAC header');
    }

    if (!shopifySecret) {
        console.log('❌ No webhook secret configured');
        return res.status(500).send('Server configuration error');
    }

    if (!body) {
        console.log('❌ No body found');
        return res.status(400).send('No body');
    }

    // Create HMAC hash
    const hash = crypto
      .createHmac('sha256', shopifySecret)
      .update(body)
      .digest('base64');

    console.log('Generated hash:', hash);
    console.log('Expected hash:', hmacHeader);
    console.log('Hashes match:', hash === hmacHeader);
    
    if (hash !== hmacHeader) {
      console.log('⚠️ Webhook verification failed: HMAC mismatch.');
      return res.status(401).send('Unauthorized');
    }
    
    console.log('✅ Webhook Verified');

    // --- 2. Identify Tenant and Topic ---
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const topic = req.get('X-Shopify-Topic');
    
    if (!shopDomain) {
        console.log('❌ No shop domain found in headers');
        return res.status(400).send('Missing shop domain');
    }
    
    if (!topic) {
        console.log('❌ No topic found in headers');
        return res.status(400).send('Missing topic');
    }
    
    console.log('Shop Domain:', shopDomain);
    console.log('Topic:', topic);

    let payload;
    try {
        payload = JSON.parse(body.toString());
    } catch (parseError) {
        console.error('❌ Failed to parse JSON payload:', parseError);
        return res.status(400).send('Invalid JSON payload');
    }

    try {
        // --- 3. Find or Create the Tenant ---
        const tenant = await prisma.tenant.upsert({
            where: { shopDomain: shopDomain },
            update: {
                updatedAt: new Date()
            },
            create: { 
                shopDomain: shopDomain,
            },
        });

        console.log(`📊 Using tenant ID: ${tenant.id} for shop: ${shopDomain}`);

        // --- 4. Route to the Correct Handler based on Topic ---
        console.log(`📨 Processing webhook for topic: ${topic}`);
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
            case 'fulfillments/create':
                await handleFulfillmentCreate(payload, tenant.id);
                break;
            default:
                console.log(`⚠️ Unhandled topic: ${topic}`);
                // Still return 200 to prevent retries for unsupported webhooks
                break;
        }

        // --- 5. Respond to Shopify ---
        console.log('✅ Webhook processed successfully');
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        console.error('Stack trace:', error.stack);
        
        // If it's a database connection error, we might want Shopify to retry
        if (error.code === 'P1001' || error.code === 'P1017') {
            res.status(500).send('Database connection error - please retry');
        } else {
            // For other errors, we might not want retries
            res.status(422).send('Error processing webhook data');
        }
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/webhooks`);
});