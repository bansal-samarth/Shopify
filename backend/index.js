const express = require('express');
const crypto = require('crypto');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient, Prisma } = require('@prisma/client');
const cors = require('cors');

const prisma = new PrismaClient();
const { handleProductCreate, handleCustomerCreate, handleOrderCreate } = require('./services/webhookHandlers');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-env';

// --- MIDDLEWARE ---
// Use express.json for all routes except the raw webhook route
app.use(cors());
app.use(express.json());

// --- ROUTES ---
app.get('/', (req, res) => res.send('Multi-tenant Shopify Server is running!'));

// Webhook endpoint requires raw body for HMAC verification
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const topic = req.get('X-Shopify-Topic');
    const body = req.body;

    if (!hmacHeader || !shopDomain || !topic || !body) {
        return res.status(400).send('Missing required Shopify headers or body.');
    }

    try {
        const tenant = await prisma.tenant.findUnique({ where: { shopDomain } });
        if (!tenant || !tenant.webhookSecret) {
            console.log(`Webhook secret not found for tenant: ${shopDomain}`);
            return res.status(401).send('Tenant not configured.');
        }

        const hash = crypto.createHmac('sha256', tenant.webhookSecret).update(body).digest('base64');
        if (hash !== hmacHeader) {
            console.log(`HMAC verification failed for ${shopDomain}`);
            return res.status(401).send('Unauthorized');
        }

        console.log(`✅ Webhook Verified for ${shopDomain}, topic: ${topic}`);
        const payload = JSON.parse(body.toString());

        switch (topic) {
            case 'products/create': await handleProductCreate(payload, tenant.id); break;
            case 'customers/create': await handleCustomerCreate(payload, tenant.id); break;
            case 'orders/create': await handleOrderCreate(payload, tenant.id); break;
            default: console.log(`⚠️ Unhandled topic: ${topic}`); break;
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

// Admin endpoint to create a tenant and set their webhook secret
app.post('/admin/setup-tenant', async (req, res) => {
    const { shopDomain, webhookSecret } = req.body;
    if (!shopDomain || !webhookSecret) return res.status(400).json({ error: 'shopDomain and webhookSecret are required' });
    try {
        const tenant = await prisma.tenant.upsert({
            where: { shopDomain },
            update: { webhookSecret },
            create: { shopDomain, webhookSecret }
        });
        res.json({ message: 'Tenant setup complete', tenant });
    } catch (error) {
        res.status(500).json({ error: 'Failed to set up tenant' });
    }
});

// Admin endpoint to register a user for the dashboard
app.post('/admin/register-user', async (req, res) => {
    const { username, password, tenantId } = req.body;
    if (!username || !password || !tenantId) return res.status(400).json({ error: 'Missing required fields' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const authUser = await prisma.auth.create({
            data: { username, password: hashedPassword, tenantId },
        });
        res.json({ message: 'Auth user registered', userId: authUser.id });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Username already exists for this tenant' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API login endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await prisma.auth.findFirst({ where: { username }, include: { tenant: true } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user.id, tenantId: user.tenantId }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ user: { id: user.id, username, tenantId: user.tenantId, shopDomain: user.tenant.shopDomain }, token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Secured dashboard data endpoint
app.get('/api/dashboard/:tenantId', authenticateToken, async (req, res) => {
    const tenantId = parseInt(req.params.tenantId);
    const { from, to } = req.query;

    if (req.user.tenantId !== tenantId) {
        return res.status(403).json({ message: 'Access denied' });
    }

    // --- FIX IS HERE: We now specify o."createdAt" for Order date filtering ---
    const dateFilterForOrders = (from && to)
        ? Prisma.sql`AND o."createdAt" BETWEEN ${new Date(from)}::timestamp AND ${new Date(to + 'T23:59:59.9Z')}::timestamp`
        : Prisma.empty;
    
    // A separate filter for queries that don't join with the Order table
    const dateFilterForSimpleTables = (from && to)
        ? Prisma.sql`AND "createdAt" BETWEEN ${new Date(from)}::timestamp AND ${new Date(to + 'T23:59:59.9Z')}::timestamp`
        : Prisma.empty;

    try {
        const [statsResult, ordersByDate, revenueByDate, topCustomers, recentProducts] = await prisma.$transaction([
            // This query doesn't join, so a simple date filter is fine
            prisma.$queryRaw`
                SELECT
                    (SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId}) as "totalCustomers",
                    (SELECT COUNT(*) FROM "Product" WHERE "tenantId" = ${tenantId}) as "totalProducts",
                    (SELECT COUNT(*) FROM "Order" WHERE "tenantId" = ${tenantId} ${dateFilterForSimpleTables}) as "totalOrders",
                    (SELECT SUM("totalPrice") FROM "Order" WHERE "tenantId" = ${tenantId} ${dateFilterForSimpleTables}) as "totalRevenue"
            `,
            // Orders by date
            prisma.$queryRaw`
                SELECT DATE("createdAt") as date, COUNT(*) as count FROM "Order"
                WHERE "tenantId" = ${tenantId} ${dateFilterForSimpleTables}
                GROUP BY DATE("createdAt") ORDER BY date ASC
            `,
            // Revenue by date
            prisma.$queryRaw`
                SELECT DATE("createdAt") as date, SUM("totalPrice") as revenue FROM "Order"
                WHERE "tenantId" = ${tenantId} ${dateFilterForSimpleTables}
                GROUP BY DATE("createdAt") ORDER BY date ASC
            `,
            // --- FIX IS HERE: We use the specific date filter for the JOIN ---
            prisma.$queryRaw`
                SELECT c.id, c."firstName", c."lastName", c.email, COUNT(o.id) as "orderCount", SUM(o."totalPrice") as "totalSpent"
                FROM "Customer" c JOIN "Order" o ON c.id = o."customerId"
                WHERE c."tenantId" = ${tenantId} ${dateFilterForOrders}
                GROUP BY c.id ORDER BY "totalSpent" DESC LIMIT 5
            `,
            // Recent products
            prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        ]);

        // --- Data Processing (BigInt/Decimal conversion) ---
        const stats = statsResult[0];
        const processedResponse = {
            totalCustomers: Number(stats.totalCustomers || 0),
            totalProducts: Number(stats.totalProducts || 0),
            totalOrders: Number(stats.totalOrders || 0),
            totalRevenue: parseFloat(stats.totalRevenue || 0),
            ordersByDate: ordersByDate.map(item => ({ ...item, date: item.date, count: Number(item.count) })),
            revenueByDate: revenueByDate.map(item => ({ ...item, date: item.date, revenue: parseFloat(item.revenue) })),
            topCustomers: topCustomers.map(item => ({
                ...item,
                orderCount: Number(item.orderCount),
                totalSpent: parseFloat(item.totalSpent)
            })),
            recentProducts,
        };
        
        res.json(processedResponse);

    } catch (error) {
        console.error('❌ Dashboard data error:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard data.' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));