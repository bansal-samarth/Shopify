const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Handles 'products/create' topic
async function handleProductCreate(payload, tenantId) {
  console.log(`Processing new product for tenant ${tenantId}:`, payload.title);
  
  try {
    await prisma.product.upsert({
      where: { 
        shopifyProductId_tenantId: {
          shopifyProductId: payload.id.toString(),
          tenantId: tenantId
        }
      },
      update: {
        title: payload.title,
        vendor: payload.vendor,
      },
      create: {
        shopifyProductId: payload.id.toString(),
        title: payload.title,
        vendor: payload.vendor,
        tenantId: tenantId,
      },
    });
    console.log('✅ Product processed successfully');
  } catch (error) {
    console.error('❌ Error processing product:', error);
    throw error;
  }
}

// Handles 'customers/create' topic
async function handleCustomerCreate(payload, tenantId) {
  console.log(`Processing new customer for tenant ${tenantId}:`, payload.email);
  
  try {
    await prisma.customer.upsert({
      where: { 
        shopifyCustomerId_tenantId: {
          shopifyCustomerId: payload.id.toString(),
          tenantId: tenantId
        }
      },
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
    console.log('✅ Customer processed successfully');
  } catch (error) {
    console.error('❌ Error processing customer:', error);
    throw error;
  }
}

// Handles 'orders/create' topic
async function handleOrderCreate(payload, tenantId) {
  console.log(`Processing new order for tenant ${tenantId}:`, payload.id);
  
  try {
    const customerData = payload.customer;
    let dbCustomer = null;

    // First, ensure the customer from the order exists in our database
    if (customerData) {
      dbCustomer = await prisma.customer.upsert({
        where: { 
          shopifyCustomerId_tenantId: {
            shopifyCustomerId: customerData.id.toString(),
            tenantId: tenantId
          }
        },
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
    await prisma.order.upsert({
      where: {
        shopifyOrderId_tenantId: {
          shopifyOrderId: payload.id.toString(),
          tenantId: tenantId
        }
      },
      update: {
        totalPrice: parseFloat(payload.current_total_price),
        financialStatus: payload.financial_status,
        customerId: dbCustomer ? dbCustomer.id : null,
      },
      create: {
        shopifyOrderId: payload.id.toString(),
        totalPrice: parseFloat(payload.current_total_price),
        financialStatus: payload.financial_status,
        createdAt: new Date(payload.created_at),
        tenantId: tenantId,
        customerId: dbCustomer ? dbCustomer.id : null, // Link to our internal customer ID
      },
    });
    
    console.log('✅ Order processed successfully');
  } catch (error) {
    console.error('❌ Error processing order:', error);
    throw error;
  }
}

// Additional handler for fulfillments/create (since you're receiving these webhooks)
async function handleFulfillmentCreate(payload, tenantId) {
  console.log(`Processing fulfillment for tenant ${tenantId}:`, payload.id);
  
  try {
    // Update the order's fulfillment status if you want to track this
    if (payload.order_id) {
      await prisma.order.updateMany({
        where: {
          shopifyOrderId: payload.order_id.toString(),
          tenantId: tenantId
        },
        data: {
          // You might want to add a fulfillmentStatus field to your Order model
          // fulfillmentStatus: payload.status
        }
      });
    }
    console.log('✅ Fulfillment processed successfully');
  } catch (error) {
    console.error('❌ Error processing fulfillment:', error);
    throw error;
  }
}

module.exports = {
  handleProductCreate,
  handleCustomerCreate,
  handleOrderCreate,
  handleFulfillmentCreate,
};