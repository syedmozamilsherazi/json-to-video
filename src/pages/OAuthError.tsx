import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';

export default function OAuthError() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract error details from URL search params
  const searchParams = new URLSearchParams(location.search);
  const error = searchParams.get('error') || 'unknown_error';
  const details = searchParams.get('details') || '';

  // Error message mapping
  const errorMessages: Record<string, { title: string; description: string }> = {
    missing_code: {
      title: 'Authorization Failed',
      description: 'No authorization code was received from Whop. Please try logging in again.'
    },
    missing_state: {
      title: 'Security Error',
      description: 'Missing state parameter. This may indicate a security issue. Please try again.'
    },
    invalid_state: {
      title: 'Invalid Session',
      description: 'The authentication session is invalid or has expired. Please try logging in again.'
    },
    state_expired: {
      title: 'Session Expired',
      description: 'Your authentication session has expired. Please start the login process again.'
    },
    invalid_state_data: {
      title: 'Session Data Error',
      description: 'The session data is corrupted or invalid. Please try logging in again.'
    },
    token_exchange_failed: {
      title: 'Token Exchange Failed',
      description: 'Failed to exchange the authorization code for an access token. Please try again.'
    },
    failed_to_get_user: {
      title: 'User Info Error',
      description: 'Successfully authenticated but failed to retrieve user information. Please try again.'
    },
    init_failed: {
      title: 'OAuth Initialization Failed',
      description: 'Failed to initialize the OAuth flow. Please check your configuration.'
    },
    callback_failed: {
      title: 'Callback Processing Failed',
      description: 'An error occurred while processing the OAuth callback.'
    },
    unknown_error: {
      title: 'Unknown Error',
      description: 'An unexpected error occurred during authentication.'
    }
  };

  const errorInfo = errorMessages[error] || errorMessages.unknown_error;

  const handleRetry = () => {
    // Clear any existing auth state and redirect to login
    document.cookie = 'whop_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'whop_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Redirect to home page where user can try login again
    navigate('/', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {details && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Error Code:</strong> {error}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Details:</strong> {details}
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleRetry}
              className="w-full"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}