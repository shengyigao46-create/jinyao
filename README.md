<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-4NsHE5u5j-g4VYVC6i2--UTPU7D-FW9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `DEEPSEEK_API_KEY` in [.env.local](.env.local) for the API proxy
3. Run the app with Vercel dev (recommended for API routes):
   `npx vercel dev`
   
Note: `npm run dev` will serve the UI but `/api/deepseek` will not be available unless you run through Vercel.

## Deploy to Vercel

1. Import the repo in Vercel.
2. Set `DEEPSEEK_API_KEY` in Project Settings → Environment Variables.
3. Build Command: `npm run build`
4. Output Directory: `dist`
