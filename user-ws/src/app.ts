import { WebSocketServer, WebSocket as WebSocketWS } from 'ws';
import http, { Server } from 'http';
import express from 'express';
interface IRoomCreate {
    type: "join-room";
    room: string;
}
interface IMessage {
    type: "chat";
    room: string;
    message: string;
}
interface Room {
    sockets: Set<WebSocketWS>;
}

export default function createServer(port: number, relayHost: string) {
    const app = express();
    const server = http.createServer(app);

    const wss = new WebSocketServer({ server });

    const rooms: Record<string, Room> = {
    }


    const RELAY_HOST = relayHost;
    const wsRelay = new WebSocket(RELAY_HOST);

    wsRelay.onmessage = ({ data }) => {
        const parsedData: IMessage = JSON.parse(data);
        const room = parsedData.room;
        if (!rooms[room]) return; // room will always be there bcs client had connected before messaging right/
        rooms[room].sockets.forEach((socket) => socket.send(JSON.stringify(parsedData)));
    }


    wss.on('connection', function connection(ws) {
        console.log("websocket client connected");
        ws.on('error', console.error);

        // ws only accepts string or binary - and receives at onmessage @server as arrayBuffer ie Binary and @client as 
        // EventObject with data property as string automatically
        ws.on('message', function message(data) {
            const parsedData: IRoomCreate | IMessage = JSON.parse(data.toString());
            const room = parsedData.room;
            if (parsedData.type === "join-room") {
                console.log("JOINING ROOM");
                if (!rooms[room]) {
                    rooms[room] = {
                        sockets: new Set(),
                    }
                }
                rooms[room].sockets.add(ws);
                (ws as any).room = parsedData.room;
                ws.send(JSON.stringify(parsedData));
            }

            if (parsedData.type === "chat") {
                wsRelay.send(data.toString());
            }
        });

        ws.on("close", (code, reason) => {
            console.log("WS object closed with code: %d, reason: %s", code, reason);
            rooms[(ws as any).room]?.sockets.delete(ws);
        })

    });

    app.get("/", (req, res) => {
        console.log("helooo");
        return res.send("heyy");
    })


    return new Promise<[Server, WebSocketServer, WebSocket]>((res, rej) => {
        const serverinstance = server.listen(port, () => {
            console.log("server running on ", port);
            res([serverinstance, wss, wsRelay]);
        });
    })


}
