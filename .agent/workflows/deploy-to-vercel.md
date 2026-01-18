---
description: Deploy the application to Vercel
---

# Deploy to Vercel

This workflow guides you through deploying your Next.js application to Vercel.

1.  **Install Vercel CLI** (if not already installed):
    ```bash
    npm install -g vercel
    ```

2.  **Login to Vercel**:
    ```bash
    vercel login
    ```
    Follow the prompts to authenticate with your Vercel account.

3.  **Deploy**:
    Run the following command to deploy your project. It will ask a few configuration questions (you can usually accept the defaults).
    ```bash
    vercel
    ```

4.  **Production Deployment**:
    To deploy to production (after verifying the preview):
    ```bash
    vercel --prod
    ```

## Post-Deployment
- Go to your Vercel dashboard to view your live site.
- Configure environment variables in Vercel Project Settings if needed.
