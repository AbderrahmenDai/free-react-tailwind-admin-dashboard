const axios = require('axios'); // Wait, axios is not installed in server. Use fetch.
// Actually, fetch is available in Node 18+. I'll use http if fetch fails, but let's try fetch.

// Polyfill for older node versions if needed, but likely user has modern node.
// I'll use the http module to be safe and dependency-free.

const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length,
      },
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch(e) { resolve(body); }
        } else {
          reject({ statusCode: res.statusCode, body });
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.write(dataString);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch(e) { resolve(body); }
        } else {
          reject({ statusCode: res.statusCode, body });
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function test() {
  try {
    console.log("Attempting login with admin/admin...");
    const loginRes = await post('/api/auth/login', { email: 'admin@galia.com', password: 'admin' });
    console.log("Login successful. Token:", loginRes.token ? "RECEIVED" : "MISSING");
    
    if (loginRes.token) {
      console.log("Fetching OFs...");
      const ofs = await get('/api/of', loginRes.token);
      console.log("OFs fetched successfully. Count:", ofs.length);
      console.log("First OF:", ofs[0] ? ofs[0].numeroOF : "None");
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
