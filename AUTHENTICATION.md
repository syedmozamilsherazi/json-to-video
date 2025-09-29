# Authentication System Documentation

## Overview

This application now uses a robust authentication system that works across devices, replacing the previous localStorage-only approach.

## How It Works

### 1. Cross-Device Authentication
- **Cookies**: Session tokens are stored in HTTP cookies (not localStorage)
- **Server-side validation**: All authentication is verified server-side
- **OAuth flow**: Uses Whop's proper OAuth 2.0 flow for secure authentication

### 2. Authentication Flow

#### For New Users:
1. User clicks "Subscribe Now" → Redirects to Whop checkout
2. After payment → Whop redirects back with payment confirmation
3. User clicks "Login with Whop" → Starts OAuth flow
4. User authorizes app → Whop redirects to `/api/auth/callback`
5. Server exchanges code for access token → Creates secure session
6. User is redirected back to app with session cookie

#### For Returning Users:
1. User visits app → Server checks session cookie
2. If valid → User gets immediate access
3. If invalid/expired → User needs to login again
4. Works on any device where they're logged into Whop

### 3. Session Management

#### Session Storage:
```javascript
// Session data is stored as base64-encoded JSON in HTTP cookies
{
  access_token: "user_oauth_token",
  refresh_token: "refresh_token", 
  user_id: "whop_user_id",
  expires_at: timestamp
}
```

#### Session Validation:
- Server validates session on every request
- Checks token expiration
- Verifies with Whop API
- Returns user info and subscription status

### 4. API Endpoints

#### `/api/auth/callback` (GET)
- Handles OAuth callback from Whop
- Exchanges authorization code for access token
- Creates secure session cookie
- Redirects user back to app

#### `/api/check-access` (POST)
- Validates user session
- Checks subscription status
- Returns user info and access permissions
- Supports multiple token formats for backward compatibility

### 5. Frontend Integration

#### WhopContext Provider:
```typescript
const { hasAccess, user, login, logout } = useWhop();
```

#### Key Features:
- `hasAccess`: Boolean indicating if user has premium access
- `user`: User profile information
- `login()`: Initiates OAuth login flow
- `logout()`: Clears session and refreshes page
- `isCheckingAccess`: Loading state for initial auth check

## Setup Instructions

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in:

```bash
# Required for OAuth
WHOP_APP_ID=your_whop_app_id
WHOP_CLIENT_SECRET=your_whop_client_secret

# Frontend needs app ID too
VITE_WHOP_APP_ID=your_whop_app_id
```

### 2. Whop App Configuration
In your Whop Developer Console:
1. Set redirect URI to: `https://yourdomain.com/api/auth/callback`
2. Enable required scopes: `user:read`, `subscriptions:read`
3. Configure webhook endpoints if needed

### 3. Deployment
- Deploy to Vercel (or similar platform)
- Ensure environment variables are set
- Test OAuth flow end-to-end

## Benefits

### ✅ Cross-Device Access
- User subscribes on laptop → Can access on phone immediately
- Session persists across browser sessions
- No need to re-authenticate frequently

### ✅ Security
- Server-side token validation
- Secure HTTP cookies (not localStorage)
- OAuth 2.0 standard flow
- Automatic token refresh

### ✅ User Experience
- One-click login for returning users
- Automatic subscription status sync
- Clear authentication states
- Proper error handling

## Migration from localStorage

The system maintains backward compatibility:
1. First tries to decode session cookie
2. Falls back to direct bearer token validation
3. Still supports legacy localStorage tokens (temporarily)

Users with localStorage tokens will need to login once to get proper sessions.

## Troubleshooting

### Common Issues:

1. **"Session expired" errors**
   - Sessions last 7 days by default
   - User needs to login again
   - Consider implementing refresh token flow

2. **OAuth redirect issues**
   - Check redirect URI configuration
   - Ensure HTTPS in production
   - Verify app ID and client secret

3. **Cross-device not working**
   - Check cookie settings
   - Ensure user is logged into same Whop account
   - Clear browser cache/cookies if needed

### Debug Mode:
Enable detailed logging by setting `NODE_ENV=development` in your environment.