import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";

const app = express();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const servers: WebSocket[] = [];
wss.on("connection", (ws) => {
    servers.push(ws);

    ws.on("message", (data) => {
        servers.forEach((server) => {
            server.send(data.toString());
        })
    })

    ws.on("error", (error) => {
        console.log(error);
    })

})

export default server;
