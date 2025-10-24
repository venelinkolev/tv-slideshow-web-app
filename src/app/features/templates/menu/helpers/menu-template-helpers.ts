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
    constraints: { min: number; max: number } = { min: 16, max: 48 }
): number {
    // If manual size is set and autoScale is off, use manual size
    if (!autoScale && manualSize) {
        return Math.max(constraints.min, Math.min(constraints.max, manualSize));
    }

    // Base font size for average content
    const BASE_SIZE = 36;

    // Penalties for content volume
    const GROUP_PENALTY = 2; // Reduce 2px per group
    const PRODUCT_PENALTY = 0.5; // Reduce 0.5px per product

    // Calculate reduction
    const reduction = (groupCount * GROUP_PENALTY) + (totalProductCount * PRODUCT_PENALTY);

    // Calculate final size
    const calculated = BASE_SIZE - reduction;

    // Clamp to constraints
    return Math.max(constraints.min, Math.min(constraints.max, calculated));
}

/**
 * Calculate optimal number of columns based on content
 * 
 * @param groupCount - Number of groups to display
 * @param screenWidth - Screen width in pixels (optional, defaults to window.innerWidth)
 * @returns Number of columns (2-6)
 */
export function calculateColumnCount(groupCount: number, screenWidth?: number): number {
    const width = screenWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);

    // Base on group count first
    if (groupCount <= 2) return 2;
    if (groupCount <= 4) return 3;
    if (groupCount <= 6) return 4;
    if (groupCount <= 9) return 5;

    // For very large menus, cap at 6 columns
    return 6;
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