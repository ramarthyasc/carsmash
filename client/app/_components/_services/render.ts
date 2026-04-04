import { IPlayerState } from "../gameEngine";

export default function renderPlayers(players: Map<IPlayerState["playerid"], IPlayerState>,
    ctx: CanvasRenderingContext2D) {

    const INIT_X = 10;
    const INIT_Y = 10;

    ctx.imageSmoothingEnabled = false;

    // render all players
    // For each frame, we have to clear the frame, then render the one frame with all the players
    ctx.clearRect(0, 0, 320, 180);
    for (const [_, player] of players) {
        const x = Math.round(player?.x ?? INIT_X);
        const y = Math.round(player?.y ?? INIT_Y);

        // Math.ceil for not having blurry edges due to drawing the border of the
        // filledRect in the center of canvas pixels (refer MDN)
        ctx.fillRect(x, y, 10, 10);
    }
}

