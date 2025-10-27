// src/app/features/templates/menu/helpers/menu-template-helpers.ts

import { ProductGroupWithProducts } from '@core/models/api/product-group.interface';
import { Product } from '@core/models';
import { MenuGroupSelection, MenuTemplateConfig } from '@core/models';

/**
 * Calculate optimal font size based on content volume
 * 
 * @param groupCount - Number of groups to display
 * @param totalProductCount - Total number of products across all groups
 * @param autoScale - Whether to auto-calculate or use manual size
 * @param manualSize - Manual font size (if autoScale is false)
 * @param constraints - Min/max font size constraints
 * @returns Calculated font size in pixels
 */
export function calculateOptimalFontSize(
    groupCount: number,
    totalProductCount: number,
    autoScale: boolean,
    manualSize?: number,
    constraints: { min: number; max: number } = { min: 16, max: 48 },
    columnCount?: number
): number {
    // If manual size is set and autoScale is off, use manual size
    if (!autoScale && manualSize) {
        return Math.max(constraints.min, Math.min(constraints.max, manualSize));
    }

    // Base font size for average content
    const BASE_SIZE = 36;

    // ✅ INCREASED penalties for better fit
    // Penalties for content volume - more aggressive
    const GROUP_PENALTY = 1.5; // Reduce 1.5px per group
    const PRODUCT_PENALTY = 0.5; // Reduce 0.5px per product (increased from 0.3)
    
    // Additional penalty for more columns (less horizontal space per column)
    let columnPenalty = 0;
    if (columnCount) {
        if (columnCount >= 5) columnPenalty = 10;  // 5+ columns
        else if (columnCount === 4) columnPenalty = 5;  // 4 columns
        else if (columnCount === 3) columnPenalty = 2;  // 3 columns
        else columnPenalty = 0;  // 2 columns (default)
    }

    // ✅ CRITICAL: Additional penalty for high product density
    // When there are many products, reduce font more aggressively
    let densityPenalty = 0;
    if (totalProductCount > 15) {
        // For >15 products, add extra penalty to ensure they all fit
        densityPenalty = Math.floor((totalProductCount - 15) * 0.2);
    }

    // Calculate reduction
    const reduction = (groupCount * GROUP_PENALTY) + (totalProductCount * PRODUCT_PENALTY) + columnPenalty + densityPenalty;

    // Calculate final size
    const calculated = BASE_SIZE - reduction;

    // Clamp to constraints
    return Math.max(constraints.min, Math.min(constraints.max, calculated));
}

/**
 * Calculate optimal number of columns based on content volume
 * 
 * Takes into account both group count and total products
 * to ensure content fits without being cut off
 * 
 * @param groupCount - Number of groups to display
 * @param totalProductCount - Total number of products (for density calculation)
 * @param screenWidth - Screen width in pixels (optional, defaults to window.innerWidth)
 * @returns Number of columns (2-6) - capped to prevent off-screen overflow
 */
export function calculateColumnCount(
    groupCount: number, 
    totalProductCount: number = 0,
    screenWidth?: number
): number {
    const width = screenWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);

    // Optimal products per column varies based on expected column count
    // CRITICAL: With fewer columns, each column is WIDER, so can fit more products
    let PRODUCTS_PER_COLUMN = 10; // Conservative for fewer columns
    
    // First pass: estimate columns based on groups
    let estimatedColumns = 3; // default
    if (groupCount <= 2) estimatedColumns = 2;
    else if (groupCount <= 4) estimatedColumns = 3;
    else if (groupCount <= 6) estimatedColumns = 4;
    else if (groupCount <= 9) estimatedColumns = 5;
    else estimatedColumns = 6;

    // Adjust products per column based on estimated column count
    // FIXED: Inverse logic - FEWER columns = WIDER columns = can fit MORE products per column
    // CRITICAL: Made more conservative to prevent content overflow
    // With 2 columns, screen is wide BUT with products from 2 different groups distributed,
    // we need to be conservative (~8-10 products max per column for comfortable display)
    if (estimatedColumns == 2) PRODUCTS_PER_COLUMN = 8; // Conservative for 2 columns
    else if (estimatedColumns == 3) PRODUCTS_PER_COLUMN = 10;
    else if (estimatedColumns <= 4) PRODUCTS_PER_COLUMN = 8;
    else PRODUCTS_PER_COLUMN = 7; // 5+ columns means very narrow

    // Calculate minimum columns needed based on products
    const columnsByProducts = Math.ceil(totalProductCount / PRODUCTS_PER_COLUMN);
    
    // Use the higher of the two calculations to ensure content fits
    let calculatedColumns = Math.max(estimatedColumns, columnsByProducts);
    
    // ✅ CRITICAL: Additional safety check
    // If we're getting close to the limit (80% of capacity), add an extra column to be safe
    if (totalProductCount > (calculatedColumns * PRODUCTS_PER_COLUMN * 0.80)) {
        calculatedColumns = Math.min(6, calculatedColumns + 1);
    }
    
    // ✅ OPTIMIZATION: Reduce if we might create empty columns
    // If average products per column would be too few (< 6), reduce columns to prevent empty space
    const avgProductsPerColumn = totalProductCount / calculatedColumns;
    if (avgProductsPerColumn < 6 && calculatedColumns > 2) {
        // Only reduce if it won't cause overflow
        const reducedColumns = calculatedColumns - 1;
        const reducedAvg = totalProductCount / reducedColumns;
        if (reducedAvg <= 12) { // Safe to reduce (max 12 products per column)
            calculatedColumns = reducedColumns;
        }
    }
    
    // Cap at 6 columns to prevent off-screen overflow
    // This ensures all columns remain visible on TV screens
    return Math.min(6, Math.max(2, calculatedColumns));
}

/**
 * Filter groups and products based on user selections
 * 
 * @param allGroups - All available groups from API
 * @param selections - User's group and product selections
 * @returns Filtered and sorted groups with products
 */
export function filterGroupsBySelection(
    allGroups: ProductGroupWithProducts[],
    selections: MenuGroupSelection[]
): ProductGroupWithProducts[] {
    if (!selections || selections.length === 0) {
        return [];
    }

    // Create a map for quick lookup
    const selectionMap = new Map<number, MenuGroupSelection>();
    selections.forEach(sel => selectionMap.set(sel.groupId, sel));

    // Filter and map groups
    const filteredGroups = allGroups
        .filter(group => selectionMap.has(group.id))
        .map(group => {
            const selection = selectionMap.get(group.id)!;

            // Filter products based on selection
            const filteredProducts = group.group_products.filter(product =>
                selection.productIds.includes(product.id)
            );

            return {
                ...group,
                group_products: filteredProducts,
                displayOrder: selection.displayOrder
            };
        });

    // Sort by display order
    return filteredGroups.sort((a, b) => {
        const orderA = selectionMap.get(a.id)?.displayOrder ?? 999;
        const orderB = selectionMap.get(b.id)?.displayOrder ?? 999;
        return orderA - orderB;
    });
}

/**
 * Find a product by ID across all groups
 * 
 * @param groups - Array of groups with products
 * @param productId - Product ID to find
 * @returns Product if found, undefined otherwise
 */
export function findProductById(
    groups: ProductGroupWithProducts[],
    productId: string
): Product | undefined {
    for (const group of groups) {
        const product = group.group_products.find(p => p.id === productId);
        if (product) {
            return product;
        }
    }
    return undefined;
}

/**
 * Validate menu configuration structure
 * 
 * @param config - Menu template configuration to validate
 * @returns Validation result with errors
 */
export function validateMenuConfig(config: MenuTemplateConfig): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Check slides
    if (!config.slides || config.slides.length === 0) {
        errors.push('At least one slide is required');
    }

    // Check background
    if (!config.backgroundProductId || config.backgroundProductId.trim() === '') {
        errors.push('Background product ID is required');
    }

    // Check font scaling
    if (!config.fontScaling) {
        errors.push('Font scaling configuration is required');
    } else {
        const { minFontSize, maxFontSize } = config.fontScaling;

        if (minFontSize < 12 || minFontSize > 72) {
            errors.push('Minimum font size must be between 12 and 72 pixels');
        }

        if (maxFontSize < 12 || maxFontSize > 72) {
            errors.push('Maximum font size must be between 12 and 72 pixels');
        }

        if (minFontSize >= maxFontSize) {
            errors.push('Minimum font size must be less than maximum font size');
        }
    }

    // Check each slide
    config.slides?.forEach((slide, index) => {
        if (!slide.slideId || slide.slideId.trim() === '') {
            errors.push(`Slide ${index + 1}: Slide ID is required`);
        }

        if (!slide.groupSelections || slide.groupSelections.length === 0) {
            errors.push(`Slide ${index + 1}: At least one group must be selected`);
        }

        // Check each group selection
        slide.groupSelections?.forEach((groupSel, groupIndex) => {
            if (!groupSel.productIds || groupSel.productIds.length === 0) {
                errors.push(
                    `Slide ${index + 1}, Group ${groupIndex + 1}: At least one product must be selected`
                );
            }
        });
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Calculate total product count across all group selections
 * 
 * @param groups - Filtered groups with products
 * @returns Total number of products
 */
export function getTotalProductCount(groups: ProductGroupWithProducts[]): number {
    return groups.reduce((total, group) => total + group.group_products.length, 0);
}