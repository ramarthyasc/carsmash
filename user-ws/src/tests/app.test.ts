import type { WebSocketServer } from "ws";
import createServer from "./testserver.js";
import { Server } from "http";
import { jest } from "@jest/globals";

interface IRoomCreate {
    type: "join-room";
    room: string;
}
interface IMessage {
    type: "chat";
    room: string;
    message: string;
}
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
let ws1: WebSocket;
let ws2: WebSocket;

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



    })

    test("When all clients inside a room is disconnected in a Server, then messages to that room relayed from other \
         servers shouldn't reach this Server", async () => {
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
        const p1msg = onmessagePromiseGen(ws1, { type: "chat", room: "Room 1", message: "hello ws2, are you there ??" });
        wsRelay2.addEventListener("message", handler);
        ws1.send(JSON.stringify({ type: "chat", room: "Room 1", message: "hello ws2, are you there ??" }));
        //// msg should be recieved by ws1
        await p1msg;
        //// msg should not reach Server 2
        await delay(200);
        expect(handler).not.toHaveBeenCalled();


        //// cleanup
        wsRelay2.removeEventListener("message", handler);
        ////create ws2, join room again
        ws2 = new WebSocket(BACKEND_URL2);
        await new Promise<void>((res, rej) => {
            ws2.onopen = () => (res());
        })
        const pmsg = new Promise<void>((res, rej) => {
            ws2.onmessage = () => (res())
        })
        ws2.send(JSON.stringify({ type: "join-room", room: "Room 1" }));
        await pmsg;

    })

    test("One Websocket server goes down, then messages from other servers shouldn't try to relay to downed server", async () => {
        const handler = jest.fn();
        //Abruptly terminated ws server 

        //Abruptly terminate wss2; ie; close the server's wsclient -> wsRelay2 (Server2 should be removed from 
        //all Respective Rooms of Server2 in the Relayer)
        const pRelayclose = new Promise<void>((res, rej) => {
            wsRelay2.onclose = () => (res())
        })
        wsRelay2.close();
        await pRelayclose;
        // wait for the relay server to do the actions on close
        await delay(200);

        //send message again through ws1
        const p1msg = onmessagePromiseGen(ws1, { type: "chat", room: "Room 1", message: "hello ws2, are you there ??" });
        /////even if the wsRelay2 is closed, the object is referenced by wsRelay2 variable
        wsRelay2.addEventListener("message", handler)
        ws1.send(JSON.stringify({ type: "chat", room: "Room 1", message: "hello ws2, are you there ??" }));
        await p1msg;
        //// msg should not reach Server 2 &  (Server2 should be removed from all Respective 
        // Rooms of Server2 in the Relayer)         --> Check the rooms being removed using consolelog in Relayer
        await delay(200);
        expect(handler).not.toHaveBeenCalled();


        //cleanup
        wsRelay2.removeEventListener("message", handler);
        wsRelay2 = new WebSocket(RELAY_HOST);
        await new Promise<void>((res, rej) => {
            wsRelay2.onopen = () => (res())
        })

    })
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
    await new Promise<void>((res, rej) => {
        setTimeout(() => res(), 500);
    })


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
//
//

function delay(ms: number) {
    return new Promise((res, rej) => {
        setTimeout(res, ms);
    })
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

function onclosePromiseGen(socket: WebSocket) {
    return new Promise<void>((res, rej) => {
        socket.onclose = () => {
            console.log("Client Socket closed");
            res();
        }
    })
}
