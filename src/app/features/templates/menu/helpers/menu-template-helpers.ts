// src/app/features/templates/menu/helpers/menu-template-helpers.ts

import { ProductGroupWithProducts } from '@core/models/api/product-group.interface';
import { Product } from '@core/models';
import {
    MenuGroupSelection,
    MenuTemplateConfig,
    MenuSlide,
    FontScalingConfig,
    ColumnControlConfig,
    ManualOverrideConfig,
    AutoOptimizationsConfig
} from '@core/models';


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
    constraints: { min: number; max: number } = { min: 12, max: 48 },
    columnCount?: number
): number {
    // If manual size is set and autoScale is off, use manual size
    if (!autoScale && manualSize) {
        return Math.max(constraints.min, Math.min(constraints.max, manualSize));
    }

    console.log(`📏 [calculateOptimalFontSize] START - Groups: ${groupCount}, Products: ${totalProductCount}, Columns: ${columnCount || 'auto'}`);

    // ✅ NEW ALGORITHM: Non-linear scaling to prevent negative values
    // Constants
    const GROUP_HEADER_WEIGHT = 1.5; // Each group header ≈ 1.5 products in vertical space
    const MIN_UNITS = 5;  // Minimum expected units (small menu)
    const MAX_UNITS = 55;  // Maximum expected units (large menu)

    // Calculate effective units (products + group headers)
    const effectiveUnits = totalProductCount + (groupCount * GROUP_HEADER_WEIGHT);
    console.log(`📏 [calculateOptimalFontSize] Effective units: ${totalProductCount} products + (${groupCount} groups × ${GROUP_HEADER_WEIGHT}) = ${effectiveUnits.toFixed(1)}`);

    // ✅ Logarithmic scaling for smooth transition
    // Scale factor: 1.0 (max size) at MIN_UNITS, 0.0 (min size) at MAX_UNITS
    const clampedUnits = Math.max(MIN_UNITS, Math.min(MAX_UNITS, effectiveUnits));
    const normalizedUnits = (clampedUnits - MIN_UNITS) / (MAX_UNITS - MIN_UNITS);

    // Logarithmic curve for more aggressive scaling
    const scaleFactor = 1 - Math.pow(normalizedUnits, 0.3); // 0.3 exponent for aggressive curve

    console.log(`📏 [calculateOptimalFontSize] Scale calculation: units=${clampedUnits.toFixed(1)}, normalized=${normalizedUnits.toFixed(2)}, factor=${scaleFactor.toFixed(2)}`);

    // Calculate base font size from scale factor
    const fontRange = constraints.max - constraints.min;
    let calculatedSize = constraints.min + (fontRange * scaleFactor);

    // ✅ Column penalty: Reduce size for more columns (less horizontal space)
    let columnAdjustment = 0;
    if (columnCount) {
        if (columnCount >= 6) columnAdjustment = -4;      // 6+ columns: -4px
        else if (columnCount === 5) columnAdjustment = -3; // 5 columns: -3px
        else if (columnCount === 4) columnAdjustment = -2; // 4 columns: -2px
        else if (columnCount === 3) columnAdjustment = -1; // 3 columns: -1px
        // 2 columns: no adjustment

        console.log(`📏 [calculateOptimalFontSize] Column adjustment: ${columnCount} columns = ${columnAdjustment}px`);
        calculatedSize += columnAdjustment;
    }

    // ✅ Density compensation for heavily loaded columns
    if (columnCount && columnCount <= 3 && totalProductCount > 30) {
        const productsPerColumn = totalProductCount / columnCount;
        if (productsPerColumn > 12) {
            const densityAdjustment = -Math.min(3, Math.floor((productsPerColumn - 12) * 0.3));
            console.log(`📏 [calculateOptimalFontSize] Density adjustment: ${productsPerColumn.toFixed(1)} products/column = ${densityAdjustment}px`);
            calculatedSize += densityAdjustment;
        }
    }

    // ✅ Final clamping to ensure we stay within constraints
    const finalSize = Math.round(Math.max(constraints.min, Math.min(constraints.max, calculatedSize)));

    console.log(`📏 [calculateOptimalFontSize] Result: base=${calculatedSize.toFixed(1)}px → final=${finalSize}px (min: ${constraints.min}, max: ${constraints.max})`);
    console.log(`📏 [calculateOptimalFontSize] Breakdown: effectiveUnits=${effectiveUnits.toFixed(1)}, scaleFactor=${scaleFactor.toFixed(2)}, columns=${columnCount || 'N/A'}\n`);

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
    screenWidth?: number,
    columnControl?: ColumnControlConfig,
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

    if (columnControl) {
        calculatedColumns = applyColumnControl(
            calculatedColumns,
            columnControl,
            {
                groupCount,
                totalProductCount,
                screenWidth: width
            }
        );
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

        if (minFontSize < 12 || minFontSize > 48) {
            errors.push('Minimum font size must be between 12 and 48 pixels');
        }

        if (maxFontSize < 12 || maxFontSize > 48) {
            errors.push('Maximum font size must be between 12 and 48 pixels');
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

/**
 * Apply column control (manual override or smart optimizations)
 * Priority: Manual override takes precedence over auto optimizations
 */
function applyColumnControl(
    autoColumns: number,
    columnControl: ColumnControlConfig,
    context: {
        groupCount: number;
        totalProductCount: number;
        screenWidth: number;
    }
): number {
    console.log(`\n🎛️ [applyColumnControl] Starting with ${autoColumns} auto-calculated columns`);

    // Priority 1: Manual Override
    if (columnControl.manualOverride.enabled) {
        const adjustment = columnControl.manualOverride.adjustment;
        const manualColumns = autoColumns + adjustment;
        const clampedColumns = Math.max(2, Math.min(6, manualColumns));

        console.log(`🎚️ [applyColumnControl] MANUAL OVERRIDE: ${autoColumns} ${adjustment >= 0 ? '+' : ''}${adjustment} = ${clampedColumns} columns`);

        return clampedColumns;
    }

    // Priority 2: Smart Auto Optimizations
    console.log(`🤖 [applyColumnControl] Applying smart optimizations...`);

    return applySmartOptimizations(
        autoColumns,
        columnControl.autoOptimizations,
        context
    );
}

/**
 * Apply smart auto-optimizations based on heuristics
 */
function applySmartOptimizations(
    autoColumns: number,
    options: AutoOptimizationsConfig,
    context: {
        groupCount: number;
        totalProductCount: number;
        screenWidth: number;
    }
): number {
    let adjustment = 0;
    const reasons: string[] = [];

    // Heuristic 1: Prevent empty columns
    if (options.preventEmptyColumns) {
        const emptyAdjustment = evaluateEmptyColumns(autoColumns, context);
        if (emptyAdjustment !== 0) {
            adjustment += emptyAdjustment;
            reasons.push(`Empty columns: ${emptyAdjustment}`);
        }
    }

    // Heuristic 2: Prevent overflow
    if (options.preventOverflow) {
        const overflowAdjustment = evaluateOverflowRisk(
            autoColumns,
            context,
            options.densityThreshold
        );
        if (overflowAdjustment !== 0) {
            adjustment += overflowAdjustment;
            reasons.push(`Overflow risk: ${overflowAdjustment}`);
        }
    }

    // Heuristic 3: Optimize for full width
    if (options.optimizeForFullWidth) {
        const widthAdjustment = evaluateFullWidthOptimization(autoColumns, context);
        if (widthAdjustment !== 0) {
            adjustment += widthAdjustment;
            reasons.push(`Full width: ${widthAdjustment}`);
        }
    }

    const finalColumns = Math.max(2, Math.min(6, autoColumns + adjustment));

    if (reasons.length > 0) {
        console.log(`🤖 [applySmartOptimizations] Adjustments applied: ${reasons.join(', ')} → ${autoColumns} + ${adjustment} = ${finalColumns} columns`);
    } else {
        console.log(`🤖 [applySmartOptimizations] No optimizations needed, keeping ${finalColumns} columns`);
    }

    return finalColumns;
}

/**
 * Heuristic 1: Evaluate if last column would be empty/sparse
 * Returns: -1 (remove column), 0 (no change)
 */
function evaluateEmptyColumns(
    columns: number,
    context: { groupCount: number; totalProductCount: number }
): number {
    const effectiveUnits = context.totalProductCount + (context.groupCount * 1.5);
    const avgItemsPerColumn = effectiveUnits / columns;
    const lastColumnItems = effectiveUnits % avgItemsPerColumn;

    // If last column has less than 2 items, remove it
    if (lastColumnItems > 0 && lastColumnItems < 2) {
        console.log(`📊 [evaluateEmptyColumns] Last column sparse (${lastColumnItems.toFixed(1)} items) → Suggest -1 column`);
        return -1;
    }

    return 0;
}

/**
 * Heuristic 2: Evaluate overflow risk based on density
 * Returns: +1 (add column), 0 (no change)
 */
function evaluateOverflowRisk(
    columns: number,
    context: { groupCount: number; totalProductCount: number },
    densityThreshold: number
): number {
    const density = calculateDensity(columns, context);

    // If density exceeds threshold, add a column
    if (density > densityThreshold) {
        console.log(`📊 [evaluateOverflowRisk] High density ${(density * 100).toFixed(0)}% > ${(densityThreshold * 100).toFixed(0)}% → Suggest +1 column`);
        return 1;
    }

    return 0;
}

/**
 * Heuristic 3: Optimize for full horizontal width
 * Returns: +1 (add column), -1 (remove column), 0 (no change)
 */
function evaluateFullWidthOptimization(
    columns: number,
    context: { screenWidth: number }
): number {
    const columnWidth = context.screenWidth / columns;
    const idealColumnWidth = 350; // Ideal column width in pixels
    const widthDifference = Math.abs(columnWidth - idealColumnWidth);
    const widthDifferencePercent = widthDifference / idealColumnWidth;

    // If columns are too wide (>30% wider than ideal), add a column
    if (columnWidth > idealColumnWidth * 1.3 && columns < 6) {
        console.log(`📊 [evaluateFullWidthOptimization] Columns too wide (${columnWidth.toFixed(0)}px > ${idealColumnWidth * 1.3}px) → Suggest +1 column`);
        return 1;
    }

    // If columns are too narrow (<70% of ideal), remove a column
    if (columnWidth < idealColumnWidth * 0.7 && columns > 2) {
        console.log(`📊 [evaluateFullWidthOptimization] Columns too narrow (${columnWidth.toFixed(0)}px < ${idealColumnWidth * 0.7}px) → Suggest -1 column`);
        return -1;
    }

    return 0;
}

/**
 * Calculate density (how packed the content is)
 * Returns: 0.0 to 1.0+ (higher = more packed)
 */
function calculateDensity(
    columns: number,
    context: { groupCount: number; totalProductCount: number }
): number {
    const effectiveUnits = context.totalProductCount + (context.groupCount * 1.5);
    const avgItemsPerColumn = effectiveUnits / columns;
    const idealItemsPerColumn = 12; // Ideal number of items per column

    const density = avgItemsPerColumn / idealItemsPerColumn;

    return density;
}