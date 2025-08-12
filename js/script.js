const canvas = document.createElement('canvas');
canvas.id = 'limbo-bg';
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100vw';
canvas.style.height = '100vh';
canvas.style.zIndex = '-1';
canvas.style.pointerEvents = 'auto';
document.body.appendChild(canvas);

const gl = canvas.getContext('webgl');
if (!gl) {
	alert('WebGL not supported');
}

const vsSource = `
attribute vec2 aPos;
void main() {
	gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const fsSource = `
precision mediump float;
uniform vec4 uColor;
void main() {
	gl_FragColor = uColor;
}`;

const treeVsSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_position;
void main() {
	v_position = a_position;
	vec2 clipSpace = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
	gl_Position = vec4(clipSpace, 0, 1);
}`;
const treeFsSource = `
precision mediump float;
uniform vec4 uColor;
void main() {
	gl_FragColor = uColor;
}`;

function createShader(gl, type, source) {
	let shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(shader));
	}
	return shader;
}
function createProgram(gl, vsSource, fsSource) {
	let vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
	let fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
	let prog = gl.createProgram();
	gl.attachShader(prog, vs);
	gl.attachShader(prog, fs);
	gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
		throw new Error(gl.getProgramInfoLog(prog));
	}
	return prog;
}

const prog = createProgram(gl, vsSource, fsSource);
gl.useProgram(prog);

function getBarVerts() {
	const y0 = -1;
	const y1 = -1 + 0.10;
	return new Float32Array([
		-1, y0,
		 1, y0,
		-1, y1,
		 1, y1
	]);
}
const barVBO = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, barVBO);
gl.bufferData(gl.ARRAY_BUFFER, getBarVerts(), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'aPos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

let grassParams = [];
let grassParamsMed = [];
let grassParamsLight = [];

function getGrassParams(count, yBase, heightScale = 1, widthScale = 1, curveScale = 1, phaseOffset = 0) {
	const params = [];
	let x = -1;
	while (x < 1) {
		const clusterSize = 2 + Math.floor(Math.random() * 4);
		const clusterGap = 0.01 + Math.random() * 0.04;
		for (let c = 0; c < clusterSize && x < 1; c++) {
			const baseX = x + Math.random() * 0.01;
			const height = (0.09 + Math.random() * 0.12) * heightScale;
			const width = (0.018 + Math.random() * 0.022) * widthScale;
			const curveBase = (Math.random() - 0.5) * 0.18 * curveScale;
			const swayPhase = Math.random() * Math.PI * 2 + phaseOffset;
			params.push({ baseX, yBase, height, width, curveBase, swayPhase });
			x += width * 0.7;
		}
		x += clusterGap;
	}
	return params;
}

function buildGrassVerts(params, time = 0) {
	const verts = [];
	const segments = 16;
	for (let i = 0; i < params.length; i++) {
		const { baseX, yBase, height, width, curveBase, swayPhase } = params[i];
		const sway = Math.sin(time * 0.35 + swayPhase + baseX * 2.5) * 0.035;
		const curve = curveBase + sway;
		const tipX = baseX + curve;
		const tipY = yBase + height;
		verts.push(baseX, yBase);
		for (let s = 0; s <= segments; s++) {
			const t = s / segments;
			const ctrlX = baseX - width * 0.6;
			const ctrlY = yBase + height * 0.45;
			const bx = (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * ctrlX + t * t * tipX;
			const by = (1 - t) * (1 - t) * yBase + 2 * (1 - t) * t * ctrlY + t * t * tipY;
			verts.push(bx, by);
		}
		for (let s = segments; s >= 0; s--) {
			const t = s / segments;
			const ctrlX = baseX + width * 0.6;
			const ctrlY = yBase + height * 0.45;
			const bx = (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * ctrlX + t * t * tipX;
			const by = (1 - t) * (1 - t) * yBase + 2 * (1 - t) * t * ctrlY + t * t * tipY;
			verts.push(bx, by);
		}
	}
	return new Float32Array(verts);
}

const grassYBase = -1 + 0.10 - 0.025;
grassParams = getGrassParams(160, grassYBase, 0.5, 0.5, 1, 0);
let grassVerts = buildGrassVerts(grassParams, 0);
const grassVBO = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, grassVBO);
gl.bufferData(gl.ARRAY_BUFFER, grassVerts, gl.STATIC_DRAW);

grassParamsMed = getGrassParams(120, grassYBase, 0.4, 0.55, 0.8, 1.5);
let grassVertsMed = buildGrassVerts(grassParamsMed, 0);
const grassVBOMed = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, grassVBOMed);
gl.bufferData(gl.ARRAY_BUFFER, grassVertsMed, gl.STATIC_DRAW);

grassParamsLight = getGrassParams(80, grassYBase, 0.325, 0.6, 0.6, 3.0);
let grassVertsLight = buildGrassVerts(grassParamsLight, 0);
const grassVBOLight = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, grassVBOLight);
gl.bufferData(gl.ARRAY_BUFFER, grassVertsLight, gl.STATIC_DRAW);

class TreeNode {
	constructor(x, y, angle, length, thickness, depth, type = 0) {
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.length = length;
		this.thickness = thickness;
		this.depth = depth;
		this.type = type;
		this.children = [];
		this.segments = [];
		this.leaves = [];
	}
	grow() {
		const numSegments = Math.max(3, Math.floor(this.length / 20));
		let currentX = this.x;
		let currentY = this.y;
		let currentAngle = this.angle;
		for (let i = 0; i < numSegments; i++) {
			const segmentLength = this.length / numSegments;
			const progress = i / numSegments;
			const angleVariation = (Math.random() - 0.5) * 0.3;
			currentAngle += angleVariation;
			let thicknessTaper;
			if (this.type === 0 && i === 0) {
				thicknessTaper = 1.5;
			} else {
				thicknessTaper = 1 - (progress * 0.7);
			}
			const segmentThickness = this.thickness * thicknessTaper;
			const endX = currentX + Math.cos(currentAngle) * segmentLength;
			const endY = currentY + Math.sin(currentAngle) * segmentLength;
			this.segments.push({
				startX: currentX,
				startY: currentY,
				endX: endX,
				endY: endY,
				thickness: segmentThickness,
				type: this.type
			});
			if (this.type === 1 && Math.random() < 0.18 && this.depth <= 2) {
				const clusterCount = 2 + Math.floor(Math.random() * 3);
				for (let c = 0; c < clusterCount; c++) {
					const leafAngle = currentAngle + (Math.random() - 0.5) * 0.9;
					const leafLen = 10 + Math.random() * 10;
					const leafWidth = 4 + Math.random() * 4;
					const dist = (Math.random() - 0.5) * 28 + (Math.random() < 0.5 ? 10 : -10);
					const lx = endX + Math.cos(leafAngle) * dist;
					const ly = endY + Math.sin(leafAngle) * dist;
					const shapeType = Math.floor(Math.random() * 3);
					this.leaves.push({
						x: lx,
						y: ly,
						angle: leafAngle,
						len: leafLen,
						width: leafWidth,
						shape: shapeType
					});
				}
			}
			currentX = endX;
			currentY = endY;
		}
		if (this.depth > 0 && this.type < 2) {
			this.createBranches(currentX, currentY, currentAngle);
		}
	}
	createBranches(x, y, parentAngle) {
		let numBranches, branchAngleSpread, branchLengthMultiplier, branchThicknessMultiplier;
		if (this.type === 0) {
			numBranches = Math.floor(2 + Math.random() * 4);
			branchAngleSpread = Math.PI * 0.6;
			branchLengthMultiplier = 0.6 + Math.random() * 0.3;
			branchThicknessMultiplier = 0.5 + Math.random() * 0.2;
		} else {
			numBranches = Math.floor(1 + Math.random() * 3);
			branchAngleSpread = Math.PI * 0.4;
			branchLengthMultiplier = 0.5 + Math.random() * 0.2;
			branchThicknessMultiplier = 0.4 + Math.random() * 0.2;
		}
		for (let i = 0; i < numBranches; i++) {
			const branchAngle = parentAngle + (Math.random() - 0.5) * branchAngleSpread;
			const branchLength = this.length * branchLengthMultiplier;
			const branchThickness = this.thickness * branchThicknessMultiplier;
			const branchDepth = this.depth - 1;
			const branchType = 1;
			const branch = new TreeNode(x, y, branchAngle, branchLength, branchThickness, branchDepth, branchType);
			branch.grow();
			this.children.push(branch);
		}
	}
	getAllSegments() {
		let allSegments = [...this.segments];
		for (const child of this.children) {
			allSegments = allSegments.concat(child.getAllSegments());
		}
		return allSegments;
	}
	getAllLeaves() {
		let allLeaves = [...this.leaves];
		for (const child of this.children) {
			allLeaves = allLeaves.concat(child.getAllLeaves());
		}
		return allLeaves;
	}
}

function segmentToTriangles(segment) {
	const triangles = [];
	const { startX, startY, endX, endY, thickness } = segment;
	const dx = endX - startX;
	const dy = endY - startY;
	const length = Math.sqrt(dx * dx + dy * dy);
	if (length === 0) return triangles;
	const perpX = -dy / length * thickness / 2;
	const perpY = dx / length * thickness / 2;
	const vertices = [
		startX + perpX, startY + perpY,
		startX - perpX, startY - perpY,
		endX + perpX, endY + perpY,
		startX - perpX, startY - perpY,
		endX - perpX, endY - perpY,
		endX + perpX, endY + perpY
	];
	triangles.push(...vertices);
	return triangles;
}

function generateTreeRow(rowConfig, time, parallaxX) {
	const { count, yBase, heightScale, thicknessScale, color, parallaxStrength } = rowConfig;
	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;
	const verts = [];
	const leafVerts = [];
	const edgePad = 0.18;
	for (let i = 0; i < count; i++) {
		const t = (i + 1) / (count + 1);
		const minX = -edgePad * canvasWidth;
		const maxX = canvasWidth + edgePad * canvasWidth;
		const baseX = minX + t * (maxX - minX) + (Math.random() - 0.5) * 30 + parallaxX;
		const baseY = yBase;
		const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
		const length = canvasHeight * heightScale * (0.7 + Math.random() * 0.3);
		const thickness = 18 * thicknessScale * (0.7 + Math.random() * 0.5);
		const depth = 3 + Math.floor(Math.random() * 2);
		const tree = new TreeNode(baseX, baseY, angle, length, thickness, depth, 0);
		tree.grow();
		const segments = tree.getAllSegments();
		for (const seg of segments) {
			verts.push(...segmentToTriangles(seg));
		}
	}
	return { trunk: new Float32Array(verts), leaves: new Float32Array([]) };
}

const treeLayers = [
	{
		count: 9,
		yBase: canvas.height - 30,
		heightScale: 0.38,
		thicknessScale: 0.7,
		color: [0.65, 0.65, 0.68, 1.0],
		parallaxStrength: 0.001
	},
	{
		count: 8,
		yBase: canvas.height - 20,
		heightScale: 0.48,
		thicknessScale: 1.25,
		color: [0.32, 0.32, 0.36, 1.0],
		parallaxStrength: 0.003
	},
	{
		count: 7,
		yBase: canvas.height - 10,
		heightScale: 0.60,
		thicknessScale: 1.6,
		color: [0, 0, 0, 1],
		parallaxStrength: 0.007
	}
];

let treeVBOs = [null, null, null];
let treeVertsArr = [null, null, null];

const treeProg = createProgram(gl, treeVsSource, treeFsSource);

let treeBaseVertsArr = [null, null, null];

function updateTreeLayers(time) {
	for (let i = 0; i < treeLayers.length; i++) {
		const layer = treeLayers[i];
		const row = generateTreeRow(layer, time, 0);
		treeBaseVertsArr[i] = row.trunk;
		if (!treeVBOs[i]) treeVBOs[i] = gl.createBuffer();
	}
	updateTreeParallaxVBOs();
}

function updateTreeParallaxVBOs() {
	for (let i = 0; i < treeLayers.length; i++) {
		const layer = treeLayers[i];
		const baseVerts = treeBaseVertsArr[i];
		if (baseVerts) {
			const verts = new Float32Array(baseVerts.length);
			const offsetX = mouseX * canvas.width * layer.parallaxStrength;
			for (let j = 0; j < baseVerts.length; j += 2) {
				verts[j] = baseVerts[j] + offsetX;
				verts[j+1] = baseVerts[j+1];
			}
			treeVertsArr[i] = verts;
			gl.bindBuffer(gl.ARRAY_BUFFER, treeVBOs[i]);
			gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
		}
	}
}

function drawTreeLayer(i) {
	const verts = treeVertsArr[i];
	if (verts && verts.length > 0) {
		gl.useProgram(treeProg);
		const a_position = gl.getAttribLocation(treeProg, 'a_position');
		gl.bindBuffer(gl.ARRAY_BUFFER, treeVBOs[i]);
		gl.enableVertexAttribArray(a_position);
		gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);
		gl.uniform2f(gl.getUniformLocation(treeProg, 'u_resolution'), canvas.width, canvas.height);
		gl.uniform1f(gl.getUniformLocation(treeProg, 'u_time'), 0);
		gl.uniform4f(gl.getUniformLocation(treeProg, 'uColor'), ...treeLayers[i].color);
		gl.drawArrays(gl.TRIANGLES, 0, verts.length / 2);
	}
}
let treeParams = [];
let treeParamsMed = [];
let treeParamsLight = [];

function getTreeParams(count, yBase, heightScale = 1, widthScale = 1, branchScale = 1, phaseOffset = 0) {
	const params = [];
	const screenWidth = 2;
	const spacing = screenWidth / count;
	
	for (let i = 0; i < count; i++) {
		const baseX = -1 + (i + 0.5) * spacing + (Math.random() - 0.5) * spacing * 0.3;
		const height = (4.0 + Math.random() * 1.0) * heightScale;
		const baseWidth = (0.04 + Math.random() * 0.06) * widthScale;
		const branchCount = 3 + Math.floor(Math.random() * 5);
		const swayPhase = Math.random() * Math.PI * 2 + phaseOffset;
		const segments = 8 + Math.floor(Math.random() * 6);
		const trunkSegments = [];
		for (let s = 0; s <= segments; s++) {
			const segmentHeight = s / segments;
			const segmentAngle = (Math.random() - 0.5) * 0.15;
			const segmentOffset = (Math.random() - 0.5) * 0.02;
			trunkSegments.push({ height: segmentHeight, angle: segmentAngle, offset: segmentOffset });
		}
		const branches = [];
		const isForeground = heightScale === 1.0;
		const baseHeight = isForeground ? 0.2 : 0.4;
		const heightRange = isForeground ? 0.3 : 0.5;
		const halfBranchCount = Math.floor(branchCount / 2);
		params.push({ baseX, yBase, height, baseWidth, trunkSegments, branches, swayPhase });
	}
	return params;
}

function buildTreeVerts(params, time = 0) {
	const verts = [];
	for (let i = 0; i < params.length; i++) {
		const { baseX, yBase, height, baseWidth, trunkSegments, branches, swayPhase } = params[i];
		const sway = Math.sin(time * 0.2 + swayPhase + baseX * 1.5) * 0.015;
		for (let s = 0; s < trunkSegments.length - 1; s++) {
			const seg1 = trunkSegments[s];
			const seg2 = trunkSegments[s + 1];
			const y1 = yBase + height * seg1.height;
			const y2 = yBase + height * seg2.height;
			let taper1, taper2;
			if (seg1.height < 0.3) {
				const flareAmount = (0.3 - seg1.height) / 0.3;
				taper1 = 1.0 + flareAmount * 0.3;
			} else {
				taper1 = 1.0 - (seg1.height - 0.3) * 0.6;
			}
			if (seg2.height < 0.3) {
				const flareAmount = (0.3 - seg2.height) / 0.3;
				taper2 = 1.0 + flareAmount * 0.3;
			} else {
				taper2 = 1.0 - (seg2.height - 0.3) * 0.6;
			}
			const swayAmount1 = sway * seg1.height;
			const swayAmount2 = sway * seg2.height;
			const centerX1 = baseX + swayAmount1 + seg1.offset;
			const centerX2 = baseX + swayAmount2 + seg2.offset;
			const width1 = baseWidth * taper1;
			const width2 = baseWidth * taper2;
			const angle1 = seg1.angle;
			const angle2 = seg2.angle;
			const leftX1 = centerX1 - width1 * Math.cos(angle1) - width1 * Math.sin(angle1) * 0.1;
			const rightX1 = centerX1 + width1 * Math.cos(angle1) + width1 * Math.sin(angle1) * 0.1;
			const leftX2 = centerX2 - width2 * Math.cos(angle2) - width2 * Math.sin(angle2) * 0.1;
			const rightX2 = centerX2 + width2 * Math.cos(angle2) + width2 * Math.sin(angle2) * 0.1;
			verts.push(leftX1, y1, rightX1, y1, leftX2, y2);
			verts.push(rightX1, y1, rightX2, y2, leftX2, y2);
		}
	}
	return new Float32Array(verts);
}

treeParams = getTreeParams(4, grassYBase, 1.0, 1.0, 1.0, 0);
let treeVerts = buildTreeVerts(treeParams, 0);
const treeVBO = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, treeVBO);
gl.bufferData(gl.ARRAY_BUFFER, treeVerts, gl.STATIC_DRAW);

treeParamsMed = getTreeParams(6, grassYBase, 0.8, 0.9, 0.8, 1.5);
let treeVertsMed = buildTreeVerts(treeParamsMed, 0);
const treeVBOMed = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, treeVBOMed);
gl.bufferData(gl.ARRAY_BUFFER, treeVertsMed, gl.STATIC_DRAW);

treeParamsLight = getTreeParams(5, grassYBase, 0.6, 0.8, 0.6, 3.0);
let treeVertsLight = buildTreeVerts(treeParamsLight, 0);
const treeVBOLight = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, treeVBOLight);
gl.bufferData(gl.ARRAY_BUFFER, grassVertsLight, gl.STATIC_DRAW);

let mouseX = 0;
let mouseY = 0;
canvas.addEventListener('mousemove', (e) => {
	const rect = canvas.getBoundingClientRect();
	mouseX = (e.clientX - rect.left) / rect.width * 2 - 1;
	mouseY = -((e.clientY - rect.top) / rect.height * 2 - 1);
});

function drawGrassLayer(params, vbo, color, time, parallaxStrength = 0) {
	const segments = 16;
	const verts = buildGrassVerts(params, time);
		if (parallaxStrength > 0) {
			const offsetX = mouseX * parallaxStrength;
			for (let i = 0; i < verts.length; i += 2) {
				verts[i] += offsetX;
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
		gl.useProgram(prog);
		gl.uniform4f(gl.getUniformLocation(prog, 'uColor'), color[0], color[1], color[2], color[3]);
		let offset = 0;
		while (offset < verts.length / 2) {
			gl.drawArrays(gl.TRIANGLE_FAN, offset, 1 + segments * 2 + 2);
			offset += 1 + segments * 2 + 2;
		}
}

function drawScene(time = 0) {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT);
	updateTreeParallaxVBOs();
	for (let i = 0; i < treeLayers.length; i++) {
		drawTreeLayer(i);
	}
	drawGrassLayer(grassParamsLight, grassVBOLight, [0.22, 0.22, 0.26, 1.0], time * 0.001, 0.002);
	drawGrassLayer(grassParamsMed, grassVBOMed, [0.18, 0.18, 0.20, 1.0], time * 0.001, 0.005);
	gl.useProgram(prog);
	gl.uniform4f(gl.getUniformLocation(prog, 'uColor'), 0, 0, 0, 1);
	gl.bindBuffer(gl.ARRAY_BUFFER, barVBO);
	gl.enableVertexAttribArray(aPos);
	gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	drawGrassLayer(grassParams, grassVBO, [0, 0, 0, 1], time * 0.001, 0.01);
	drawGrassLayer(grassParams, grassVBO, [0, 0, 0, 1], time * 0.001, 0.01);
}

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	grassParams = getGrassParams(160, grassYBase, 0.5, 0.5, 1, 0);
	grassParamsMed = getGrassParams(120, grassYBase, 0.4, 0.55, 0.8, 1.5);
	grassParamsLight = getGrassParams(80, grassYBase, 0.325, 0.6, 0.6, 3.0);
	for (let i = 0; i < treeLayers.length; i++) {
		if (i === 0) treeLayers[i].yBase = canvas.height - 30;
		if (i === 1) treeLayers[i].yBase = canvas.height - 20;
		if (i === 2) treeLayers[i].yBase = canvas.height - 10;
	}
	updateTreeLayers(0);
	drawScene(0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function animateGrass(time) {
	drawScene(time);
	requestAnimationFrame(animateGrass);
}
requestAnimationFrame(animateGrass);
