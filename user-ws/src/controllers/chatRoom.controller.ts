import type WebSocket from "ws";
import type { ClientType, Room } from "../app.js";

interface RedisClients {
    client: ClientType;
    clientSub: ClientType;
}
interface IRoomCreate {
    type: "join-room";
    room: string;
}
// interface IDeleteRoom {
//     type: "delete-room";
//     room: string;
// }
interface IMessage {
    type: "chat";
    room: string;
    message: string;
}
export type ClientMessage =
    | IRoomCreate
    | IMessage


export async function chatRoomOnMessage(rooms: Record<string, Room | undefined>, data: WebSocket.Data,
    ws: WebSocket, subscriptionHandler: (message: Buffer, channel: Buffer) => void,
    { client, clientSub }: RedisClients) {
        console.log("HEYYY", data.toString());

    const parsedData: ClientMessage = JSON.parse(data.toString());
    const room = parsedData.room;

    if (parsedData.type === "join-room") {
        console.log("JOINING ROOM", room);
        if (rooms[room] === undefined) {
            rooms[room] = {
                sockets: [],
            }
            // only when the room is created, only then send the join-room message to Relayer from
            // this server. Because after that, even if there are clients joining the same room, then
            // I don't need to tell relayer that this room is in this server again and again.
            console.log("Created Room");
            // wsRelay.send(JSON.stringify(parsedData));
            await clientSub.subscribe(room, subscriptionHandler, true);

        }
        rooms[room].sockets.push(ws);
        (ws as any).room = parsedData.room;

        // ws.send(JSON.stringify(parsedData)); 
        await client.publish(room, JSON.stringify(parsedData));
    }

    if (parsedData.type === "chat") {
        // wsRelay.send(data.toString());
        await client.publish(room, JSON.stringify(parsedData));
    }


}

export async function chatRoomOnClose(rooms: Record<string, Room | undefined>,
    ws: WebSocket, code: number, reason: Buffer<ArrayBufferLike>,
    { clientSub }: RedisClients) {

    console.log("WS client closed with code: %d, reason: %s", code, reason);
    const room: string = (ws as any).room;
    if (!rooms[room]) { return; }
    rooms[room].sockets = rooms[room].sockets.filter((socket) => socket !== ws);

    if (!rooms[room].sockets.length) {
        rooms[room] = undefined;
        console.log("Rooms room1 is undefined right now");
        // send message to relay server that room A is no longer in this server (Unsubscribe this server from 
        // Room A)
        // const deleteRoom: IDeleteRoom = {
        //     type: "delete-room",
        //     room: room
        // }
        // wsRelay.send(JSON.stringify(deleteRoom));
        await clientSub.unsubscribe(room);
    }
}
