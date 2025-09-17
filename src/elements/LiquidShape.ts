// Local type definitions
export type RGBA = { r: number; g: number; b: number; a: number };
export type BoundingBox = { x: number; y: number; width: number; height: number };
export interface ElementShaderData {
	positions: Float32Array;
	sizes: Float32Array;
	colors: Float32Array;
	customData: Float32Array;
	elementType: number;
}

export class LiquidShape {
	public animated: boolean = false;
	public visible: boolean = true;

	public id: string;
	public position: { x: number; y: number };
	public size: { width: number; height: number };
	public zIndex: number;
	public tint: RGBA;
	public radius: number;
	public roundness: number;

	constructor(
		id: string,
		position: { x: number; y: number },
		size: { width: number; height: number },
		zIndex: number,
		tint: RGBA,
		radius: number = 80,
		roundness: number = 5
	) {
		this.id = id;
		this.position = position;
		this.size = size;
		this.zIndex = zIndex;
		this.tint = tint;
		this.radius = radius;
		this.roundness = roundness;
	}

	updateAnimation(_deltaTime: number): void {}

	getShaderData(): ElementShaderData {
		return {
			positions: new Float32Array([this.position.x, this.position.y]),
			sizes: new Float32Array([this.size.width, this.size.height]),
			colors: new Float32Array([
				this.tint.r / 255,
				this.tint.g / 255,
				this.tint.b / 255,
				this.tint.a,
			]),
			customData: new Float32Array([this.radius, this.roundness, 0, 0]),
			elementType: 0,
		};
	}

	getBounds(): BoundingBox {
		return {
			x: this.position.x - this.size.width / 2,
			y: this.position.y - this.size.height / 2,
			width: this.size.width,
			height: this.size.height,
		};
	}

	cleanup(): void {}
}


