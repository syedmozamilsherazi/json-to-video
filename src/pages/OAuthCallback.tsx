import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('OAuth callback - Local development');
        console.log('Code:', code ? 'Present' : 'Missing');
        console.log('State:', state);
        console.log('Error:', error);

        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          return;
        }

        if (!state) {
          setStatus('error');
          setMessage('No state parameter received');
          return;
        }

        // Verify state matches what we stored
        const storedState = localStorage.getItem('oauth_state');
        if (storedState !== state) {
          setStatus('error');
          setMessage('Invalid state parameter - possible CSRF attack');
          return;
        }

        setMessage('Exchanging code for access token...');

        // For local development, we need to call the production API to exchange the code
        // since we don't have the server-side Whop SDK locally
        const response = await fetch('https://json-to-video.vercel.app/api/oauth-callback?' + searchParams.toString(), {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // The API endpoint will redirect, but since we're calling it from fetch, we get the final URL
        const finalUrl = response.url;
        console.log('Final redirect URL:', finalUrl);

        // Parse the URL to get auth status and user info from the backend redirect
        const url = new URL(finalUrl);
        const authSuccess = url.searchParams.get('auth');
        const userId = url.searchParams.get('user_id');
        const hasAccess = url.searchParams.get('has_access');
        
        // For the new callback system, we get cookies instead of URL params
        // But we still check URL params for compatibility

        if (authSuccess === 'success' && userId) {
          // The backend has already set the necessary cookies
          // We just need to confirm the authentication worked
          setStatus('success');
          setMessage(hasAccess === 'true' 
            ? '✅ Authentication successful! You have premium access.' 
            : '✅ Authentication successful! Please subscribe to get premium access.'
          );

          // Clear the OAuth state
          localStorage.removeItem('oauth_state');

          // Redirect to the appropriate page based on access
          setTimeout(() => {
            if (hasAccess === 'true') {
              navigate('/generator', { replace: true });
            } else {
              navigate('/home', { replace: true }); // Redirect to subscription page if no access
            }
          }, 1500);

        } else {
          setStatus('error');
          setMessage('Failed to complete authentication - please try again');
        }

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">
          {status === 'processing' && '⏳ Processing...'}
          {status === 'success' && '✅ Success!'}
          {status === 'error' && '❌ Error'}
        </h1>
        
        <div className="mb-6">
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          )}
          <p className="text-gray-600">{message}</p>
        </div>

        {status === 'error' && (
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Return Home
          </button>
        )}

        {status === 'success' && (
          <div className="text-sm text-gray-500">
            Redirecting you to the app...
          </div>
        )}
      </div>
    </div>
  );
}