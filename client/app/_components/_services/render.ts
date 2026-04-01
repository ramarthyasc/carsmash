import { IPlayerBin } from "../gameEngine";

export default function render(player: IPlayerBin, ctx: CanvasRenderingContext2D) {

    ctx.imageSmoothingEnabled = false;
    const x = Math.round(player.x);
    const y = Math.round(player.y);

    // Math.ceil for not having blurry edges due to drawing the border of the
    // filledRect in the center of canvas pixels (refer MDN)
    ctx.clearRect(0, 0, 320, 180);
    ctx.fillRect(x, y, 10, 10);
}

