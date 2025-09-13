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
  res.send('Multi-tenant Shopify Webhook Server is running!');
});

// Endpoint to register/update webhook secrets for tenants
app.post('/admin/tenant-secret', express.json(), async (req, res) => {
  const { shopDomain, webhookSecret } = req.body;
  
  if (!shopDomain || !webhookSecret) {
    return res.status(400).json({ error: 'shopDomain and webhookSecret are required' });
  }
  
  try {
    const tenant = await prisma.tenant.upsert({
      where: { shopDomain },
      update: { webhookSecret },
      create: { shopDomain, webhookSecret }
    });
    
    res.json({ message: 'Webhook secret updated successfully', tenantId: tenant.id });
  } catch (error) {
    console.error('Error updating tenant secret:', error);
    res.status(500).json({ error: 'Failed to update webhook secret' });
  }
});

// This is the single endpoint for all Shopify webhooks
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
    
    // --- 1. Extract Headers ---
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const topic = req.get('X-Shopify-Topic');
    const body = req.body;

    console.log('🔍 Webhook received:');
    console.log('Shop Domain:', shopDomain);
    console.log('Topic:', topic);

    // Basic validation
    if (!hmacHeader) {
        console.log('❌ No HMAC header found');
        return res.status(401).send('No HMAC header');
    }

    if (!shopDomain) {
        console.log('❌ No shop domain found in headers');
        return res.status(400).send('Missing shop domain');
    }
    
    if (!topic) {
        console.log('❌ No topic found in headers');
        return res.status(400).send('Missing topic');
    }

    if (!body) {
        console.log('❌ No body found');
        return res.status(400).send('No body');
    }

    try {
        // --- 2. Find Tenant and Get Webhook Secret ---
        const tenant = await prisma.tenant.findUnique({
            where: { shopDomain }
        });

        if (!tenant) {
            console.log(`❌ Tenant not found for domain: ${shopDomain}`);
            return res.status(404).send('Tenant not found. Please register this store first.');
        }

        if (!tenant.webhookSecret) {
            console.log(`❌ No webhook secret configured for tenant: ${shopDomain}`);
            return res.status(500).send('Webhook secret not configured for this tenant');
        }

        // --- 3. HMAC Signature Verification ---
        const hash = crypto
            .createHmac('sha256', tenant.webhookSecret)
            .update(body)
            .digest('base64');

        console.log('Generated hash:', hash);
        console.log('Expected hash:', hmacHeader);
        console.log('Hashes match:', hash === hmacHeader);
        
        if (hash !== hmacHeader) {
            console.log(`⚠️ Webhook verification failed for ${shopDomain}: HMAC mismatch.`);
            return res.status(401).send('Unauthorized');
        }
        
        console.log('✅ Webhook Verified for tenant:', shopDomain);

        // --- 4. Parse Payload ---
        let payload;
        try {
            payload = JSON.parse(body.toString());
        } catch (parseError) {
            console.error('❌ Failed to parse JSON payload:', parseError);
            return res.status(400).send('Invalid JSON payload');
        }

        // --- 5. Update Tenant Last Activity ---
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { updatedAt: new Date() }
        });

        console.log(`📊 Processing webhook for tenant ID: ${tenant.id} (${shopDomain})`);

        // --- 6. Route to the Correct Handler based on Topic ---
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
                break;
        }

        // --- 7. Respond to Shopify ---
        console.log('✅ Webhook processed successfully');
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        console.error('Stack trace:', error.stack);
        
        if (error.code === 'P1001' || error.code === 'P1017') {
            res.status(500).send('Database connection error - please retry');
        } else {
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
  console.log(`🚀 Multi-tenant Shopify Webhook Server running on http://localhost:${PORT}`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/webhooks`);
  console.log(`⚙️  Admin endpoint: http://localhost:${PORT}/admin/tenant-secret`);
});