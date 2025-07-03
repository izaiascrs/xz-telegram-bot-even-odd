"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRADES_TO_MONITOR = exports.ADMIN_CHAT_ID = exports.ALLOWED_CHAT_IDS = exports.TELEGRAM_TOKEN = exports.OAUTH_URL = exports.DEFAULT_WS_SERVER = exports.DERIV_TOKEN = exports.LOCALHOST_APP_ID = exports.VERCEL_DEPLOYMENT_APP_ID = exports.STAGING_APP_ID = exports.PRODUCTION_APP_ID = void 0;
exports.PRODUCTION_APP_ID = process.env.DERIV_APP_ID;
exports.STAGING_APP_ID = process.env.DERIV_APP_ID;
exports.VERCEL_DEPLOYMENT_APP_ID = process.env.DERIV_APP_ID;
exports.LOCALHOST_APP_ID = process.env.DERIV_APP_ID;
exports.DERIV_TOKEN = process.env.DERIV_TOKEN;
exports.DEFAULT_WS_SERVER = 'ws.binaryws.com';
exports.OAUTH_URL = 'oauth.deriv.com';
exports.TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
exports.ALLOWED_CHAT_IDS = (process.env.ALLOWED_CHAT_IDS || '')
    .split(',')
    .map(id => Number(id));
exports.ADMIN_CHAT_ID = Number(process.env.ADMIN_CHAT_ID || '0');
exports.TRADES_TO_MONITOR = 25;
