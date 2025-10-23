// src/app/core/models/api/product-group.interface.ts

import { Product } from '../product.interface';

/**
 * Group Address Item (nested structure in ProductGroup)
 * Represents hierarchical group navigation path
 */
export interface GroupAddress {
    /** Group ID in the hierarchy */
    id: number;

    /** Group name */
    name: string;

    /** Parent group ID (-1 for root level) */
    parentID: number;

    /** Indicates if this is a page-level group */
    is_page: boolean;
}

/**
 * Product Group (from /groups endpoint)
 * Represents a product category/group from the API
 */
export interface ProductGroup {
    /** Unique group identifier */
    id: number;

    /** Group display name */
    name: string;

    /** Group image URL (may be empty) */
    image: string;

    /** Parent group ID (-1 for root level) */
    parentID: number;

    /** Group tag identifier */
    tag: number;

    /** Hierarchical group navigation path */
    group_address: GroupAddress[];
}

/**
 * Get Groups Response (API response from /groups endpoint)
 * Received from /e-shop/api/groups
 */
export interface GetGroupsResponse {
    /** Request success status */
    success: boolean;

    /** Error information */
    error: {
        code: number;
        message: string;
    };

    /** Array of product groups */
    items: ProductGroup[];
}

/**
 * Product Group with mapped products (Business Object)
 * Extended version of ProductGroup with associated products after processing
 * This is NOT a direct API response - it's created by mapping logic
 */
export interface ProductGroupWithProducts extends ProductGroup {
    /** Products belonging to this group (mapped by gr_id) */
    group_products: Product[];
}

/**
 * Groups With Products Response (Processed Business Response)
 * Wrapper for groups with their associated products
 * This is returned by getGroupsWithProducts() service method
 */
export interface GroupsWithProductsResponse {
    /** Request success status */
    success: boolean;

    /** Error information */
    error: {
        code: number;
        message: string;
    };

    /** Array of groups with their mapped products */
    data: ProductGroupWithProducts[];

    /** Total products count across all groups */
    totalProducts: number;

    /** Total groups count */
    totalGroups: number;

    /** Groups with no products (empty) */
    emptyGroupsCount: number;

    /** Timestamp when mapping was performed */
    mappedAt: Date;
}