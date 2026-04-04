import { IPlayerState } from "../gameEngine";

export default function render(player: IPlayerState | undefined, ctx: CanvasRenderingContext2D) {
    const INIT_X = 10;
    const INIT_Y = 10;

    ctx.imageSmoothingEnabled = false;
    const x = Math.round(player?.x ?? INIT_X);
    const y = Math.round(player?.y ?? INIT_Y);

    // Math.ceil for not having blurry edges due to drawing the border of the
    // filledRect in the center of canvas pixels (refer MDN)
    ctx.clearRect(0, 0, 320, 180);
    ctx.fillRect(x, y, 10, 10);
}

