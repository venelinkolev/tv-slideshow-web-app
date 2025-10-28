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

    // ✅ OPTIMIZED penalties for better fit
    // Penalties for content volume - aggressive scaling
    const GROUP_PENALTY = 2.0; // Increased from 1.5 - groups take more space (headers!)
    const GROUP_HEADER_WEIGHT = 1.5; // Each group header ≈ 1.5 products in vertical space
    const PRODUCT_PENALTY = 0.6; // Increased from 0.5 - more aggressive

    console.log(`📏 [calculateOptimalFontSize] START - Groups: ${groupCount}, Products: ${totalProductCount}, Columns: ${columnCount || 'auto'}`);

    // Additional penalty for more columns (less horizontal space per column)
    let columnPenalty = 0;
    if (columnCount) {
        if (columnCount >= 5) columnPenalty = 10;  // 5+ columns
        else if (columnCount === 4) columnPenalty = 5;  // 4 columns
        else if (columnCount === 3) columnPenalty = 2;  // 3 columns
        else columnPenalty = 0;  // 2 columns (default)
    }

    // ✅ NEW: Additional penalty for dense columns (when columns are reduced for balance)
    // If we have few columns but many products, reduce font size more aggressively
    let densityCompensation = 0;
    if (columnCount && columnCount <= 3) {
        const productsPerColumn = totalProductCount / columnCount;
        if (productsPerColumn > 12) {
            // Heavy columns need smaller font
            densityCompensation = Math.min(6, Math.floor((productsPerColumn - 12) * 0.5));
        }
    }

    // ✅ CRITICAL: Calculate effective product count (including group header weight)
    const effectiveProductCount = totalProductCount + (groupCount * GROUP_HEADER_WEIGHT);

    console.log(`📏 [calculateOptimalFontSize] Effective units: ${totalProductCount} products + (${groupCount} groups × ${GROUP_HEADER_WEIGHT}) = ${effectiveProductCount.toFixed(1)}`);

    // Additional penalty for high density
    let densityPenalty = 0;
    if (effectiveProductCount > 20) {
        // For >20 effective units, add extra penalty to ensure they all fit
        densityPenalty = Math.floor((effectiveProductCount - 20) * 0.3); // Increased from 0.2
        console.log(`📏 [calculateOptimalFontSize] High density penalty: ${densityPenalty}px (effective units > 20)`);
    }

    // Calculate reduction using EFFECTIVE product count
    const reduction = (groupCount * GROUP_PENALTY) + (effectiveProductCount * PRODUCT_PENALTY) + columnPenalty + densityPenalty;

    console.log(`📏 [calculateOptimalFontSize] Reduction breakdown:`);
    console.log(`   - Groups: ${groupCount} × ${GROUP_PENALTY} = ${groupCount * GROUP_PENALTY}px`);
    console.log(`   - Effective products: ${effectiveProductCount.toFixed(1)} × ${PRODUCT_PENALTY} = ${(effectiveProductCount * PRODUCT_PENALTY).toFixed(1)}px`);
    console.log(`   - Columns: ${columnPenalty}px`);
    console.log(`   - Density: ${densityPenalty}px`);
    console.log(`   - TOTAL reduction: ${reduction.toFixed(1)}px`);

    // Calculate final size
    const calculated = BASE_SIZE - reduction;

    // Clamp to constraints
    const finalSize = Math.max(constraints.min, Math.min(constraints.max, calculated));

    console.log(`📏 [calculateOptimalFontSize] Result: ${BASE_SIZE} - ${reduction.toFixed(1)} = ${calculated.toFixed(1)}px → clamped to ${finalSize}px (min: ${constraints.min}, max: ${constraints.max})`);

    return finalSize;
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
    console.log(`\n🔢 [calculateColumnCount] START - Groups: ${groupCount}, Products: ${totalProductCount}, Screen: ${width}px`);

    // ✅ CRITICAL FIX: Group headers take vertical space!
    // Each group header is ~1.4x larger than product font + padding/border
    // Treat each group header as equivalent to ~2 products in vertical space
    const GROUP_HEADER_WEIGHT = 2; // каждый group header = 2 products worth of space
    const effectiveProductCount = totalProductCount + (groupCount * GROUP_HEADER_WEIGHT);

    console.log(`📊 [calculateColumnCount] Group header compensation: ${groupCount} groups × ${GROUP_HEADER_WEIGHT} = +${groupCount * GROUP_HEADER_WEIGHT} effective units`);
    console.log(`📊 [calculateColumnCount] Effective product count: ${totalProductCount} + ${groupCount * GROUP_HEADER_WEIGHT} = ${effectiveProductCount}`);

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
    // OPTIMIZED: More aggressive to prevent invisible products
    console.log(`📊 [calculateColumnCount] Estimated columns: ${estimatedColumns}`);

    if (estimatedColumns == 2) PRODUCTS_PER_COLUMN = 12; // Increased from 8
    else if (estimatedColumns == 3) PRODUCTS_PER_COLUMN = 11; // Increased from 10
    else if (estimatedColumns <= 4) PRODUCTS_PER_COLUMN = 9; // Increased from 8
    else PRODUCTS_PER_COLUMN = 8; // 5+ columns - increased from 7

    console.log(`📊 [calculateColumnCount] Products per column: ${PRODUCTS_PER_COLUMN}`);

    // Calculate minimum columns needed based on EFFECTIVE products (including group headers)
    const columnsByProducts = Math.ceil(effectiveProductCount / PRODUCTS_PER_COLUMN);

    // Use the higher of the two calculations to ensure content fits
    let calculatedColumns = Math.max(estimatedColumns, columnsByProducts);

    // ✅ CRITICAL: Additional safety check - INCREASED to 90% for better coverage
    // If we're getting close to the limit (90% of capacity), add an extra column to be safe
    const capacity = calculatedColumns * PRODUCTS_PER_COLUMN;
    const threshold = capacity * 0.90; // 90% capacity threshold

    console.log(`📊 [calculateColumnCount] Capacity check: ${effectiveProductCount} effective units, capacity: ${capacity}, threshold (90%): ${threshold}`);

    if (effectiveProductCount > threshold) {
        console.log(`⚠️ [calculateColumnCount] Products exceed 90% capacity! Adding +1 column`);
        calculatedColumns = Math.min(6, calculatedColumns + 1);
    }

    // ✅ FINAL: Log final column count
    console.log(`✅ [calculateColumnCount] Final columns: ${calculatedColumns} for ${totalProductCount} products + ${groupCount} groups = ${effectiveProductCount} effective units`);

    // Final bounds: 2-6 columns
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