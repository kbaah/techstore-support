# TechStore Support Deployment Guide

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│  AWS App Runner │────▶│   MCP Server    │
│   (Next.js)     │     │   (FastAPI)     │     │   (Products DB) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed (for local testing)
- Vercel CLI installed (`npm i -g vercel`)
- OpenAI API key

---

## Step 1: Deploy FastAPI Backend to AWS App Runner

### Option A: Deploy via AWS Console

1. **Push code to GitHub** (if not already)

2. **Go to AWS App Runner Console**
   - Navigate to: https://console.aws.amazon.com/apprunner

3. **Create Service**
   - Click "Create service"
   - Source: "Source code repository"
   - Connect to your GitHub repository
   - Select the `techstore-support` folder

4. **Configure Build**
   - Runtime: Python 3.12
   - Build command: `pip install uv && uv pip install --system .`
   - Start command: `uvicorn api:app --host 0.0.0.0 --port 8000`
   - Port: 8000

5. **Configure Service**
   - Service name: `techstore-support-api`
   - CPU: 1 vCPU
   - Memory: 2 GB

6. **Set Environment Variables**
   ```
   OPENAI_API_KEY=sk-your-key-here
   MCP_SERVER_URL=https://vipfapwm3x.us-east-1.awsapprunner.com/mcp
   ALLOWED_ORIGINS=http://localhost:3000
   ```

7. **Create & Deploy**
   - Click "Create & deploy"
   - Wait for deployment (5-10 minutes)
   - Note the service URL (e.g., `https://xxxxx.us-east-1.awsapprunner.com`)

### Option B: Deploy via AWS CLI

```bash
# Navigate to the techstore-support directory
cd techstore-support

# Create ECR repository
aws ecr create-repository --repository-name techstore-support-api

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push Docker image
docker build -t techstore-support-api .
docker tag techstore-support-api:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/techstore-support-api:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/techstore-support-api:latest

# Create App Runner service (use console or CloudFormation for easier env var management)
```

---

## Step 2: Deploy Next.js Frontend to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Go to Vercel**: https://vercel.com

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Set root directory to `techstore-support/frontend`

3. **Configure Environment Variables**
   ```
   API_URL=https://xxxxx.us-east-1.awsapprunner.com
   ```
   (Use the App Runner URL from Step 1)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Note your Vercel URL (e.g., `https://techstore-support.vercel.app`)

### Option B: Deploy via Vercel CLI

```bash
# Navigate to frontend directory
cd techstore-support/frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variable
vercel env add API_URL production
# Enter: https://xxxxx.us-east-1.awsapprunner.com

# Redeploy with env var
vercel --prod
```

---

## Step 3: Update CORS Settings

After getting your Vercel URL, update the App Runner environment:

1. Go to AWS App Runner Console
2. Select your service
3. Go to "Configuration" → "Edit"
4. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://techstore-support.vercel.app,http://localhost:3000
   ```
5. Save and redeploy

---

## Local Development

### Run Backend
```bash
cd techstore-support
uv sync
uv run python api.py
# Runs on http://localhost:8000
```

### Run Frontend
```bash
cd techstore-support/frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## Environment Variables Reference

### Backend (App Runner)
| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `MCP_SERVER_URL` | MCP server endpoint | `https://vipfapwm3x.us-east-1.awsapprunner.com/mcp` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://myapp.vercel.app,http://localhost:3000` |

### Frontend (Vercel)
| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Backend API URL | `https://xxxxx.us-east-1.awsapprunner.com` |

---

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your Vercel domain
- Check that the URL doesn't have a trailing slash

### 502/503 Errors on App Runner
- Check App Runner logs in CloudWatch
- Ensure `OPENAI_API_KEY` is set correctly
- Verify the health check endpoint (`/health`) is responding

### Voice Input Not Working
- Speech recognition requires HTTPS in production
- Vercel provides HTTPS by default

### Evaluation Dashboard Empty
- Data is stored in memory; it resets when App Runner redeploys
- For persistence, integrate a database (DynamoDB, RDS, etc.)
