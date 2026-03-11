import type { WebSocketServer } from "ws";
import createServer from "./testserver.js";
import { Server } from "http";
import { jest } from "@jest/globals";
import { createClient } from "redis";

interface IRoomCreate {
    type: "join-room";
    room: string;
}
interface IMessage {
    type: "chat";
    room: string;
    message: string;
}
type ClientType = ReturnType<typeof createClient>;
// run servers
const PORT1 = 8080;
const PORT2 = 8081;
// const RELAY_HOST = "ws://localhost:8085";

let server1: Server;
let server2: Server;
let wss1: WebSocketServer;
let wss2: WebSocketServer;
// let wsRelay1: WebSocket;
// let wsRelay2: WebSocket;
let client1: ClientType;
let client1Sub: ClientType;
let client2: ClientType;
let client2Sub: ClientType;

let ws1: WebSocket;
let ws2: WebSocket;

beforeAll(async () => {
    [[server1, wss1, client1, client1Sub], [server2, wss2, client2, client2Sub]] =
        await Promise.all([createServer(PORT1), createServer(PORT2)]);
})

//

const BACKEND_URL1 = `ws://localhost:${PORT1}`;
const BACKEND_URL2 = `ws://localhost:${PORT2}`;



describe("Chat application", () => {
    test('Message from Room A in Server 1 reaches another participant in Room A in Server 2', async () => {
        // CREATING WS CONNECTIONS
        ws1 = new WebSocket(BACKEND_URL1);
        ws2 = new WebSocket(BACKEND_URL2);

        function onOpenPromiseGen(ws: WebSocket) {
            return new Promise<void>((res, rej) => {
                ws.onopen = () => {
                    res();
                }
                ws.onerror = (event) => {
                    rej(event);
                }
            })
        }

        await Promise.all([onOpenPromiseGen(ws1), onOpenPromiseGen(ws2)]);

        // JOINING ROOMS

        //// register the message handlers
        const p1join = onmessagePromiseGen(ws1, { type: "join-room", room: "Room 1" }, 2);
        const p2join = onmessagePromiseGen(ws2, { type: "join-room", room: "Room 1" }, 2);

        ws1.send(JSON.stringify({ type: "join-room", room: "Room 1" }));
        ws2.send(JSON.stringify({ type: "join-room", room: "Room 1" }));


        console.log("YOOOOOOOOOOOOOOOOOOOOOOOOOOOOoo")
        await Promise.all([p1join, p2join]);
        //

        // SENDING MESSAGE (Register the async op as a promise, then only after all the sync operation that you need to
        // do, you can await that promise)
        const p1msg = onmessagePromiseGen(ws1, { type: "chat", room: "Room 1", message: "hello ws2" }, 1);
        const p2msg = onmessagePromiseGen(ws2, { type: "chat", room: "Room 1", message: "hello ws2" }, 1);

        ws1.send(JSON.stringify({ type: "chat", room: "Room 1", message: "hello ws2" }));

        console.log("LLLLOOOOOOOOOOOOOOOOOOOOOOOOOOOOoo")
        await Promise.all([p1msg, p2msg]);



    })

    test("When all clients exited from a room and that room is deleted from the Server, the messages to that room\
         shouldn't reach this Server", async () => {
        const handler = jest.fn();

        //All clients disconnected from Room1 in Server2 , & when ws1 sends a message - which shouldn't reach
        //Server 2's onmessage handler as it doesn't have Room 1 anymore - but it should reach Server1 & to ws1 client

        // close ws2 client -it's in room1
        const p2close = onclosePromiseGen(ws2);
        ws2.close();
        await p2close;
        //wait for the relayer to delete the server from room 
        // ie; wait for the relay server to do the actions on close
        await delay(200);

        //send message from ws1 client(which is in Room1)
        const p1msg = onmessagePromiseGen(ws1, { type: "chat", room: "Room 1", message: "hello ws2, are you there ??" }, 1);
        /////// wsRelay2.addEventListener("message", handler);
        client2Sub.on("message", handler);
        ws1.send(JSON.stringify({ type: "chat", room: "Room 1", message: "hello ws2, are you there ??" }));
        //// msg should be recieved by ws1
        console.log("HEYYYYYYYYYYYYYOOOOOOOOOOOOOOOOOOOOOOo")
        await p1msg;
        //// msg should not reach Server 2
        await delay(200);
        expect(handler).not.toHaveBeenCalled();


        //// cleanup
        // wsRelay2.removeEventListener("message", handler);
        client2Sub.removeListener("message", handler);
        ////create ws2, join room again
        ws2 = new WebSocket(BACKEND_URL2);
        await new Promise<void>((res, _) => {
            ws2.onopen = () => (res());
        })
        const pmsg = new Promise<void>((res, _) => {
            let count = 0;
            ws2.onmessage = () => {
                count++;
                if (count === 2) {
                    res();
                }
            }
            ws1.onmessage = () => {
                count++;
                if (count === 2) {
                    res();
                }
            }
        })
        console.log("HELOOOOOOOO")
        ws2.send(JSON.stringify({ type: "join-room", room: "Room 1" }));
        await pmsg;

    })


    // WHEN i delete RoomA in websocket server, then it sends delete-room message to Relayer. After i 
    // delete the room in the Websocket server, just after that, if i receive chat message to room A, then
    // there shouldn't be causing errors. Instead it should do nothing. - WHICH IT DOES RIGHT NOW>
})


afterAll(async () => {

    // CLOSING the Client tcp connections
    const p1close = onclosePromiseGen(ws1);
    const p2close = onclosePromiseGen(ws2);

    ws1.close(1000, "test ws1 is closed");
    ws2.close(1000, "test ws2 is closed");

    await Promise.all([p1close, p2close]);
    // for the server's onclose callback to run (Because normally, onclose of client and server run independently 
    // after closing the TCP connection)
    await new Promise<void>((res, _) => {
        setTimeout(() => res(), 500);
    })

    // // Closing the Redis clients for each server
    await client1.close();
    await client1Sub.close();
    await client2.close();
    await client2Sub.close();


    //Closing the Websocket server which is still listening 
    // await Promise.all([wsServerCloser(wss1), wsServerCloser(wss2)]) 
    // (not needed strictly - as the http server on which
    // the websocket server is created is closed )
    // Closing the http server

    await Promise.all([servercloser(server1, PORT1), servercloser(server2, PORT2)]);
})




// Scenario : 
//
// What if the client closes the browser abruptly - which closes the tcp connection and the server automatically
// recognizes that the specific tcp connection is no longer there, so it closes that ws from it's side. So, as
// I have that WS object in an array, i have to delete it - using onclose eventhandler;
//
//

function delay(ms: number) {
    return new Promise((res, _) => {
        setTimeout(res, ms);
    })
}
function onmessagePromiseGen(ws: WebSocket, expectedmsg: IRoomCreate | IMessage, maxcount: number) {

    // count given so that, the ws client recieves all the messages before moving forward with the tests
    return new Promise<void>((res, rej) => {
        let count = 0;

        ws.onmessage = ({ data }: MessageEvent) => {
            const parsedData = JSON.parse(data);
            console.log(parsedData, "OYOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO")
            expect(parsedData.type).toBe(expectedmsg.type);
            expect(parsedData.room).toBe(expectedmsg.room);
            if ("message" in expectedmsg) {
                expect(parsedData.message).toBe(expectedmsg.message);
            }
            count++;
            console.log("maxcount, count", maxcount, count);
            if (count === maxcount) {
                res();
            }
        }
        ws.onerror = (event) => {
            rej(event);
        }
    })

}
async function servercloser(serverinstance: Server, port: typeof PORT1 | typeof PORT2) {
    return new Promise<void>((res, _) => {
        serverinstance.close(() => {
            console.log("Server is closed from port: ", port);
            res();
        })
    })
}
// async function wsServerCloser(websocketServer: WebSocketServer) {
//     return new Promise<void>((res, _) => {
//         websocketServer.close(() => {
//             console.log("WebSocket server is closed and stopped listening");
//             res();
//         })
//     })
// }

function onclosePromiseGen(socket: WebSocket) {
    return new Promise<void>((res, _) => {
        socket.onclose = () => {
            console.log("Client Socket closed");
            res();
        }
    })
}
