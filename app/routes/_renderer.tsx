import { jsxRenderer } from 'hono/jsx-renderer'
import { HasIslands } from 'honox/server'

export default jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          html {
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #1e293b;
          }

          body {
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
            color: #e2e8f0;
            background: transparent;
            min-height: 100vh;
          }

          /* 固定グラデーション背景 */
          .fixed-gradient {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background:
              radial-gradient(ellipse at 20% 30%, #1e3a5f 0%, transparent 80%),
              radial-gradient(ellipse at 80% 70%, #2d4a6b 0%, transparent 75%),
              linear-gradient(135deg, #1e293b 0%, #0f172a 20%, #1a2332 40%, #0c1420 60%, #0f172a 80%, #1e293b 100%);
            z-index: -1;
            pointer-events: none;
          }
        `}</style>
        {(import.meta as any).env?.PROD ? (
          <script type="module" src="/static/client.js"></script>
        ) : (
          <script type="module" src="/app/client.ts"></script>
        )}
      </head>
      <body>
        <div class="fixed-gradient"></div>
        <div class="container mx-auto px-4 pt-8 h-full flex flex-col">
          <div class="flex-1">{children}</div>
          <footer class="mt-auto text-center text-slate-600 text-sm py-4 border-t border-slate-700">
            <p>MIT License.</p>
          </footer>
        </div>
        <HasIslands>{''}</HasIslands>
      </body>
    </html>
  )
})
