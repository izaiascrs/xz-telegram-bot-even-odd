"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopesArrayToObject = exports.generateLoginUrl = exports.getServerConfig = exports.formatTokenScope = exports.getIsBrowser = exports.getAppId = exports.isNotDemoCurrency = exports.getCurrencyObject = exports.domains = void 0;
exports.formatNumber = formatNumber;
exports.replaceBarrierParam = replaceBarrierParam;
const constants_1 = require("./constants");
const CURRENCY_MAP = new Map([
    ['Demo', { icon: 'demo', name: 'Demo' }],
    ['tUSDT', { icon: 'tether', name: 'Tether TRC20' }],
    ['eUSDT', { icon: 'tether', name: 'Tether ERC20' }],
    ['BTC', { icon: 'bitcoin', name: 'Bitcoin' }],
    ['ETH', { icon: 'ethereum', name: 'Ethereum' }],
    ['LTC', { icon: 'litecoin', name: 'Litecoin' }],
    ['USDC', { icon: 'usdcoin', name: 'USD Coin' }],
    ['USD', { icon: 'usdollar', name: 'US Dollar' }],
    ['EUR', { icon: 'euro', name: 'Euro' }],
    ['GBP', { icon: 'gbp', name: 'British Pound' }],
    ['AUD', { icon: 'aud', name: 'Australian Dollar' }],
]);
exports.domains = [
    'localhost:5173'
];
const getCurrencyObject = (currency) => {
    const currencyObject = CURRENCY_MAP.get(currency);
    if (!currencyObject) {
        return {
            icon: 'placeholder_icon',
            name: 'Currency',
        };
    }
    return currencyObject;
};
exports.getCurrencyObject = getCurrencyObject;
const isNotDemoCurrency = (account) => {
    var _a;
    const currency = ((_a = account === null || account === void 0 ? void 0 : account.name) === null || _a === void 0 ? void 0 : _a.includes('VRTC')) ? 'Demo' : account === null || account === void 0 ? void 0 : account.currency;
    return currency;
};
exports.isNotDemoCurrency = isNotDemoCurrency;
/**
 * @description based on the environment which the project is running we must use different appIds, to get the proper redirect url
 * @returns {string} proper appId for the project
 */
const getAppId = () => {
    return constants_1.VERCEL_DEPLOYMENT_APP_ID;
};
exports.getAppId = getAppId;
/**
 * @description use this when you wanna check if the application is running on browser (not ssr)
 * @returns {boolean} true if the application is running in the browser ( not ssr )
 */
const getIsBrowser = () => {
    return typeof window !== 'undefined';
};
exports.getIsBrowser = getIsBrowser;
const formatTokenScope = (tokenScope) => {
    const cleanedTokenScope = tokenScope.replace(/-|_/g, ' ');
    return (cleanedTokenScope[0].toUpperCase() +
        cleanedTokenScope.slice(1).toLowerCase());
};
exports.formatTokenScope = formatTokenScope;
const getServerConfig = () => {
    const isBrowser = (0, exports.getIsBrowser)();
    if (isBrowser) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const config_server_url = localStorage.getItem('config.server_url');
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const config_app_id = localStorage.getItem('config.app_id');
        return {
            serverUrl: config_server_url !== null && config_server_url !== void 0 ? config_server_url : constants_1.DEFAULT_WS_SERVER,
            appId: config_app_id !== null && config_app_id !== void 0 ? config_app_id : (0, exports.getAppId)(),
            oauth: config_server_url !== null && config_server_url !== void 0 ? config_server_url : constants_1.OAUTH_URL,
        };
    }
    return {
        serverUrl: constants_1.DEFAULT_WS_SERVER,
        appId: (0, exports.getAppId)(),
        oauth: constants_1.OAUTH_URL,
    };
};
exports.getServerConfig = getServerConfig;
const generateLoginUrl = (language, oauthUrl, appId, route) => {
    return `https://${oauthUrl}/oauth2/authorize?app_id=${appId}&l=${language}&route=${route}`;
};
exports.generateLoginUrl = generateLoginUrl;
const scopesArrayToObject = (scopes) => {
    const scopesObject = {
        admin: false,
        read: false,
        trade: false,
        trading_information: false,
        payments: false,
    };
    scopes.forEach((scope) => {
        const prop = scope;
        scopesObject[prop] = true;
    });
    return scopesObject;
};
exports.scopesArrayToObject = scopesArrayToObject;
function formatNumber(n, maxFracDigits) {
    const { format } = Intl.NumberFormat('en', {
        maximumFractionDigits: maxFracDigits !== null && maxFracDigits !== void 0 ? maxFracDigits : 2,
    });
    const formattedNum = format(n).replace(',', '');
    return Number(formattedNum);
}
function replaceBarrierParam(barrier) {
    if (barrier.includes('+'))
        return barrier.replace('+', '-');
    return barrier.replace('-', '+');
}
