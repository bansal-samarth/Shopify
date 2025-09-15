// register-auth-users.js - Script to register auth users

const registerAuthUser = async (username, password, tenantId) => {
  try {
    const response = await fetch('http://localhost:4000/admin/auth-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
        tenantId
      })
    });
    
    // Check if response is HTML (server error page)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`❌ Server returned HTML instead of JSON for user "${username}". Check if the /admin/auth-user endpoint exists.`);
      return;
    }
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ User "${username}" registered successfully for tenant ${tenantId}:`, result);
    } else {
      console.error(`❌ Failed to register user "${username}" (${response.status}):`, result);
    }
  } catch (error) {
    if (error.message.includes('Unexpected token')) {
      console.error(`❌ Registration failed for user "${username}": Server returned HTML instead of JSON. Make sure the /admin/auth-user endpoint exists on your server.`);
    } else {
      console.error(`❌ Registration failed for user "${username}":`, error.message);
    }
  }
};

// Define your auth users with unique usernames
const authUsers = [
  {
    username: 'admin_tenant1',
    password: 'admin123', // Will be hashed on the server
    tenantId: 1 // 14dgk9-my.myshopify.com
  },
  {
    username: 'manager_tenant1',
    password: 'manager123',
    tenantId: 1 // 14dgk9-my.myshopify.com
  },
  {
    username: 'admin_tenant2',
    password: 'admin456',
    tenantId: 2 // ukqatr-e0.myshopify.com
  },
  {
    username: 'staff_tenant2',
    password: 'staff123',
    tenantId: 2 // ukqatr-e0.myshopify.com
  }
];

// Register all auth users
const registerAllUsers = async () => {
  console.log('🔐 Starting auth user registration...\n');
  
  for (const user of authUsers) {
    await registerAuthUser(user.username, user.password, user.tenantId);
    // Small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Auth user registration process completed!');
};

// Register all users
registerAllUsers();

// Or register individual user:
// registerAuthUser('newuser', 'password123', 1);