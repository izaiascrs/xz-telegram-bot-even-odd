"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiManager = void 0;
const DerivAPIBasic_1 = __importDefault(require("@deriv/deriv-api/dist/DerivAPIBasic"));
const ws_1 = require("ws");
const websocket_1 = require("../utils/websocket");
const PING_INTERVAL = 20000;
const RECONNECTION_INTERVAL = 5000;
class ApiManager {
    static getInstance() {
        if (!ApiManager.instance) {
            ApiManager.instance = new ApiManager();
        }
        return ApiManager.instance;
    }
    init() {
        if (!this.socket) {
            const { serverUrl, appId } = (0, websocket_1.getServerConfig)();
            this.socket = new ws_1.WebSocket(`wss://${serverUrl}/websockets/v3?app_id=${appId}`);
        }
        this.derivApi = new DerivAPIBasic_1.default({ connection: this.socket });
        this.registerKeepAlive();
    }
    augmentedSend(name, request) {
        return this.derivApi.send(Object.assign({ [name]: 1 }, request));
    }
    augmentedSubscribe(name, request) {
        return this.derivApi.subscribe(Object.assign({ [name]: 1, subscribe: 1 }, request));
    }
    authorize(token) {
        return this.derivApi.authorize({ authorize: token });
    }
    logout() {
        this.derivApi.send({ logout: 1 });
    }
    registerKeepAlive() {
        if (this.pingInterval) {
            const intervalID = this.pingInterval;
            clearInterval(intervalID);
        }
        if (this.reconnectionInterval) {
            const reconnectIntervalId = this.reconnectionInterval;
            clearInterval(reconnectIntervalId);
        }
        this.socket.addEventListener('open', () => {
            this.pingInterval = setInterval(() => {
                this.socket.send(JSON.stringify({ ping: 1 }));
            }, PING_INTERVAL);
        });
        this.socket.addEventListener('close', () => {
            const intervalID = this.pingInterval;
            clearInterval(intervalID);
            this.reconnectionInterval = setInterval(() => {
                const { serverUrl, appId } = (0, websocket_1.getServerConfig)();
                this.reset(appId, serverUrl, true);
            }, RECONNECTION_INTERVAL);
        });
        this.socket.addEventListener('error', () => {
            const intervalID = this.pingInterval;
            clearInterval(intervalID);
        });
    }
    reset(appId, url, registerKeepAlive = false, language) {
        const wsUrl = `wss://${url}/websockets/v3?app_id=${appId}`;
        this.socket = new ws_1.WebSocket(language ? wsUrl + `&l=${language.toUpperCase()}` : wsUrl);
        this.derivApi = new DerivAPIBasic_1.default({ connection: this.socket });
        if (registerKeepAlive) {
            this.registerKeepAlive();
        }
    }
    set connection(newConnection) {
        this.socket = newConnection;
    }
    get connection() {
        return this.socket;
    }
    set api(value) {
        this.derivApi = value;
    }
    get api() {
        return this.derivApi;
    }
}
exports.ApiManager = ApiManager;
const apiManager = ApiManager.getInstance();
apiManager.init();
exports.default = apiManager;
