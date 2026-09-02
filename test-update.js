const http = require('http');

const data = JSON.stringify({
  identifier: "admin@lulabs.com",
  password: "admin123",
  clientType: "Web"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/api/auth/login', // wait, auth controller has version 1. So it's /api/v1/api/auth/login? 
  // Let me just test via the actual frontend or curl manually to be safe.
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
});
// actually I'll just check if the file was created via the frontend!
