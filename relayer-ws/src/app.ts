import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import type { Client } from "pg";

interface IRoomCreate {
    type: "join-room";
    room: string;
}
interface IDeleteRoom {
    type: "delete-room";
    room: string;
}
interface IMessage {
    type: "chat";
    room: string;
    message: string;
}
export type ClientMessage =
    | IRoomCreate
    | IDeleteRoom
    | IMessage

const app = express();

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

interface Room {
    servers: Set<WebSocket>;
}
const rooms: Record<string, Room> = {
}
const serverRooms = new Map<WebSocket, Set<keyof typeof rooms>>()

wss.on("connection", (ws) => {
    console.log("Relayer server connected");

    ws.on("message", (data) => {

        const parsedData: ClientMessage = JSON.parse(data.toString());
        const room = parsedData.room;

        if (parsedData.type === "join-room") {
            //subscribe at join-room
            if (!(room in rooms)) {
                rooms[room] = { servers: new Set([]) };
            }
            // Permutations : Same room + Same server, Same room + Diff server, Diff room + Same server, Diff both :
            rooms[room]?.servers.add(ws); // We use Set because, when join-room comes for the same room from the same
            // server, then it won't add duplicates inside the servers array of a particular room. 
            // (WE could use .includes in array to check if duplicates exist, but we chose 
            // Set as we dont need to check it in SET)
            /// BUT WE STOP THIS SAME ROOM + SERVER SERVER Behavior from the server itself.ie; When there is a room
            //existing inside the server, then it won't send the join-room message here

            //same socket can be inside different rooms unlike in a non relay ws server
            if (!serverRooms.get(ws)) {
                serverRooms.set(ws, new Set());
            }
            serverRooms.get(ws)?.add(room);
            console.log("hey", rooms);
            return;
        }

        if (parsedData.type === "chat") {
            //publish at chat
            rooms[room]?.servers.forEach((server) => {
                console.log("sending chat to rooms", rooms);
                console.log(parsedData.message);
                server.send(JSON.stringify(parsedData));
            })
        }

        if (parsedData.type === "delete-room") {
            console.log(" WS SERVER ROOM DELETED: SERVER IS DELETED FROM THAT RESPECTIVE ROOM")
            // delete the server from the room
            rooms[room]?.servers.delete(ws);
            console.log("deleterooms", rooms);
        }
    })

    ws.on("error", (error) => {
        console.log(error);
    })

    // if the ws server abruptly terminated or when ws server close gracefully - tcp connection closes: 
    ws.on("close", (code, reason) => {
        console.log("ABRUPT CLOSING -DELETING ALL INSTANCES OF THE SERVER IN RESPECTIVE ROOMS")
        console.log("WS server closed with code: %d, reason: %s", code, reason.toString());
        serverRooms.get(ws)?.forEach((room) => {
            rooms[room]?.servers.delete(ws);
        })
    })

})

export default server;
