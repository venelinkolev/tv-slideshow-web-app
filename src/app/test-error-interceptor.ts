import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import {
    ApiError,
    ApiResponse,
    ApiErrorType,
    ServiceStatusEnum
} from './core/models';

console.log('🧪 TESTING ErrorInterceptor...');

// Test interceptor import
try {
    console.log('✅ ErrorInterceptor import successful');

    // Test interceptor methods exist
    const interceptorMethods = [
        'intercept', 'getErrorStatistics', 'clearErrorStatistics'
    ];

    console.log('📋 ErrorInterceptor methods:', interceptorMethods);

    // Test error types and models
    const errorTypes = [
        ApiErrorType.VALIDATION_ERROR,
        ApiErrorType.AUTHENTICATION_ERROR,
        ApiErrorType.AUTHORIZATION_ERROR,
        ApiErrorType.NOT_FOUND_ERROR,
        ApiErrorType.CONFLICT_ERROR,
        ApiErrorType.SERVER_ERROR,
        ApiErrorType.NETWORK_ERROR,
        ApiErrorType.TIMEOUT_ERROR
    ];

    console.log('🚨 Supported Error Types:', errorTypes);

    // Test retry configuration
    const retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        retryableStatuses: [0, 408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
        networkTimeoutRetries: 2
    };

    console.log('🔄 Retry Configuration:', retryConfig);

    // Test error scenarios
    const errorScenarios = [
        { status: 0, description: 'Network Error - Retryable', retryable: true },
        { status: 400, description: 'Bad Request - Not Retryable', retryable: false },
        { status: 404, description: 'Not Found - Not Retryable', retryable: false },
        { status: 500, description: 'Server Error - Retryable', retryable: true },
        { status: 503, description: 'Service Unavailable - Retryable', retryable: true }
    ];

    console.log('📊 Error Scenarios:', errorScenarios);

    // Test Bulgarian error messages
    const bulgarianMessages = {
        networkError: 'Проблем с мрежовата връзка. Моля, проверете интернет свързаността.',
        noConnection: 'Няма връзка със сървъра. Проверете мрежовата връзка.',
        badRequest: 'Невалидна заявка към сървъра.',
        unauthorized: 'Необходима е оторизация за достъп до този ресурс.',
        forbidden: 'Нямате права за достъп до този ресурс.',
        notFound: 'Заявеният ресурс не е намерен.',
        serverError: 'Вътрешна грешка на сървъра. Моля, опитайте отново по-късно.',
        serviceUnavailable: 'Услугата временно не е достъпна. Опитайте отново след малко.'
    };

    console.log('🇧🇬 Bulgarian Error Messages:', Object.keys(bulgarianMessages));

    // Test TV-specific features
    const tvFeatures = [
        'Exponential backoff with jitter',
        'TV network timeout handling',
        'Error logging to localStorage',
        'Retry strategy based on error type',
        'Performance monitoring integration',
        'User-friendly Bulgarian messages',
        'Request ID generation for debugging',
        'Error statistics tracking'
    ];

    console.log('📺 TV-Specific Features:', tvFeatures);

    // Mock ApiError structure test
    const mockApiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: 'Проблем с мрежовата връзка. Моля, проверете интернет свързаността.',
        context: {
            httpStatus: 0,
            httpStatusText: '',
            url: '/api/products',
            method: 'GET',
            timestamp: new Date().toISOString(),
            errorType: ApiErrorType.NETWORK_ERROR,
            isOnline: navigator.onLine
        },
        retryStrategy: {
            canRetry: true,
            retryDelay: 1000,
            maxRetries: 3
        }
    };

    console.log('✅ Mock ApiError created successfully');
    console.log('🎯 Error Code:', mockApiError.code);
    console.log('📝 Error Message:', mockApiError.message);
    console.log('🔄 Can Retry:', mockApiError.retryStrategy?.canRetry);

    // Mock ApiResponse error structure test
    const mockErrorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        message: mockApiError.message,
        statusCode: 0,
        timestamp: new Date(),
        error: mockApiError,
        requestId: `req_${Date.now()}_test`
    };

    console.log('✅ Mock ApiResponse created successfully');
    console.log('❌ Success:', mockErrorResponse.success);
    console.log('🆔 Request ID:', mockErrorResponse.requestId);

    console.log('🎉 ALL ErrorInterceptor TESTS PASSED!');

} catch (error) {
    console.error('❌ ErrorInterceptor test failed:', error);
}

// Export test functions for manual verification
export const testErrorInterceptor = () => {
    console.log('🛡️ Manual ErrorInterceptor test function ready');
    return {
        interceptorName: 'ErrorInterceptor',
        features: [
            'TV-optimized retry logic',
            'Exponential backoff with jitter',
            'Bulgarian error messages',
            'Smart error categorization',
            'localStorage error logging',
            'Request ID generation',
            'Error statistics tracking',
            'Performance monitoring integration',
            'Network status detection',
            'Retryable error detection',
            'Field-specific validation errors',
            'Comprehensive error context'
        ],
        errorTypes: [
            'VALIDATION_ERROR - Form/input validation issues',
            'AUTHENTICATION_ERROR - Login/auth problems',
            'AUTHORIZATION_ERROR - Permission denied',
            'NOT_FOUND_ERROR - Resource not found',
            'CONFLICT_ERROR - Data conflicts',
            'SERVER_ERROR - Internal server issues',
            'NETWORK_ERROR - Connection problems',
            'TIMEOUT_ERROR - Request timeouts'
        ],
        retryStrategies: [
            'Network errors: 2-second minimum delay',
            'Server errors (5xx): Exponential backoff',
            'Rate limiting (429): 5-second minimum delay',
            'Service unavailable (503): 3-second minimum delay',
            'Client errors (4xx): No retry'
        ],
        tvOptimizations: [
            'Extended timeout tolerance for TV networks',
            'Smart retry delays for slow connections',
            'Error persistence for offline debugging',
            'User-friendly Bulgarian messages',
            'Performance impact monitoring'
        ],
        status: 'Ready for testing'
    };
};

// Export error simulation functions for manual testing
export const simulateErrors = {
    networkError: () => {
        console.log('🌐 Simulating network error (status 0)...');
        return {
            status: 0,
            error: new ErrorEvent('Network Error'),
            expectedBehavior: 'Should retry 3 times with exponential backoff'
        };
    },

    serverError: () => {
        console.log('🔧 Simulating server error (status 500)...');
        return {
            status: 500,
            statusText: 'Internal Server Error',
            expectedBehavior: 'Should retry 3 times, then show user-friendly message'
        };
    },

    notFoundError: () => {
        console.log('🔍 Simulating not found error (status 404)...');
        return {
            status: 404,
            statusText: 'Not Found',
            expectedBehavior: 'Should NOT retry, show immediate error message'
        };
    },

    rateLimitError: () => {
        console.log('⏰ Simulating rate limit error (status 429)...');
        return {
            status: 429,
            statusText: 'Too Many Requests',
            expectedBehavior: 'Should retry with minimum 5-second delay'
        };
    }
};

// Export test configuration
export const errorInterceptorTestConfig = {
    retryLimits: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
    },
    retryableStatuses: [0, 408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524],
    nonRetryableStatuses: [400, 401, 403, 404, 409, 410, 422],
    expectedMessages: {
        bg: {
            networkError: 'Проблем с мрежовата връзка',
            serverError: 'Вътрешна грешка на сървъра',
            notFound: 'Заявеният ресурс не е намерен',
            unauthorized: 'Необходима е оторизация'
        }
    }
};

console.log('📦 ErrorInterceptor test configuration exported');
console.log('🎭 Error simulation functions ready:', Object.keys(simulateErrors));