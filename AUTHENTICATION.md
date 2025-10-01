# 🔐 Authentication System

The CDP Utility App now includes a complete authentication system powered by Supabase.

## Features

✅ **User Registration** with email verification  
✅ **Login/Logout** functionality  
✅ **Password Reset** via email  
✅ **Protected Routes** - portfolio requires authentication  
✅ **Guest Mode** - continue without account (localStorage only)  
✅ **Secure** - Row Level Security (RLS) enabled

## Routes

- `/login` - Login page
- `/register` - Create new account
- `/forgot-password` - Reset password
- `/` - Main app (requires login)
- `/guest` - Guest mode (no login required)

## How It Works

### For New Users:
1. Go to https://coindepo-calculator.vercel.app
2. You'll be redirected to `/login`
3. Click "Sign up" to create an account
4. Check your email for verification link
5. Click the link to verify your email
6. Login with your credentials
7. Your portfolio will be saved to your account

### For Existing Users (with localStorage data):
1. Register/Login to create an account
2. Your existing portfolio data will be automatically imported
3. Data syncs across all your devices

### Guest Mode:
1. Click "Continue as guest" on login page
2. Portfolio data stored in localStorage only
3. No sync across devices
4. Data may be lost if browser cache is cleared

## Database Structure

```sql
portfolios (
  id: UUID (primary key)
  user_id: UUID (references auth.users)
  assets: JSONB
  coindepo_holdings: JSONB
  loans: JSONB
  settings: JSONB
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

## Security

- **Row Level Security (RLS)** enabled
- Users can only access their own portfolio
- API keys are environment variables (not in code)
- Passwords hashed by Supabase Auth
- Email verification required

## Environment Variables

Required in `.env` file:

```
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Deployment

Environment variables are configured in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Support

For issues or questions, please open an issue on GitHub.

