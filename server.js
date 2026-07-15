// Passenger / Hostinger Node.js App startup file.
// Hostinger runs your app under Phusion Passenger, which assigns the port via
// process.env.PORT. This custom server hands every request to Next.js.
//
// In the hPanel "Node.js App" config, set:
//   Application root        = the folder this file lives in
//   Application startup file = server.js
//   Node version            = 20 (or newer)
// Then run, in this order, from the app's terminal:
//   npm install
//   npx prisma generate
//   npm run build
// and (Re)start the app.

const http = require("http");
const next = require("next");

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const port = process.env.PORT || 3000;
  http
    .createServer((req, res) => handle(req, res))
    .listen(port, () => {
      console.log(`> Lease Lord (Next.js) ready on port ${port}`);
    });
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
