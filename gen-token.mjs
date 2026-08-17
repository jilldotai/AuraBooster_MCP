import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';
const token = crypto.randomBytes(20).toString('hex');
console.log(token);
writeFileSync('token.tmp', token, 'utf8');
