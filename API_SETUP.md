# API Setup Guide

## Judge0 API Key Setup

To enable code execution, you need a Judge0 API key from RapidAPI:

### Steps:
1. Go to [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce/)
2. Sign up/Login to RapidAPI
3. Subscribe to Judge0 CE (free tier available)
4. Copy your API key from the dashboard
5. Add it to your `.env` file:

```env
REACT_APP_API_KEY=your_actual_api_key_here
```

### Free Tier Limits:
- 50 requests per day
- Basic language support
- No commercial use

### Alternative (Local Judge0):
You can also run Judge0 locally using Docker:
```bash
docker run -p 2358:2358 judge0/judge0:1.13.0
```

Then update the API URL in Editor.js to use `http://localhost:2358`