// src/app/core/models/api/stock-item.interface.ts

/**
 * API StockItem Response (from getstockslite endpoint)
 * Direct mapping of API response structure
 */
export interface StockItem {
    package_stocks: any[];
    package_stocks_content: any[];
    stk_idnumb: number;
    stk_name: string;
    stk_name_2: string;
    gr_id: number;
    screen_gr_ids: number[];
    quantity: number;
    quantity_per_pack: number;
    quantity_per_big_pack: number;
    broimo: boolean;
    bruto: number;
    neto: number;
    basic_price: number;
    price: number;
    customer_file_price: number;
    price_1: number;
    price_2: number;
    price_3: number;
    price_4: number;
    price_5: number;
    price_6: number;
    price_7: number;
    price_8: number;
    price_9: number;
    price_10: number;
    description: string;
    description_2: string;
    importer: string;
    producer: string;
    location: string;
    address: string;
    code: string;
    code_quantity: number;
    code_2: string;
    code_2_quantity: number;
    code_3: string;
    code_3_quantity: number;
    code_4: string;
    code_4_quantity: number;
    kat_number: string;
    price_list_name: string;
    additions: any[];
    comments: any[];
    image: string; // Base64 string
    stock_type: number;
}

/**
 * Get Stocks Request (POST body)
 * Sent to /e-shop/api/getstockslite
 */
export interface GetStocksRequest {
    get_pictures: boolean;
}

/**
 * Get Stocks Response (API response)
 * Received from /e-shop/api/getstockslite
 */
export interface GetStocksResponse {
    error: string;
    items: StockItem[];
}