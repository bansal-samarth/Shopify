# Shopify Multi-Tenant Webhook Backend

A robust Node.js/Express backend service that handles Shopify webhooks for multiple stores (multi-tenancy) with real-time data synchronization to PostgreSQL database.

## 🚀 Features

- **Multi-Tenant Architecture**: Handles multiple Shopify stores with proper data isolation
- **Real-time Webhook Processing**: Processes products/create, customers/create, orders/create, and fulfillments/create webhooks
- **Secure HMAC Verification**: Individual webhook secret verification per tenant
- **Database Synchronization**: Automatic data sync with PostgreSQL using Prisma ORM
- **Graceful Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Production Ready**: Health monitoring, graceful shutdowns, and proper logging

## 🏗️ Architecture

### High-Level Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shopify       │    │   Shopify       │    │   Shopify       │
│   Store A       │    │   Store B       │    │   Store C       │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Webhooks             │ Webhooks             │ Webhooks
          │ (HMAC-A)             │ (HMAC-B)             │ (HMAC-C)
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js Server                            │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │ Webhook         │  │ Multi-Tenant HMAC Verification       │  │
│  │ Endpoint        │  │ - Store webhook secrets per tenant   │  │
│  │ /webhooks       │  │ - Dynamic secret lookup              │  │
│  └─────────────────┘  └──────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Webhook Handlers                               │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│ │
│  │  │ Products    │ │ Customers   │ │ Orders & Fulfillments   ││ │
│  │  │ Handler     │ │ Handler     │ │ Handler                 ││ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Prisma ORM                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │   Tenants   │ │  Customers  │ │  Products   │ │   Orders    │ │
│ │             │ │             │ │             │ │             │ │
│ │ • Shop      │ │ • Multi-    │ │ • Multi-    │ │ • Multi-    │ │
│ │   Domain    │ │   tenant    │ │   tenant    │ │   tenant    │ │
│ │ • Webhook   │ │   isolation │ │   isolation │ │   isolation │ │
│ │   Secret    │ │             │ │             │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Webhook Reception**: Shopify sends webhook to `/webhooks` endpoint
2. **Tenant Identification**: Extract shop domain from `X-Shopify-Shop-Domain` header
3. **Security Verification**: Lookup tenant's webhook secret and verify HMAC signature
4. **Data Processing**: Route webhook to appropriate handler based on topic
5. **Database Sync**: Upsert data with proper tenant isolation using composite unique constraints
6. **Response**: Send 200 OK back to Shopify to acknowledge successful processing

## 📊 Data Models

### Database Schema (Prisma)

```prisma
model Tenant {
  id            Int      @id @default(autoincrement())
  shopDomain    String   @unique // "store.myshopify.com"
  webhookSecret String?  // Store-specific webhook secret
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  customers     Customer[]
  products      Product[]
  orders        Order[]
}

model Customer {
  id                Int      @id @default(autoincrement())
  shopifyCustomerId String   // Shopify's customer ID
  email             String?
  firstName         String?
  lastName          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  tenantId          Int
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  orders            Order[]

  @@unique([shopifyCustomerId, tenantId]) // Composite unique for multi-tenancy
}

model Product {
  id               Int      @id @default(autoincrement())
  shopifyProductId String   // Shopify's product ID
  title            String
  vendor           String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  tenantId         Int
  tenant           Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([shopifyProductId, tenantId]) // Composite unique for multi-tenancy
}

model Order {
  id              Int       @id @default(autoincrement())
  shopifyOrderId  String    // Shopify's order ID
  totalPrice      Decimal   @db.Decimal(10, 2)
  financialStatus String    // "paid", "pending", etc.
  createdAt       DateTime  // From Shopify webhook
  updatedAt       DateTime  @updatedAt

  tenantId        Int
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  customerId      Int?
  customer        Customer? @relation(fields: [customerId], references: [id])

  @@unique([shopifyOrderId, tenantId]) // Composite unique for multi-tenancy
}
```

### Key Design Decisions

1. **Composite Unique Constraints**: `@@unique([shopifyId, tenantId])` ensures the same Shopify ID can exist across different tenants
2. **Tenant-First Architecture**: All queries include `tenantId` for proper data isolation
3. **Flexible Webhook Secrets**: Each tenant can have their own webhook secret stored securely
4. **Upsert Operations**: All webhook handlers use upsert to handle duplicate webhook deliveries gracefully

## 🔧 API Endpoints

### Webhook Endpoints

#### POST `/webhooks`
Receives and processes all Shopify webhooks.

**Headers Required:**
- `X-Shopify-Hmac-Sha256`: HMAC signature for verification
- `X-Shopify-Shop-Domain`: Shop domain (e.g., "store.myshopify.com")
- `X-Shopify-Topic`: Webhook topic (e.g., "products/create")

**Supported Topics:**
- `products/create`: Creates/updates products
- `customers/create`: Creates/updates customers
- `orders/create`: Creates orders and associated customers
- `fulfillments/create`: Updates order fulfillment status

**Response:**
- `200 OK`: Webhook processed successfully
- `401 Unauthorized`: HMAC verification failed
- `404 Not Found`: Tenant not registered
- `422 Unprocessable Entity`: Data processing error
- `500 Internal Server Error`: Database or server error

### Admin Endpoints

#### POST `/admin/tenant-secret`
Registers or updates webhook secret for a tenant.

**Request Body:**
```json
{
  "shopDomain": "store.myshopify.com",
  "webhookSecret": "your-webhook-secret-here"
}
```

**Response:**
```json
{
  "message": "Webhook secret updated successfully",
  "tenantId": 1
}
```

### Health Monitoring

#### GET `/health`
Returns server health status and metrics.

**Response:**
```json
{
  "status": "healthy",
  "uptime": "3600 seconds",
  "requestCount": 1250,
  "timestamp": "2025-09-14T10:30:00.000Z",
  "memory": { "rss": 52428800, "heapUsed": 25165824 },
  "pid": 12345
}
```

#### GET `/ping`
Simple health check endpoint.

**Response:** `pong`

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shopify-webhook-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/shopify_webhooks"
   PORT=4000
   NODE_ENV=development
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev --name "initial-setup"
   npx prisma generate
   ```

5. **Register your Shopify stores**
   ```bash
   # Using the registration script
   node register-tenant.js
   
   # Or using curl
   curl -X POST http://localhost:4000/admin/tenant-secret \
     -H "Content-Type: application/json" \
     -d '{"shopDomain": "your-store.myshopify.com", "webhookSecret": "your-webhook-secret"}'
   ```

6. **Start the server**
   ```bash
   npm start
   ```

## 📋 Assumptions Made

### Technical Assumptions

1. **Database Reliability**: PostgreSQL is available and reliable with proper connection pooling
2. **Webhook Delivery**: Shopify's webhook delivery is generally reliable, but our system handles retries and duplicate deliveries
3. **Tenant Registration**: Store owners will register their webhook secrets through the admin endpoint before webhooks start flowing
4. **Data Consistency**: Shopify webhook order (products before orders) generally ensures referential integrity
5. **Memory Management**: Node.js garbage collection handles memory management adequately for webhook processing volumes

### Business Assumptions

1. **Multi-Store Support**: Each Shopify store is treated as a separate tenant with complete data isolation
2. **Webhook Topics**: Focus on core e-commerce entities (products, customers, orders, fulfillments) covers primary use cases
3. **Data Retention**: All webhook data should be persisted indefinitely for analytics and compliance
4. **Security Model**: HMAC verification per tenant is sufficient for webhook authenticity
5. **Scalability Needs**: Current architecture supports hundreds of concurrent tenants with moderate webhook volume

### Operational Assumptions

1. **Deployment Environment**: Production deployment will have proper load balancing, SSL termination, and database redundancy
2. **Monitoring**: External monitoring services will track server health and webhook processing metrics
3. **Backup Strategy**: Database backups and disaster recovery are handled at infrastructure level
4. **Secret Management**: Webhook secrets are managed securely and rotated periodically


## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: HMAC-SHA256 verification
- **Logging**: Console (production: Winston)


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions, issues, or support:
- Create an issue in the GitHub repository
- Check the health endpoint at `/health` for server status
- Review logs for debugging information
- Use the `/ping` endpoint to verify connectivity

---

**Built with ❤️ for scalable Shopify webhook processing**