import { createClient } from '@/lib/supabase';

export interface VerificationResult {
  success: boolean;
  error?: string;
  code?: string; // Only in development
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  email?: string;
  phone_number?: string;
}

export const VerificationService = {
  /**
   * Send verification code to school email
   */
  async sendSchoolEmailVerification(email: string, userId: string): Promise<VerificationResult> {
    const supabase = createClient();

    try {
      // Validate email format
      if (!email || !email.endsWith('.edu')) {
        return {
          success: false,
          error: 'Please enter a valid .edu email address',
        };
      }

      let data, error;
      try {
        const response = await supabase.functions.invoke('verify-school-email', {
          body: {
            email: email.toLowerCase(),
            user_id: userId,
          },
        });
        data = response.data;
        error = response.error;
      } catch (invokeError: any) {
        return {
          success: false,
          error: invokeError?.message || 'Failed to send request to Edge Function. Make sure the function is deployed.',
        };
      }

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to send verification code',
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: data.error === 'invalid_email_format' 
            ? 'Please enter a valid .edu email address'
            : 'Failed to send verification code',
        };
      }

      return {
        success: true,
        ...(data?.code ? { code: data.code } : {}), // Only in development
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send verification code',
      };
    }
  },

  /**
   * Validate school email verification code
   */
  async validateSchoolEmailCode(
    email: string,
    code: string,
    userId: string
  ): Promise<ValidationResult> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase.functions.invoke('validate-school-email-code', {
        body: {
          email: email.toLowerCase(),
          code: code.trim(),
          user_id: userId,
        },
      });

      if (error) {
        return {
          valid: false,
          error: error.message || 'Failed to validate code',
        };
      }

      if (data?.error) {
        let errorMessage = 'Invalid verification code';
        if (data.error === 'code_expired') {
          errorMessage = 'Verification code has expired. Please request a new one.';
        } else if (data.error === 'invalid_code') {
          errorMessage = 'Invalid verification code. Please try again.';
        }

        return {
          valid: false,
          error: errorMessage,
        };
      }

      if (data?.valid === true) {
        return {
          valid: true,
          email: data.email,
        };
      }

      return {
        valid: false,
        error: 'Invalid verification code',
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to validate code',
      };
    }
  },

  /**
   * Send verification code to phone number
   */
  async sendPhoneVerification(phoneNumber: string, userId: string): Promise<VerificationResult> {
    const supabase = createClient();

    try {
      // Basic phone validation (should be in E.164 format: +1234567890)
      if (!phoneNumber || !phoneNumber.startsWith('+')) {
        return {
          success: false,
          error: 'Please enter a valid phone number with country code (e.g., +1234567890)',
        };
      }

      const { data, error } = await supabase.functions.invoke('verify-phone-number', {
        body: {
          phone_number: phoneNumber,
          user_id: userId,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to send verification code',
        };
      }

      if (data?.error) {
        return {
          success: false,
          error: data.error === 'invalid_phone_format'
            ? 'Please enter a valid phone number with country code'
            : 'Failed to send verification code',
        };
      }

      return {
        success: true,
        ...(data?.code ? { code: data.code } : {}), // Only in development
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send verification code',
      };
    }
  },

  /**
   * Validate phone verification code
   */
  async validatePhoneCode(
    phoneNumber: string,
    code: string,
    userId: string
  ): Promise<ValidationResult> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase.functions.invoke('validate-phone-code', {
        body: {
          phone_number: phoneNumber,
          code: code.trim(),
          user_id: userId,
        },
      });

      if (error) {
        return {
          valid: false,
          error: error.message || 'Failed to validate code',
        };
      }

      if (data?.error) {
        let errorMessage = 'Invalid verification code';
        if (data.error === 'code_expired') {
          errorMessage = 'Verification code has expired. Please request a new one.';
        } else if (data.error === 'invalid_code') {
          errorMessage = 'Invalid verification code. Please try again.';
        }

        return {
          valid: false,
          error: errorMessage,
        };
      }

      if (data?.valid === true) {
        return {
          valid: true,
          phone_number: data.phone_number,
        };
      }

      return {
        valid: false,
        error: 'Invalid verification code',
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to validate code',
      };
    }
  },
};
