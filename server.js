const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create global event emitter to bridge Next.js API/action logic to WS server
const { EventEmitter } = require("events");
if (!global.wsEmitter) {
    global.wsEmitter = new EventEmitter();
}

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            handle(req, res, parsedUrl);
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        // Client joins an asset room
        socket.on("join-market", (assetId) => {
            socket.join(`market:${assetId}`);
        });

        socket.on("leave-market", (assetId) => {
            socket.leave(`market:${assetId}`);
        });

        socket.on("disconnect", () => { });
    });

    // Listen to global server events emitted from trading logic
    global.wsEmitter.on("tradeExecuted", ({ assetId, trade }) => {
        io.to(`market:${assetId}`).emit("tradeExecuted", trade);
    });

    global.wsEmitter.on("orderBookUpdated", ({ assetId, orderBook }) => {
        io.to(`market:${assetId}`).emit("orderBookUpdated", orderBook);
    });

    global.wsEmitter.on("priceUpdated", ({ assetId, price, timestamp }) => {
        io.to(`market:${assetId}`).emit("priceUpdated", { price, timestamp });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
