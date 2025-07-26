import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(
  ({ children }) => {
    return (
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <Script src="/app/client.ts" />
          <Link href="/app/style.css" rel="stylesheet" />
        </head>
        <body>
          <div class="fixed-gradient" />
          <div class="container mx-auto px-4 pt-8 h-full flex flex-col">
            <div class="flex-1">{children}</div>
            <footer class="mt-8 text-center text-slate-600 text-sm py-4 border-t border-slate-700">
              <p>MIT License.</p>
            </footer>
          </div>
        </body>
      </html>
    )
  },
  {
    stream: true,
  },
)
