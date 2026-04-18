"use client";

import { createContext, useEffect, useRef, useState } from "react";
import { ClientMessage, IRoomCreate } from "../chatbar";

type PlayerContextType = {
    ws1: WebSocket | undefined;
    room: string;
    setRoom: (room: string) => void;
    playeridRef: { current: number };
    chat: string;
}
export const PlayerContext = createContext<PlayerContextType | null>(null);

export default function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [room, setRoom] = useState<string>("R:AAAA");
    const playeridRef = useRef(0 + Math.floor(Math.random() * 256));
    const [ws1, setWs1] = useState<WebSocket>();
    const [chat, setChat] = useState<string>("");

    useEffect(() => {
        const HOST_PORT = "8080";
        const HOST_NAME = `ws://localhost:${HOST_PORT}`;

        async function establishWs() {
            const socketclient = new WebSocket(HOST_NAME);
            socketclient.binaryType = "arraybuffer";

            try {
                await new Promise<void>((res, rej) => {
                    socketclient.onopen = () => {
                        res();
                    }
                    socketclient.onerror = (e) => {
                        console.log(e);
                        rej(e);
                    }
                })

                socketclient.onmessage = ({ data }) => {
                    // Handler only for chat functionality
                    if (typeof data === "string") {
                        //textframe
                        //
                        console.log(data);
                        const parsedData: ClientMessage = JSON.parse(data);

                        if (parsedData.type === "chat") {
                            const usermessage = `${parsedData.userid}: ${parsedData.message}`
                            setChat(chat => (chat + "\n" + usermessage));
                        }
                        if (parsedData.type === "join-room") {
                            setChat(chat => (
                                chat ? chat + "\n" + "Anonymous joined the chat !!" : "Anonymous joined the chat !!"
                            ));
                        }
                    }
                }
                const joinroom: IRoomCreate = {
                    type: "join-room",
                    room: room
                }
                socketclient.send(JSON.stringify(joinroom));

            } catch (err) {
                console.log(err);
            }
            setWs1(socketclient);

        }
        establishWs();

        return () => {
            if (!ws1) {return;}
            ws1.close();
        }
    }, []);
    return (
        <PlayerContext.Provider value={{ room, setRoom, playeridRef, ws1, chat }} >
            {children}
        </PlayerContext.Provider>
    )
}
