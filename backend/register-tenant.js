// register-tenant.js - Script to register tenant webhook secrets

const registerTenant = async (shopDomain, webhookSecret) => {
  try {
    const response = await fetch('http://localhost:4000/admin/tenant-secret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopDomain,
        webhookSecret
      })
    });
    
    const result = await response.json();
    console.log('Registration result:', result);
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Register your tenants
const tenants = [
  {
    shopDomain: '14dgk9-my.myshopify.com',
    webhookSecret: '2c269155d46e9d18241ea4f4c3fe26c1e9534fee14a829509c9f00d5a8d9443b'
  },
  {
    shopDomain: 'ukqatr-e0.myshopify.com',
    webhookSecret: 'b044893456861f42dcc85e2ef02a98d3873e0621d615bd3ecbbbbc2984ebcdbb'
  }
];

// Register all tenants
tenants.forEach(tenant => {
  registerTenant(tenant.shopDomain, tenant.webhookSecret);
});

// Or register individual tenant:
// registerTenant('14dgk9-my.myshopify.com', 'your_actual_webhook_secret');