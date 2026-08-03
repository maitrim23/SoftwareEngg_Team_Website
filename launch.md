# Launch Checklist & Details

The project has now been completely set up! The backend logic is wired correctly to the frontend, and the site is ready to be launched to the world.

## 1. Backend Architecture (Supabase)
Your backend is hosted securely and effortlessly on Supabase.
- **Database Tables**: Complete and secured by RLS.
- **Authentication**: Fully active.
- **File Versioning**: Powered by the custom Edge Function (`upload-file`).
- **CI/CD Pipeline**: GitHub Actions will auto-deploy backend changes.

## 2. Frontend Connectivity
The vanilla HTML/JS frontend has now been updated to correctly talk to the `upload-file` Edge Function instead of skipping the version history.
- When an authenticated user selects a file, they will be prompted to enter a **Commit Message**.
- The file is pushed to the `project-files` storage bucket.
- The Edge Function safely creates a new version record without overwriting old history.

## 3. How to Deploy the Website
Since this is a static site (HTML/CSS/JS), it is incredibly easy to launch.

> [!TIP]
> We recommend **Vercel** or **Netlify** for the fastest deployment.

1. Create a free account on [Vercel](https://vercel.com).
2. Click "Add New Project" and link your GitHub repository.
3. Keep the default settings (it automatically detects static HTML sites).
4. Click **Deploy**.

Within 30 seconds, your team's website will be live on a public URL!

## 4. Final Post-Launch Step
Once Vercel gives you your live URL (e.g., `https://swe-project.vercel.app`), go to your **Supabase Dashboard**:
- Navigate to **Authentication -> URL Configuration**
- Update the **Site URL** to match your new Vercel link.
- This ensures that if team members forget their passwords, the reset emails will send them back to the correct website instead of `localhost`.
