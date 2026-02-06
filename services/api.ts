
import {
  User,
  Product,
  Category,
  DashboardStats,
  StockStatus,
  UserRole,
  TransactionType,
  StockTransaction,
  SpecType
} from '../types';

// Get Google Apps Script URL from environment variable
const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

/**
 * Main function to call Google Apps Script backend
 * @param fn - The action/function name to call on the backend
 * @param payload - The data payload to send
 * @returns Promise with the response data
 */
export async function callBackend<T>(fn: string, payload: any = {}): Promise<T> {
  // If SCRIPT_URL is not configured, show helpful error
  if (!SCRIPT_URL) {
    throw new Error(
      'Google Apps Script URL not configured. Please add VITE_GOOGLE_SCRIPT_URL to your .env.local file. ' +
      'See setup-guide.md for instructions.'
    );
  }

  try {
    // Google Apps Script has CORS issues with POST + JSON from localhost
    // Solution: Use GET with URL parameters to avoid preflight
    const params = new URLSearchParams({
      action: fn,
      data: JSON.stringify(payload)
    });

    const url = `${SCRIPT_URL}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check if the response contains an error
    if (data.error) {
      throw new Error(data.error);
    }

    return data as T;
  } catch (error: any) {
    console.error('❌ Error:', error);
    // Provide more helpful error messages
    if (error.message.includes('Failed to fetch')) {
      throw new Error(
        'Unable to connect to Google Apps Script. Please check:\n' +
        '1. Your internet connection\n' +
        '2. The VITE_GOOGLE_SCRIPT_URL in .env.local is correct\n' +
        '3. The Google Apps Script is deployed as a web app'
      );
    }
    throw error;
  }
}
