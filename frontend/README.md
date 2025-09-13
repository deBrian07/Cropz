## Cropz Frontend

Dev commands:

```bash
npm run dev     # start Next.js dev server on :3000
npm run build   # production build
```

Environment variables (create `.env.local`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Pages:
- `/` landing with Google sign-in and guest option
- `/dashboard` questionnaire that posts to the backend at `http://127.0.0.1:8001/score`
