import * as axiosDefault from 'axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as qs from 'qs';

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
 * Convenient container for API keys.
 */
export type IApiAuth = { publicKey: string; privateKey: string; };

/**
 * The shape of a raw request forwarding agent.
 */
export interface IRawAgent {
    auth?: IApiAuth;

    publicRequest(endpoint: string,
                  queryParams?: IQueryParams,
                  config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    privateRequest(endpoint: string,
                   method: string,
                   dataParams?: IQueryParams | IPostBody,
                   config?: IHitBtcRequestConfig): Promise<IHitBtcResponse>;

    isUpgraded(): boolean;

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

    async publicRequest(endpoint: string,
                        queryParams?: IQueryParams,
                        config?: IHitBtcRequestConfig): Promise<IHitBtcResponse> {

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

    async privateRequest(endpoint: string,
                         method: string,
                         dataParams?: IQueryParams | IPostBody,
                         config?: IHitBtcRequestConfig): Promise<IHitBtcResponse> {

        // Ensure the user has credentials
        if (!this.isUpgraded()) return Promise.reject(`api keys are required to access private endpoints`);

        // The uri is a relative path to the privateAgentConfig baseUrl
        const data = method === 'GET' ? null : dataParams;
        const uri  = method === 'GET' ? `/${endpoint}/${qs.stringify(dataParams)}` : `/${endpoint}`;

        const headersOverride = config ? config.headers : null;

        // Add the appropriate POST request headers (Key and Sign)
        const headers = {
            ...privateAgentConfig.headers,
            ...headersOverride,
        };

        const httpBasicAuth = {
            password: auth.privateKey,
            username: auth.publicKey,
        };

        // Construct the actual config to be used
        const agentConfig = { ...privateAgentConfig, headers, auth: httpBasicAuth, url: uri, method, data, ...config };

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

export interface IHitBtcClient {
    rawAgent: IRawAgent;

    isUpgraded(): boolean;

    upgrade(auth: IApiAuth): void;

    //<editor-fold desc="market data"

    getAvailableCurrencySymbols(): Promise<IHitBtcResponse>;

    getSymbolInfo(symbolId: string): Promise<IHitBtcResponse>;

    getAvailableCurrencies(): Promise<IHitBtcResponse>;

    getCurrencyInfo(currencyId: string): Promise<IHitBtcResponse>;

    getTicker(): Promise<IHitBtcResponse>;

    getTickerInfo(symbolId: string): Promise<IHitBtcResponse>;

    getTradesInfo(symbolId: string, queryParams: IGetTradesInfoParams): Promise<IHitBtcResponse>;

    getOrderBook(symbolId: string, queryParams: IGetOrderBookParams): Promise<IHitBtcResponse>;

    getCandle(symbolId: string, queryParams: IGetCandleParams): Promise<IHitBtcResponse>;

    //</editor-fold>

    //<editor-fold desc="trading">

    listOpenOrders(symbolId?: string): Promise<IHitBtcResponse>;

    createNewOrder(params: INewOrderParams): Promise<IHitBtcResponse>;

    cancelAllOrders(params?: ICancelAllOrdersParams): Promise<IHitBtcResponse>;

    getOrderByClientId(clientOrderId: string, params: IGetOrderParams): Promise<IHitBtcResponse>;

    createNewClientIdOrder(clientOrderId: string, params: INewOrderByClientIdParams): Promise<IHitBtcResponse>;

    cancelClientIdOrder(clientOrderId: string): Promise<IHitBtcResponse>;

    replaceOrder(clientOrderId: string): Promise<IHitBtcResponse>;

    getTradingBalances(): Promise<IHitBtcResponse>;

    getTradingFee(symbolId: string): Promise<IHitBtcResponse>;

    //</editor-fold>

    //<editor-fold desc="trading history">

    getTrades(params?: IGetTradesParams): Promise<IHitBtcResponse>;

    getOrders(params?: IGetOrdersParams): Promise<IHitBtcResponse>;

    getTradesByOrderId(orderId: number): Promise<IHitBtcResponse>;

    //</editor-fold>

    //<editor-fold desc="account">

    getMainAccountBalance(): Promise<IHitBtcResponse>;

    getAccountTransactions(params?: IGetAccountTransactionsParams): Promise<IHitBtcResponse>;

    getAccountTransactionById(transactionId: string): Promise<IHitBtcResponse>;

    // {id: string}
    withdrawCrypto(params: IWithdrawCryptoParams): Promise<IHitBtcResponse>;

    commitCryptoWithdraw(id: string): Promise<IHitBtcResponse>;

    rollbackCryptoWithdraw(id: string): Promise<IHitBtcResponse>;

    getCryptoDepositAddress(currencyId: string): Promise<IHitBtcResponse>;

    createCryptoDepositAddress(currencyId: string): Promise<IHitBtcResponse>;

    // {id: string}
    transferToTrading(params: ITransferToTradingParams): Promise<IHitBtcResponse>;

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
    symbol: string;
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

export const getClient = (auth?: IApiAuth, configOverride: IHitBtcRequestConfig = null): IHitBtcClient => ({

    rawAgent: getRawAgent(auth),

    isUpgraded(): boolean { return this.rawAgent.isUpgraded(); },

    upgrade(newAuth: IApiAuth): void { this.rawAgent.upgrade(newAuth); },

    //<editor-fold desc="market data"

    async getAvailableCurrencySymbols(): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest('public/symbol', null, configOverride);
    },

    async getSymbolInfo(symbolId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest(`public/symbol/${symbolId}`, null, configOverride);
    },

    async getAvailableCurrencies(): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest('public/currency', null, configOverride);
    },

    async getCurrencyInfo(currencyId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest(`public/symbol/${currencyId}`, null, configOverride);
    },

    async getTicker(): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest('public/ticker', null, configOverride);
    },

    async getTickerInfo(symbolId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest(`public/ticker/${symbolId}`, null, configOverride);
    },

    async getTradesInfo(symbolId: string, queryParams: IGetTradesInfoParams): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest(`public/trades/${symbolId}`, queryParams, configOverride);
    },

    async getOrderBook(symbolId: string, queryParams: IGetOrderBookParams): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest(`public/orderbook/${symbolId}`, queryParams, configOverride);
    },

    async getCandle(symbolId: string, queryParams: IGetCandleParams): Promise<IHitBtcResponse> {
        return this.rawAgent.publicRequest(`public/candles/${symbolId}`, queryParams, configOverride);
    },

    //</editor-fold>

    //<editor-fold desc="trading"

    async listOpenOrders(symbolId?: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`order`, 'GET', { symbol: symbolId }, configOverride);
    },

    async createNewOrder(params: INewOrderParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest('order', 'POST', params, configOverride);
    },

    async cancelAllOrders(params?: ICancelAllOrdersParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`order`, 'DELETE', params, configOverride);
    },

    async getOrderByClientId(clientOrderId: string, params: IGetOrderParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`order/${clientOrderId}`, 'POST', params, configOverride);
    },

    async createNewClientIdOrder(clientOrderId: string, params: INewOrderByClientIdParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`order/${clientOrderId}`, 'PUT', params, configOverride);
    },

    async cancelClientIdOrder(clientOrderId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`order/${clientOrderId}`, 'DELETE', null, configOverride);
    },

    async replaceOrder(clientOrderId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`order/${clientOrderId}`, 'PATCH', null, configOverride);
    },

    async getTradingBalances(): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`trading/balance`, 'GET', null, configOverride);
    },

    async getTradingFee(symbolId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`trading/fee/${symbolId}`, 'GET', null, configOverride);
    },

    //</editor-fold>

    //<editor-fold desc="trading history">

    async getTrades(params?: IGetTradesParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest('history/trades', 'GET', params, configOverride);
    },

    async getOrders(params?: IGetOrdersParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest('history/order', 'GET', params, configOverride);
    },

    async getTradesByOrderId(orderId: number): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`history/order/${orderId}/trades`, 'GET', null, configOverride);
    },

    //</editor-fold>

    //<editor-fold desc="account">

    async getMainAccountBalance(): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest('account/balance', 'GET', null, configOverride);
    },

    async getAccountTransactions(params?: IGetAccountTransactionsParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest('account/transactions', 'GET', params, configOverride);
    },

    async getAccountTransactionById(transactionId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`account/transaction/${transactionId}`, 'GET', null, configOverride);
    },

    // return {id: string}
    async withdrawCrypto(params: IWithdrawCryptoParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest('account/crypto/withdraw', 'POST', params, configOverride);
    },

    async commitCryptoWithdraw(id: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`account/crypto/withdraw/${id}`, 'PUT', null, configOverride);
    },

    async rollbackCryptoWithdraw(id: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`account/crypto/withdraw/${id}`, 'DELETE', null, configOverride);
    },

    async getCryptoDepositAddress(currencyId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`account/crypto/address/${currencyId}`, 'GET', null, configOverride);
    },

    async createCryptoDepositAddress(currencyId: string): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`account/crypto/address/${currencyId}`, 'GET', null, configOverride);
    },

    // {id: string}
    async transferToTrading(params: ITransferToTradingParams): Promise<IHitBtcResponse> {
        return this.rawAgent.privateRequest(`account/transfer`, 'POST', params, configOverride);
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
