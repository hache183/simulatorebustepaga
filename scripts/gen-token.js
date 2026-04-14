const crypto = require('crypto');
const email = 'admin@costworkpro.it';
const password = 'CostWork2026!';
const token = crypto.createHash('sha256').update(email + ':' + password + ':costwork-pro-salt').digest('hex');
console.log(token);
