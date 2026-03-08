import type { WebSocketServer } from "ws";
import createServer from "./testserver.js";
import { Server } from "http";

// run servers
const PORT1 = 8080;
const PORT2 = 8081;
const RELAY_HOST = "ws://localhost:8085";

let server1: Server;
let server2: Server;
let wss1: WebSocketServer;
let wss2: WebSocketServer;
let wsRelay1: WebSocket;
let wsRelay2: WebSocket;

beforeAll(async () => {
    [[server1, wss1, wsRelay1], [server2, wss2, wsRelay2]] =
        await Promise.all([createServer(PORT1, RELAY_HOST), createServer(PORT2, RELAY_HOST)]);
})

//

const BACKEND_URL1 = `ws://localhost:${PORT1}`;
const BACKEND_URL2 = `ws://localhost:${PORT2}`;



describe("Chat application", () => {
    test('Message from Room 1 reaches another participant in Room 1', async () => {
        // CREATING WS CONNECTIONS
        let ws1 = new WebSocket(BACKEND_URL1);
        let ws2 = new WebSocket(BACKEND_URL2);

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

        interface IRoomCreate {
            type: "join-room";
            room: string;
        }
        interface IMessage {
            type: "chat";
            room: string;
            message: string;
        }
        function onmessagePromiseGen(ws: WebSocket, expectedmsg: IRoomCreate | IMessage) {
            return new Promise<void>((res, rej) => {

                ws.onmessage = ({ data }: MessageEvent) => {
                    const parsedData = JSON.parse(data);
                    expect(parsedData.type).toBe(expectedmsg.type);
                    expect(parsedData.room).toBe(expectedmsg.room);
                    if ("message" in expectedmsg) {
                        expect(parsedData.message).toBe(expectedmsg.message);
                    }
                    res();
                }
                ws.onerror = (event) => {
                    rej(event);
                }
            })
        }
        //// register the message handlers
        const p1join = onmessagePromiseGen(ws1, { type: "join-room", room: "Room 1" });
        const p2join = onmessagePromiseGen(ws2, { type: "join-room", room: "Room 1" });

        ws1.send(JSON.stringify({ type: "join-room", room: "Room 1" }));
        ws2.send(JSON.stringify({ type: "join-room", room: "Room 1" }));

        await Promise.all([p1join, p2join]);
        //

        // SENDING MESSAGE (Register the async op as a promise, then only after all the sync operation that you need to
        // do, you can await that promise)
        const p1msg = onmessagePromiseGen(ws1, { type: "chat", room: "Room 1", message: "hello ws2" });
        const p2msg = onmessagePromiseGen(ws2, { type: "chat", room: "Room 1", message: "hello ws2" });

        ws1.send(JSON.stringify({ type: "chat", room: "Room 1", message: "hello ws2" }));

        await Promise.all([p1msg, p2msg]);

        function onclosePromiseGen(socket: WebSocket) {
            return new Promise<void>((res, rej) => {
                socket.onclose = () => {
                    console.log("Client Socket closed");
                    res();
                }
            })
        }

        // CLOSING the Client tcp connections
        const p1close = onclosePromiseGen(ws1);
        const p2close = onclosePromiseGen(ws2);

        ws1.close(1000, "test ws1 is closed");
        ws2.close(1000, "test ws2 is closed");

        await Promise.all([p1close, p2close]);
        // for the server's onclose callback to run (Because normally, onclose of client and server run independently 
        // after closing the TCP connection)
        await new Promise<void>((res, rej) => {
            setTimeout(() => res(), 500);
        })

    })

    // test("Relay server shouldn't relay message to a websocket server not having a chat specific room", () => {
    //     //Abruptly terminated ws server 
    //
    //     //All clients disconnected from a room in a server
    //
    // })
})


async function servercloser(serverinstance: Server, port: typeof PORT1 | typeof PORT2) {
    return new Promise<void>((res, rej) => {
        serverinstance.close(() => {
            console.log("Server is closed from port: ", port);
            res();
        })
    })
}
async function wsServerCloser(websocketServer: WebSocketServer) {
    return new Promise<void>((res, rej) => {
        websocketServer.close(() => {
            console.log("WebSocket server is closed and stopped listening");
            res();
        })
    })
}

afterAll(async () => {

    // Closing the Relayer websockets
    wsRelay1.close();
    wsRelay2.close();

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
