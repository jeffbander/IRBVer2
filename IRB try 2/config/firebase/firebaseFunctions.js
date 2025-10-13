// Firebase Functions entry point for Next.js
const { onRequest } = require('firebase-functions/v2/https');
const next = require('next');

const server = next({
  dev: false,
  conf: {
    distDir: '.next',
  },
});

const nextjsHandle = server.getRequestHandler();

exports.nextjsFunc = onRequest(
  {
    memory: '2GiB',
    timeoutSeconds: 300,
    maxInstances: 10,
  },
  async (req, res) => {
    await server.prepare();
    return nextjsHandle(req, res);
  }
);
