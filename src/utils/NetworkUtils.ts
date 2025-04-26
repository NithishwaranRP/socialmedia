import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';

// Timeout in milliseconds (15 seconds)
const DEFAULT_TIMEOUT = 15000;

// Custom error class for network-related issues
export class NetworkError extends Error {
  public isNetworkError: boolean;
  public originalError?: any;
  public code?: string;

  constructor(message: string, originalError?: any, code?: string) {
    super(message);
    this.name = 'NetworkError';
    this.isNetworkError = true;
    this.originalError = originalError;
    this.code = code;
  }
}

/**
 * Check if the device is currently connected to the internet
 */
export const checkNetworkConnection = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
};

/**
 * Execute an API request with proper error handling and connection checking
 */
export const executeRequest = async <T>(
  requestConfig: AxiosRequestConfig,
  retryCount = 0,
  maxRetries = 2
): Promise<T> => {
  try {
    // First check if network is connected
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      throw new NetworkError('No internet connection. Please check your network and try again.');
    }

    // Set default timeout if not provided
    if (!requestConfig.timeout) {
      requestConfig.timeout = DEFAULT_TIMEOUT;
    }

    // Start timestamp for logging
    const startTime = Date.now();
    
    // Log request details
    console.log(`[API Request] ${requestConfig.method?.toUpperCase() || 'GET'} ${requestConfig.url}`, 
                 requestConfig.data ? JSON.stringify(requestConfig.data).substring(0, 500) : '');
    
    // Execute request
    const response: AxiosResponse<T> = await axios(requestConfig);
    
    // Log response time and basic info
    const elapsedTime = Date.now() - startTime;
    console.log(`[API Response] ${requestConfig.method?.toUpperCase() || 'GET'} ${requestConfig.url} - ${response.status} (${elapsedTime}ms)`);
    
    return response.data;
  } catch (error: any) {
    // Get elapsed time for logging
    const axiosError = error as AxiosError;
    
    // Format error for logging
    console.error(`[API Error] ${requestConfig.method?.toUpperCase() || 'GET'} ${requestConfig.url}`, 
                  axiosError.response?.status || '', 
                  axiosError.code || '',
                  axiosError.message);

    // Handle timeout errors
    if (axiosError.code === 'ECONNABORTED') {
      throw new NetworkError('Request timed out. Please try again later.', error, 'TIMEOUT');
    }

    // Handle server errors
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      if (retryCount < maxRetries) {
        console.log(`Retrying request (${retryCount + 1}/${maxRetries})`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        return executeRequest(requestConfig, retryCount + 1, maxRetries);
      }
      throw new NetworkError('Server error. Please try again later.', error, 'SERVER_ERROR');
    }

    // Handle other errors
    throw new NetworkError(
      axiosError.response?.data?.error?.message || 
      axiosError.response?.data?.message || 
      axiosError.message || 
      'An unexpected error occurred', 
      error, 
      axiosError.code
    );
  }
};

/**
 * Execute a GET request
 */
export const get = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return executeRequest<T>({
    ...config,
    method: 'get',
    url,
  });
};

/**
 * Execute a POST request
 */
export const post = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return executeRequest<T>({
    ...config,
    method: 'post',
    url,
    data,
  });
};

export default {
  get,
  post,
  executeRequest,
  checkNetworkConnection,
}; 