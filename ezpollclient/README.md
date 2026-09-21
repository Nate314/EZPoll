# ezpollclient

Vue 3 + Vite single page app.

```
npm install
npm run dev      # dev server with hot reload
npm run build    # production build into dist/
```

At runtime the app reads `/config.json` (`{"api_url": "<socket server origin>"}`).
In Docker this file is generated at container start from `PUBLIC_SOCKET_URL`,
and the same value is used in the Content-Security-Policy `connect-src`.
For `npm run dev`, create `public/config.json` yourself (it is not committed).
