import Image from "next/image";
import GameEngine from "./_components/gameEngine";

export default function Home() {

    return (
        <div className="flex-2">
            <GameEngine />
        </div>
    );
}
