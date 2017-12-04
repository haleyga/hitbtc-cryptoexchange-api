import * as axiosDefault from 'axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { parseErrorsFromMarkup } from 'tslint/lib/verify/parse';

/**
 * Just an alias.
 */
const axios = axiosDefault.default;

/**
 * Default configuration.
 */
const defaultConfig = {
    rootUrl: `https://api.hitbtc.com/api/2`,
    timeout: 3000,
};

/**
 * Default HTTP agent configuration.
 */
const defaultAgentConfig = {
    baseURL: defaultConfig.rootUrl,
    headers: {
        'Content-Type': 'application/json',
        'User-Agent'  : `HitBTC API Client (hitbtc-cryptoexchange-api node package)`,
    },
    method : 'GET',
    timeout: defaultConfig.timeout,
};

/**
 * The public agent is essentially an alias for the default configuration.
 *
 * @type {{}}
 */
const publicAgentConfig = {
    ...defaultAgentConfig,
};

/**
 * The private agent begins life the same as the public agent, but with 'POST' specified.
 *
 * @type {{method: string}}
 */
const privateAgentConfig = {
    ...defaultAgentConfig,
    method: 'POST',
};

/**
 * The post body shape.
 */
export interface IPostBody {
    [key: string]: string | number | boolean;
}

/**
 * The query string object shape.
 */
export interface IQueryParams {
    [key: string]: string | number | boolean;
}

export type IPaginationParams = { before?: string; after?: string, limit?: string };

/**
 * This function is exported so that a user can experiment with/understand how HitBTC wants requests to be signed.
 * Essentially, for user edification ;).
 *
 * @param {string} privateKey
 * @param {string} path
 * @param method
 * @param {{}} body
 * @returns {ISignature}
 */
export const signMessage = (privateKey: string, path: string, method: string, body?: IPostBody): ISignature => {

    //tslint:disable:no-magic-numbers
    const timestamp = Date.now() / 1000;
    //tslint:enable:no-magic-numbers

    // Decrypt the private key.
    const key = new Buffer(privateKey, 'base64');

    // Create the hmac.
    const hmac = crypto.createHmac('sha256', key);

    // Build a string to hash.
    const prehash = body ?
                    `${timestamp}${method.toUpperCase()}${path}${JSON.stringify(body)}` :
                    `${timestamp}${method.toUpperCase()}${path}`;

    // Generate the hmac digest in base64.
    const digest = hmac.update(prehash).digest('base64');

    // Return the digest and the timestamp used in the hmac hash.
    return { digest, timestamp };
};

/**
 * Shape of signature object.
 */
export type ISignature = { digest: string; timestamp: number; };

/**
 * Convenient container for API keys.
 */
export type IApiAuth = { publicKey: string; privateKey: string; passphrase: string; };

/**
 * The shape of a raw request forwarding agent.
 */
export interface IRawAgent {
    auth?: IApiAuth;

    deleteFromPrivateEndpoint(endpoint: string,
                              queryParams?: IQueryParams,
                              config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    isUpgraded(): boolean;

    getFromPrivateEndpoint(endpoint: string,
                           queryParams?: IQueryParams,
                           config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    getPublicEndpoint(endpoint: string,
                      queryParams?: IQueryParams,
                      config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    patchToPrivateEndpoint(endpoint: string, data?: IPostBody, config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    postToPrivateEndpoint(endpoint: string, data?: IPostBody, config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    putToPrivateEndpoint(endpoint: string, data?: IPostBody, config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    signMessage(privateKey: string, path: string, method: string, body?: IPostBody): ISignature;

    upgrade(newAuth: IApiAuth): void;
}

/**
 * Factory function to get a new HitBTC client.
 *
 * @param {IApiAuth} auth
 * @returns {IRawAgent}
 */
const getRawAgent = (auth?: IApiAuth): IRawAgent => ({

    /**
     * This holds the user's API keys.
     */
    auth,

    /**
     * Deletes/removes/cancels from private (authenticated) endpoints.
     *
     * @param {string} endpoint
     * @param {IQueryParams} queryParams
     * @param config
     * @returns {Promise<IHitBtcResponse>}
     */
    async deleteFromPrivateEndpoint(endpoint: string,
                                    queryParams?: IQueryParams,
                                    config: IHitBtcRequestConfig = null): Promise<IHitBtcResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/${endpoint}?${qs.stringify(queryParams)}`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (Key and Sign)
        const headers = {
            ...privateAgentConfig.headers,
            ...headersOverride,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, method: 'DELETE', url: uri, ...config };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    /**
     * Fetches data from private (authenticated) endpoints.
     *
     * @param {string} endpoint
     * @param queryParams
     * @param config
     * @returns {Promise<IHitBtcResponse>}
     */
    async getFromPrivateEndpoint(endpoint: string,
                                 queryParams?: IQueryParams,
                                 config: IHitBtcRequestConfig = null): Promise<IHitBtcResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/${endpoint}?${qs.stringify(queryParams)}`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (Key and Sign)
        const headers = {
            ...privateAgentConfig.headers,
            ...headersOverride,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, method: 'GET', url: uri, ...config };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    /**
     * Fetches data from public (unauthenticated) endpoints.
     *
     * @param {string} endpoint
     * @param {{}} queryParams
     * @param config
     * @returns {Promise<IHitBtcResponse>}
     */
    async getPublicEndpoint(endpoint: string,
                            queryParams?: IQueryParams,
                            config: IHitBtcRequestConfig = null): Promise<IHitBtcResponse> {

        // The uri is a relative path to the publicAgentConfig baseUrl
        const uri = `/${endpoint}?${qs.stringify(queryParams)}`;

        // Construct the actual config to be used
        const agentConfig = { ...publicAgentConfig, url: uri, ...config };

        try {
            // Send the request.
            const response = await axios(agentConfig);

            // Finally, return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    async patchToPrivateEndpoint(endpoint: string,
                                 data?: IPostBody,
                                 config: IHitBtcRequestConfig = null): Promise<IHitBtcResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/${endpoint}`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (Key and Sign)
        const headers = {
            ...privateAgentConfig.headers,
            ...headersOverride,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, url: uri, method: 'PATCH', data, ...config };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    /**
     * Posts to private (authenticated) endpoints.  If no API keys have been provided, this function will fail.
     *
     * @param {string} endpoint
     * @param {IPostBody} data
     * @param config
     * @returns {Promise<IHitBtcResponse>}
     */
    async postToPrivateEndpoint(endpoint: string,
                                data?: IPostBody,
                                config: IHitBtcRequestConfig = null): Promise<IHitBtcResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/${endpoint}`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (Key and Sign)
        const headers = {
            ...privateAgentConfig.headers,
            ...headersOverride,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, url: uri, method: 'POST', data, ...config };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    async putToPrivateEndpoint(endpoint: string,
                               data?: IPostBody,
                               config?: IHitBtcRequestConfig): Promise<IHitBtcResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const uri = `/${endpoint}`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (Key and Sign)
        const headers = {
            ...privateAgentConfig.headers,
            ...headersOverride,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, url: uri, method: 'PUT', data, ...config };

        try {
            const response = await axios(agentConfig);

            // Finally, send the request and return the response
            return Promise.resolve(response);
        } catch (err) {
            const rejectionReason = err.response.data.error || err.response.data || err.response || err;

            return Promise.reject(rejectionReason);
        }
    },

    /**
     * Include the exported #signMessage function for convenience.
     */
    signMessage,

    /**
     * Checks if the user has supplied API keys.
     *
     * @returns {boolean}
     */
    isUpgraded(): boolean { return this.auth; },

    /**
     * Upgrades a client with new credentials.
     *
     * @param {IApiAuth} newAuth
     */
    upgrade(newAuth: IApiAuth): void { this.auth = newAuth; },
});

//<editor-fold desc="models">

export type ICurrency = {
    id: string;
    fullName: string;
    crypto: boolean;
    payinEnabled: boolean;
    payinPaymentId: boolean;
    payinConfirmations: number;
    payouEnabled: boolean;
    payoutIsPaymentId: boolean;
    transferEnabled: boolean;
};

export type IBalance = {
    currency: string;
    available: string;
    reserved: string;
};

export type ITicker = {
    symbol: string;
    ask: string;
    bid: string;
    last: string;
    low: string;
    high: string;
    open: string;
    volume: string;
    volumeQuote: string;
    timestamp: string;
};

export type IPublicTrade = {
    id: number;
    price: string;
    quantity: string;
    side: string;
    timestamp: string;
};

export type IEntry = {
    price: string;
    size: string;
};

export type IOrderBook = {
    asks: IEntry[];
    bids: IEntry[];
    timestamp: string;
};

export type ITradingFee = {
    takeLiquidityRate: string;
    provideLiquidityRate: string;
};

export type ISymbol = {
    id: string;
    baseCurrency: string;
    quoteCurrency: string;
    quantityIncrement: string;
    tickSize: string;
    takeLiquidityRate: string;
    provideLiquidityRate: string;
    feeCurrency: string;
};

export type IOrder = {
    id: number;
    clientOrderId: string;
    symbol: string;
    side: string;
    status: string; // new, suspended, partiallyFilled, filled, canceled, expired
    type: string; // limit, market, stopLimit, stopMarket
    timeInForce: string; // GTC, IOC, FOK, Day, GTD
    quantity: string;
    price: string;
    cumQuantity: string;
    createdAt: string;
    updatedAt: string;
    stopPrice: string;
    expireTime: string;
    tradesReport: ITradesReport;
};

export type ITradesReport = {
    id: number;
    quantity: string;
    price: string;
    fee: string;
    timestamp: string;
};

export type ITrade = {
    id: number;
    clientOrderId: string;
    orderId: string;
    symbol: string;
    side: string;
    quantity: string;
    fee: string;
    price: string;
    timestamp: string;
};

export type ITransaction = {
    id: string;
    index: string;
    currency: string;
    amount: string;
    fee: string;
    networkFee: string;
    address: string;
    paymentId: string;
    hash: string;
    status: string; // created, pending, failed, success
    type: string;   // payout, payin, deposit, withdraw, bankToExchange, exchangeToBank
    createdAt: string;
    updatedAt: string;
};

export type IAddress = {
    address: string;
    paymentId: string;
};

export type IWithdrawConfirm = {
    result: boolean;
};

export type ICandle = {
    timestamp: string;
    open: string;
    close: string;
    min: string;
    max: string;
    volume: string;
    volumeQuote: string;
};

export type IError = {
    error: {
        code: string;
        message: string;        //Internal Server Error, Gateway Timeout, Service Unavailable, Symbol not found,
                                // Authorisation required, Authorisation failed, Validation error, Insufficient funds
        description: string;
    };
};

//</editor-fold>

export interface IHitBtcClient {
    rawAgent: IRawAgent;

    isUpgraded(): boolean;

    upgrade(auth: IApiAuth): void;

    //<editor-fold desc="market data"

    getAvailableCurrencySymbols(): Promise<ISymbol[]>;

    getSymbolInfo(symbolId: string): Promise<ISymbol>;

    getAvailableCurrencies(): Promise<ICurrency[]>;

    getCurrencyInfo(currencyId: string): Promise<ICurrency>;

    getTicker(): Promise<ITicker[]>;

    getTickerInfo(symbolId: string): Promise<ITicker>;

    getTradesInfo(symbolId: string, queryParams: IGetTradesInfoParams): Promise<ITrade[]>;

    getOrderBook(symbolId: string, queryParams: IGetOrderBookParams): Promise<ITrade[]>;

    getCandle(symbolId: string, queryParams: IGetCandleParams): Promise<ITrade[]>;

    //</editor-fold>

    //<editor-fold desc="trading">

    listOpenOrders(symbolId: string): Promise<IOrder[]>;

    createNewOrder(params: INewOrderParams): Promise<IOrder>;

    cancelAllOrders(params?: ICancelAllOrdersParams): Promise<IOrder[]>;

    getOrderByClientId(clientOrderId: string, params: IGetOrderParams): Promise<IOrder>;

    createNewClientIdOrder(clientOrderId: string, params: INewOrderByClientIdParams): Promise<IOrder>;

    cancelClientIdOrder(clientOrderId: string): Promise<IOrder>;

    replaceOrder(clientOrderId: string): Promise<IOrder>;

    getTradingBalances(): Promise<IBalance[]>;

    getTradingFee(symbolId: string): Promise<ITradingFee>;

    //</editor-fold>

    //<editor-fold desc="trading history">

    getTrades(params?: IGetTradesParams): Promise<ITrade[]>;

    getOrders(params?: IGetOrdersParams): Promise<IOrder[]>;

    getTradesByOrderId(orderId: number): Promise<IOrder>;

    //</editor-fold>

    //<editor-fold desc="account">

    getMainAccountBalance(): Promise<IBalance[]>;

    getAccountTransactions(params?: IGetAccountTransactionsParams): Promise<ITransaction[]>;

    getAccountTransactionById(transactionId: string): Promise<ITransaction>;

    withdrawCrypto(params: IWithdrawCryptoParams): Promise<{ id: string }>;

    commitCryptoWithdraw(id: string): Promise<IWithdrawConfirm>;

    rollbackCryptoWithdraw(id: string): Promise<IWithdrawConfirm>;

    getCryptoDepositAddress(currencyId: string): Promise<IAddress>;

    createCryptoDepositAddress(currencyId: string): Promise<IAddress>;

    transferToTrading(params: ITransferToTradingParams): Promise<{ id: string }>;

    //</editor-fold>

}

//<editor-fold desc="request param types">

export type IGetTradesInfoParams = {
    sort?: string;
    by?: string;
    from?: string;
    till?: string;
    limit?: number;
    offset?: number;
};

export type IGetOrderBookParams = { limit?: number; };
export type IGetCandleParams = { limit?: number; period?: string };
export type INewOrderParams = {
    clientOrderId?: string;
    symbolId: string;
    side: string;
    type?: string;
    timeInForce?: string;
    quantity: string;
    price?: string;
    stopPrice?: string;
    expireTime?: string;
    strictValidate?: boolean
};

export type ICancelAllOrdersParams = { symbo?: string };
export type IGetOrderParams = { wait?: number; };

export type INewOrderByClientIdParams = {
    symbol: string;
    side: string;
    type?: string;
    timeInForce: string;
    quantity: string;
    price?: string;
    stopPrice?: string;
    expireTime?: string;
    strictValidate?: boolean
};

export type IReplaceOrderParams = {
    quantity: string;
    price?: string;
    requestClientId: string;
};

export type IGetTradesParams = {
    symbol?: string;
    sort?: string;
    by?: string;
    from?: string;
    till?: string;
    limit?: number;
    offset?: number;
};

export type IGetOrdersParams = {
    symbol?: string;
    from?: string;
    till?: string;
    limit?: number;
    offset?: number;
    clientOrderId?: string;
};

export type IGetAccountTransactionsParams = {
    currency?: string;
    sort?: string;
    by?: string;
    from?: string;
    till?: string;
    limit?: number;
    offset?: number;
};

export type IWithdrawCryptoParams = {
    currency: string;
    amount: string;
    address: string;
    paymentId?: string;
    networkFee?: string;
    includeFee?: string;
    autoCommit?: string;
};

export type ITransferToTradingParams = {
    currency: string;
    amount: string;
    type: string;
};

//</editor-fold>

export const getClient = (auth?: IApiAuth, configOverride: IHitBtcRequestConfig = null) => ({

    rawAgent: getRawAgent(auth),

    isUpgraded(): boolean { return this.rawAgent.isUpgraded(); },

    upgrade(newAuth: IApiAuth): void { this.rawAgent.upgrade(newAuth); },

    //<editor-fold desc="market data"

    async getAvailableCurrencySymbols(): Promise<ISymbol[]> {
        return this.rawAgent.getPublicEndpoint('public/symbol', null, configOverride);
    },

    async getSymbolInfo(symbolId: string): Promise<ISymbol> {
        return this.rawAgent.getPublicEndpoint(`public/symbol/${symbolId}`, null, configOverride);
    },

    async getAvailableCurrencies(): Promise<ICurrency[]> {
        return this.rawAgent.getPublicEndpoint('public/currency', null, configOverride);
    },

    async getCurrencyInfo(currencyId: string): Promise<ICurrency> {
        return this.rawAgent.getPublicEndpoint(`public/symbol/${currencyId}`, null, configOverride);
    },

    async getTicker(): Promise<ITicker[]> {
        return this.rawAgent.getPublicEndpoint('public/ticker', null, configOverride);
    },

    async getTickerInfo(symbolId: string): Promise<ITicker> {
        return this.rawAgent.getPublicEndpoint(`public/ticker/${symbolId}`, null, configOverride);
    },

    async getTradesInfo(symbolId: string, queryParams: IGetTradesInfoParams): Promise<ITrade[]> {
        return this.rawAgent.getPublicEndpoint(`public/trades/${symbolId}`, queryParams, configOverride);
    },

    async getOrderBook(symbolId: string, queryParams: IGetOrderBookParams): Promise<ITrade[]> {
        return this.rawAgent.getPublicEndpoint(`public/orderbook/${symbolId}`, queryParams, configOverride);
    },

    async getCandle(symbolId: string, queryParams: IGetCandleParams): Promise<ITrade[]> {
        return this.rawAgent.getPublicEndpoint(`public/candles/${symbolId}`, queryParams, configOverride);
    },

    //</editor-fold>

    //<editor-fold desc="trading"

    async listOpenOrders(symbolId: string): Promise<IOrder[]> {
        return this.rawAgent.getFromPrivateEndpoint(`order`, { symbol: symbolId }, configOverride);
    },

    async createNewOrder(params: INewOrderParams): Promise<IOrder> {
        return this.rawAgent.postToPrivateEndpoint('order', params, configOverride);
    },

    async cancelAllOrders(params?: ICancelAllOrdersParams): Promise<IOrder[]> {
        return this.rawAgent.deleteFromPrivateEndpoint(`order`, params, configOverride);
    },

    async getOrderByClientId(clientOrderId: string, params: IGetOrderParams): Promise<IOrder> {
        return this.rawAgent.postToPrivateEndpoint(`order/${clientOrderId}`, params, configOverride);
    },

    async createNewClientIdOrder(clientOrderId: string, params: INewOrderByClientIdParams): Promise<IOrder> {
        return this.rawAgent.putToPrivateEndpoint(`order/${clientOrderId}`, params, configOverride);
    },

    async cancelClientIdOrder(clientOrderId: string): Promise<IOrder> {
        return this.rawAgent.deleteFromPrivateEndpoint(`order/${clientOrderId}`, null, configOverride);
    },

    async replaceOrder(clientOrderId: string): Promise<IOrder> {
        return this.rawAgent.patchToPrivateEndpoint(`order/${clientOrderId}`, null, configOverride);
    },

    async getTradingBalances(): Promise<IBalance[]> {
        return this.rawAgent.getFromPrivateEndpoint(`trading/balance`, null, configOverride);
    },

    async getTradingFee(symbolId: string): Promise<ITradingFee> {
        return this.rawAgent.getFromPrivateEndpoint(`trading/fee/${symbolId}`, null, configOverride);
    },

    //</editor-fold>

    //<editor-fold desc="trading history">

    async getTrades(params?: IGetTradesParams): Promise<ITrade[]> {
        return this.rawAgent.getFromPrivateEndpoint('history/trades', params, configOverride);
    },

    async getOrders(params?: IGetOrdersParams): Promise<IOrder[]> {
        return this.rawAgent.getFromPrivateEndpoint('history/order', params, configOverride);
    },

    async getTradesByOrderId(orderId: number): Promise<IOrder> {
        return this.rawAgent.getFromPrivateEndpoint(`history/order/${orderId}/trades`, null, configOverride);
    },

    //</editor-fold>

    //<editor-fold desc="account">

    async getMainAccountBalance(): Promise<IBalance[]> {
        return this.rawAgent.getFromPrivateEndpoint('account/balance', null, configOverride);
    },

    async getAccountTransactions(params?: IGetAccountTransactionsParams): Promise<ITransaction[]> {
        return this.rawAgent.getFromPrivateEndpoint('account/transactions', params, configOverride);
    },

    async getAccountTransactionById(transactionId: string): Promise<ITransaction> {
        return this.rawAgent.getFromPrivateEndpoint(`account/transaction/${transactionId}`, null, configOverride);
    },

    async withdrawCrypto(params: IWithdrawCryptoParams): Promise<{ id: string }> {
        return this.rawAgent.postToPrivateEndpoint('account/crypto/withdraw', params, configOverride);
    },

    async commitCryptoWithdraw(id: string): Promise<IWithdrawConfirm> {
        return this.rawAgent.putToPrivateEndpoint(`account/crypto/withdraw/${id}`, null, configOverride);
    },

    async rollbackCryptoWithdraw(id: string): Promise<IWithdrawConfirm> {
        return this.rawAgent.deleteFromPrivateEndpoint(`account/crypto/withdraw/${id}`, null, configOverride);
    },

    async getCryptoDepositAddress(currencyId: string): Promise<IAddress> {
        return this.rawAgent.getFromPrivateEndpoint(`account/crypto/address/${currencyId}`, null, configOverride);
    },

    async createCryptoDepositAddress(currencyId: string): Promise<IAddress> {
        return this.rawAgent.postToPrivateEndpoint(`account/crypto/address/${currencyId}`, null, configOverride);
    },

    async transferToTrading(params: ITransferToTradingParams): Promise<{ id: string }> {
        return this.rawAgent.postToPrivateEndpoint(`account/transfer`, params, configOverride);
    },

    //</editor-fold>

});

/**
 * Alias for Axios request options.
 */
export interface IHitBtcRequestConfig extends AxiosRequestConfig {}

/**
 * Alias for Axios response.
 */
export interface IHitBtcResponse extends AxiosResponse {}
