#!/usr/bin/env bun

import fs from 'node:fs/promises'
import path from 'node:path'
import bun from 'bun'

const mkdir = async (filepath: string) => {
  if (await fs.exists(filepath)) {
    return
  }
  await fs.mkdir(filepath, { recursive: true })
  console.log(`created ${filepath}`)
}

const writeFile = async (filepath: string, data: string) => {
  if (await fs.exists(filepath)) {
    return
  }
  await fs.writeFile(filepath, data)
  console.log(`created ${filepath}`)
}

const spawn = async (cmd: string[]) => {
  const proc = bun.spawn(cmd)
  await proc.exited
}

const root = process.cwd()
console.log(root)

const package_json_path = path.join(root, 'package.json')

if (await fs.exists(package_json_path)) {
  console.log('package.json already existed, skip creating')
  process.exit()
}

if (await fs.exists(package_json_path)) {
  console.log('package.json already existed, skip creating')
  process.exit()
}
await mkdir('config')
await mkdir('src/graphql')
await mkdir('src/restful')
await mkdir('src/websocket')
await mkdir('src/web/pages')

await writeFile(
  'src/graphql/graphiql.html',
  `
<!--
 *  Copyright (c) 2025 GraphQL Contributors
 *  All rights reserved.
 *
 *  This source code is licensed under the license found in the
 *  LICENSE file in the root directory of this source tree.
-->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GraphiQL</title>
    <style>
      body {
        margin: 0;
      }

      #graphiql {
        height: 100dvh;
      }

      .loading {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
      }
    </style>
    <link rel="stylesheet" href="https://esm.sh/graphiql/dist/style.css" />
    <link
      rel="stylesheet"
      href="https://esm.sh/@graphiql/plugin-explorer/dist/style.css"
    />
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@19.1.0",
          "react/": "https://esm.sh/react@19.1.0/",

          "react-dom": "https://esm.sh/react-dom@19.1.0",
          "react-dom/": "https://esm.sh/react-dom@19.1.0/",

          "graphiql": "https://esm.sh/graphiql?standalone&external=react,react-dom,@graphiql/react,graphql",
          "graphiql/": "https://esm.sh/graphiql/",
          "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer?standalone&external=react,@graphiql/react,graphql",
          "@graphiql/react": "https://esm.sh/@graphiql/react?standalone&external=react,react-dom,graphql,@graphiql/toolkit,@emotion/is-prop-valid",

          "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit?standalone&external=graphql",
          "graphql": "https://esm.sh/graphql@16.11.0",
          "@emotion/is-prop-valid": "data:text/javascript,"
        }
      }
    </script>
    <script type="module">
      import React from 'react'
      import ReactDOM from 'react-dom/client'
      import { GraphiQL, HISTORY_PLUGIN } from 'graphiql'
      import { createGraphiQLFetcher } from '@graphiql/toolkit'
      import { explorerPlugin } from '@graphiql/plugin-explorer'
      import 'graphiql/setup-workers/esm.sh'

      let urlobj = new URL(window.location.href)
      urlobj.searchParams.set('debug', true)
      const url = urlobj.toString()
      const fetcher = createGraphiQLFetcher({ url })

      const plugins = [HISTORY_PLUGIN, explorerPlugin()]

      function App() {
        return React.createElement(GraphiQL, {
          fetcher,
          plugins,
          defaultEditorToolsVisibility: true,
        })
      }

      const container = document.getElementById('graphiql')
      const root = ReactDOM.createRoot(container)
      root.render(React.createElement(App))
    </script>
  </head>
  <body>
    <div id="graphiql">
      <div class="loading">Loading…</div>
    </div>
  </body>
</html>
`,
)

await writeFile(
  'src/graphql/api.ts',
  `
export const echo = async (
  { message }: { message: any },
  { session }: { session: any },
) => {
  console.log({ session })
  console.log({ message })
  return message
}
`,
)

await writeFile(
  'src/graphql/graphql.d.ts',
  `
declare module '*.graphql' {
  const value: string
  export default value
}
`,
)

await writeFile(
  'src/graphql/schema.graphql',
  `
scalar JSON

type Query {
  echo(message: JSON!): JSON
}
`,
)

await writeFile(
  'src/graphql/resolver.ts',
  `
export default {}
`,
)

await writeFile(
  'src/graphql/index.ts',
  `
import type { BunRequest } from 'bun'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { createHandler } from 'graphql-http/lib/use/fetch'
import typeDefs from './schema.graphql' with { type: 'text' }
import * as rootValue from './api'
import resolvers from './resolver'

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

export const createGraphqlHandler = (context: any) =>
  createHandler({
    schema,
    rootValue,
    context,
  })


export const graphql = {
  '/graphql': {
    GET: async (req: BunRequest) => {
      return new Response(
        Bun.file(fileURLToPath(import.meta.resolve('./graphiql.html'))),
      )
    },
    POST: async (req: BunRequest) => {
      const context = {}
      const handler = createGraphqlHandler(context)
      return handler(req)
    },
  },
}
`,
)

await writeFile(
  'src/restful/index.ts',
  `
import type { BunRequest } from 'bun'

export const restful = {
  '/hello/:id': async (req: BunRequest) => {
    return new Response('hello ' + req.params.id)
  }
}
`,
)

await writeFile(
  'src/websocket/index.ts',
  `
import type { ServerWebSocket, BunRequest, Server } from "bun"

export const upgrade = {
  '/channel': async (req: BunRequest, server: Server<undefined>) => {
    if (server.upgrade(req)) {
      return; // do not return a Response
    }
    return new Response("Upgrade failed", { status: 500 });
  },
}

export const websocket = {
  message(ws: ServerWebSocket, message: string | Buffer) {
    ws.send(message)
  },
  open(ws: ServerWebSocket) {
    console.log('ws connected')
  },
  close(ws: ServerWebSocket) {
    console.log('ws closed')
  },
}
`,
)

await writeFile('src/web/logo.svg', ``)

await writeFile(
  'src/web/styles.css',
  `
@import 'tailwindcss';
@plugin "daisyui";
`,
)

await writeFile(
  'src/web/index.html',
  `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="./logo.svg" />
    <title>Dashboard</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`,
)

await writeFile(
  'src/web/main.tsx',
  `
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import * as layout from './layout'

export const router = createBrowserRouter([layout])

const elem = document.getElementById('root')!
const app = <RouterProvider router={router} />

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem))
  root.render(app)
} else {
  createRoot(elem).render(app)
}
`,
)

await writeFile(
  'src/web/pages/home.tsx',
  `
import { useState } from 'react'

export const index = true

export function Component() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <button className="btn" onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}
`,
)

await writeFile(
  'src/web/pages/about.tsx',
  `
import {
  Form,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router'
import { useEffect, useState, type FormEvent } from 'react'

export const path = 'about'

export async function loader({ params }: LoaderFunctionArgs) {
  console.log({ params })
  return { message: 'hello world' }
}

export async function action({ request }: ActionFunctionArgs) {
  let formData = await request.formData()
  let title = formData.get('title') as string
  console.log({ title })
  return { title }
}

export function Component() {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3000/channel')

    socket.addEventListener('message', (event) => {
      console.log(event.data)
    })

    setSocket(socket)

    return () => socket.close()
  }, [])

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    socket?.send(JSON.stringify(data))
  }

  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  return (
    <div>
      <h1>{data.message}</h1>
      <h2>api</h2>
      <Form method="post">
        <input type="text" name="title" className="input" />
        <button type="submit" className="btn">
          Submit
        </button>
      </Form>
      {actionData ? <p>{actionData.title} updated</p> : null}
      <h2>websocket</h2>
      <form method="post" onSubmit={handleSend}>
        <input type="text" name="message" className="input" />
        <button type="submit" className="btn">
          Send
        </button>
      </form>
    </div>
  )
}
`,
)
await writeFile(
  'src/web/layout.tsx',
  `
import { Link, Outlet } from 'react-router'
import { useState } from 'react'
import * as home from './pages/home'
import * as about from './pages/about'

export const path = '/'

export const children = [home, about]

export function Component() {
  const [theme, setTheme] = useState('dark')
  return (
    <div data-theme={theme} className="min-h-screen">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <Link to={'/'} className="btn btn-ghost text-xl">
            ERS
          </Link>
        </div>
        <div className="flex-none">
          <input
            type="checkbox"
            value={theme}
            onChange={(e) => {
              setTheme(e.target.checked ? 'light' : 'dark')
            }}
            className="toggle"
          />
          <ul className="menu menu-horizontal px-1">
            <li>
              <Link to={'/'}>Home</Link>
            </li>
            <li>
              <Link to={'/about'}>About</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="p-6">
        <Outlet />
      </div>
    </div>

  )
}
`,
)

await writeFile(
  'index.ts',
  `
import { serve } from 'bun'
import index from './src/web/index.html'
import { restful } from './src/restful'
import { graphql } from './src/graphql'
import { upgrade, websocket } from './src/websocket'

const server = serve({
  development: process.env.NODE_ENV != 'production',
  routes: {
    ...restful,
    ...graphql,
    ...upgrade,
    '/*': index,
  },
  websocket,
})

console.log(\`http server started at \${server.url}\`)
`,
)

await writeFile(
  'bunfig.toml',
  `
[serve.static]
plugins = ["bun-plugin-tailwind"]
`,
)

await spawn(['bun', 'init', '-y'])
await spawn(['rm', 'CLAUDE.md'])

const { default: pkg } = await import(package_json_path, {
  with: { type: 'json' },
})
pkg.scripts = pkg.scripts || {}
pkg.scripts.dev = 'bun --watch index.ts'
pkg.scripts.start = 'NODE_ENV=production bun index.ts'
pkg.type = 'module'
pkg.main = 'index.ts'

await fs.writeFile(package_json_path, JSON.stringify(pkg, null, 2))

const tsconfig_json_path = path.join(root, 'tsconfig.json')

const { default: tsconfig } = await import(tsconfig_json_path, {
  with: { type: 'jsonc' },
})
tsconfig.compilerOptions.lib.push('DOM')

await fs.writeFile(tsconfig_json_path, JSON.stringify(tsconfig, null, 2))

console.log('please wait')

await spawn([
  'bun',
  'add',
  'react',
  'react-dom',
  'react-router',
  'react-router',
  'tailwindcss',
  'bun-plugin-tailwind',
  'daisyui',
  '@graphql-tools/schema',
  'graphql-http',
])

await spawn([
  'bun',
  'add',
  '-D',
  '@types/node',
  '@types/react',
  '@types/react-dom',
])
