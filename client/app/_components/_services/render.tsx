import { game } from "./update";

export default function render(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
    const x = game.car.x;
    const y = game.car.y;
    // Math.ceil for not having blurry edges due to drawing the border of the
    // filledRect in the center of canvas pixels (refer MDN)
    ctx.clearRect(0, 0, 320, 180);
    ctx.fillRect(Math.floor(x), Math.floor(y), 10, 10);
}
