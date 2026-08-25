import type { EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
import { isbot } from 'isbot';
import * as ReactDOMServer from 'react-dom/server';

export const streamTimeout = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
) {
  const userAgent = request.headers.get('user-agent');
  const isBotUser = Boolean(userAgent && isbot(userAgent));

  // 1. MiniOxygen / Web Worker Runtime (supports Web Streams renderToReadableStream natively)
  if (typeof (ReactDOMServer as any).renderToReadableStream === 'function') {
    const body = await (ReactDOMServer as any).renderToReadableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        signal: request.signal,
        onError(error: unknown) {
          console.error(error);
          responseStatusCode = 500;
        },
      },
    );

    if (isBotUser) {
      await body.allReady;
    }

    responseHeaders.set('Content-Type', 'text/html');
    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  }

  // 2. Node.js / Vercel Serverless Runtime (uses renderToPipeableStream & node streams)
  const { PassThrough } = await import('node:stream');
  const { createReadableStreamFromReadable } = await import('@react-router/node');
  const { renderToPipeableStream } = ReactDOMServer;

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const readyOption = isBotUser || reactRouterContext.isSpaMode ? 'onAllReady' : 'onShellReady';

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, streamTimeout + 1000);
  });
}
