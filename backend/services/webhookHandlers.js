const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Handles 'products/create' topic
async function handleProductCreate(payload, tenantId) {
  console.log('Processing new product:', payload.title);
  await prisma.product.create({
    data: {
      shopifyProductId: payload.id.toString(),
      title: payload.title,
      vendor: payload.vendor,
      tenantId: tenantId,
    },
  });
}

// Handles 'customers/create' topic
async function handleCustomerCreate(payload, tenantId) {
  console.log('Processing new customer:', payload.email);
  await prisma.customer.upsert({
    where: { shopifyCustomerId: payload.id.toString() },
    update: {
      email: payload.email,
      firstName: payload.first_name,
      lastName: payload.last_name,
    },
    create: {
      shopifyCustomerId: payload.id.toString(),
      email: payload.email,
      firstName: payload.first_name,
      lastName: payload.last_name,
      tenantId: tenantId,
    },
  });
}

// Handles 'orders/create' topic
async function handleOrderCreate(payload, tenantId) {
  console.log('Processing new order:', payload.id);
  const customerData = payload.customer;
  let dbCustomer = null;

  // First, ensure the customer from the order exists in our database
  if (customerData) {
    dbCustomer = await prisma.customer.upsert({
      where: { shopifyCustomerId: customerData.id.toString() },
      update: {
        email: customerData.email,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
      },
      create: {
        shopifyCustomerId: customerData.id.toString(),
        email: customerData.email,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        tenantId: tenantId,
      },
    });
  }

  // Now, create the order and link it to the tenant and customer
  await prisma.order.create({
    data: {
      shopifyOrderId: payload.id.toString(),
      totalPrice: parseFloat(payload.current_total_price),
      financialStatus: payload.financial_status,
      createdAt: new Date(payload.created_at),
      tenantId: tenantId,
      customerId: dbCustomer ? dbCustomer.id : null, // Link to our internal customer ID
    },
  });
}

module.exports = {
  handleProductCreate,
  handleCustomerCreate,
  handleOrderCreate,
};