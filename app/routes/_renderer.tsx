import { jsxRenderer } from 'hono/jsx-renderer'
import { HasIslands } from 'honox/server'

export default jsxRenderer(({ children, title }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} - Runbook Admin` : 'Runbook Admin'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
          }
          .gradient-bg {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          }
        `}</style>
        {import.meta.env.PROD ? (
          <script type="module" src="/static/client.js"></script>
        ) : (
          <script type="module" src="/app/client.ts"></script>
        )}
      </head>
      <body class="gradient-bg min-h-screen">
        <div class="container mx-auto px-4 py-8">
          {children}
        </div>
        <HasIslands />
      </body>
    </html>
  )
})