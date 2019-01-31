// phina.js をグローバル領域に展開
phina.globalize();

var ASSETS = {
  image: {
	'enemy': './img/enemy.png',
	'enemy_shot': './img/enemy_shot.png',
	'ship': './img/ship.png',
	'ship_shot': './img/ship_shot.png',
	'explosion_big': './img/explosion_big.png',
	'speed_line': './img/speed_line.png',
	'bg_01': './img/bg_01.png',
	'bg_02': './img/bg_02.png',
	},
	spritesheet: {
		"explosion_big": {
			// フレーム情報
			"frame": {
				"width": 32, // 1フレームの画像サイズ（横）
				"height": 32, // 1フレームの画像サイズ（縦）
				"cols": 4, // フレーム数（横）
				"rows": 1, // フレーム数（縦）
			},
			// アニメーション情報
			"animations" : {
				"explosion_big": { // アニメーション名
				"frames": [0, 1, 2, 3], // フレーム番号範囲
				"next": "", // 次のアニメーション
				"frequency": 6, // アニメーション間隔
				},
			}
		},
	}
};

var DF = {
};
DF.SC_W = 240;
DF.SC_H = 320;

class Rotation {
}
Rotation.RIGHT = 0;
Rotation.DOWN = 90;
Rotation.LEFT = 180;
Rotation.UP = 270;

class MathHelper {

	static max(a, b) {
		return a < b ? b : a;
	}

	static min(a, b) {
		return a < b ? a : b;
	}

	static wrap(v, min, max) {
		const length = max - min;
		const v2 = v - min;
		if (0 <= v2) {
			return min + (parseInt(v2) % parseInt(length));
		}
		return min + (length + (v2 % length)) % length;
	}

	static clamp(v, min, max) {
		if (v < min) return min;
		if (max < v) return max;
		return v;
	}

	static clamp01(v, min, max) {
		return MathHelper.clamp(v, 0.0, 1.0);
	}

	static lerp(a, b, t) {
		return a + (b - a) * t;
	}

	static tForLerp(a, b) {
		if (b <= 0) return 1;
		return a / b;
	}

	static isLerpEnd(t) {
		return 1 <= t;
	}

	/** [ min, max ) */
	static isInRange(v, min, max) {
		return min <= v && v < max;
	}

	static progress01(t, length) {
		if (length <= 0) return 1.0;
		return MathHelper.clamp01(t / length);
	}
}

function assertEq(a, b) {
	if (a === b) return;
	throw "assert " + a + " vs " + b;
}

assertEq(0, MathHelper.wrap(3, 0, 3));
assertEq(2, MathHelper.wrap(2, 0, 3));
assertEq(1, MathHelper.wrap(1, 0, 3));
assertEq(2, MathHelper.wrap(-1, 0, 3));
assertEq(1, MathHelper.wrap(-2, 0, 3));
assertEq(0, MathHelper.wrap(-3, 0, 3));
assertEq(2, MathHelper.wrap(-4, 0, 3));
assertEq(1, MathHelper.wrap(-5, 0, 3));

assertEq(0, MathHelper.clamp(-1, 0, 10));
assertEq(10, MathHelper.clamp(11, 0, 10));

assertEq(1, MathHelper.progress01(2, 0));
assertEq(1, MathHelper.progress01(2, -10));
assertEq(0, MathHelper.progress01(0, 10));
assertEq(0.5, MathHelper.progress01(5, 10));
assertEq(1, MathHelper.progress01(10, 10));
assertEq(1, MathHelper.progress01(11, 10));

class SmokeHelper {
	static update(scene, smoke) {
		const t = MathHelper.tForLerp(smoke.elapsedTime, smoke.endTime);
		const radius = MathHelper.lerp(smoke.startRadius, smoke.endRadius, t);
		const alpha = MathHelper.lerp(smoke.startAlpha, smoke.endAlpha, t);
		smoke.sprite.radius = radius;
		smoke.sprite.alpha = alpha;
		smoke.isActive &= !MathHelper.isLerpEnd(t);
		smoke.elapsedTime += scene.app.ticker.deltaTime;
		const dt = scene.app.ticker.deltaTime / 1000;
		smoke.sprite.x += smoke.force.x * dt;
		smoke.sprite.y += smoke.force.y * dt;
		let v1 = smoke.force.clone().mul(-1).normalize();
		let minLen = smoke.force.length();
		let len = MathHelper.min(10 * dt, minLen);
		v1.mul(len);
		smoke.force.add(v1);
	}
}

class FireHelper {
	static update(scene, smoke) {
		const t = MathHelper.tForLerp(smoke.elapsedTime, smoke.endTime);
		smoke.sprite.rotation = smoke.rotation;
		smoke.isActive &= !MathHelper.isLerpEnd(t);
		smoke.elapsedTime += scene.app.ticker.deltaTime;
		const v = new Vector2().fromDegree(smoke.rotation, scene.data.config.playerBulletSpeed * scene.app.ticker.deltaTime / 1000.0);
		smoke.sprite.x += v.x;
		smoke.sprite.y += v.y;
	}
}

class SpeedLineHelper {
	static update(scene, smoke) {
		const t = MathHelper.tForLerp(smoke.elapsedTime, smoke.endTime);
		smoke.sprite.rotation = smoke.rotation;
		smoke.isActive &= !MathHelper.isLerpEnd(t);
		smoke.elapsedTime += scene.app.ticker.deltaTime;
		const v = new Vector2().fromDegree(smoke.rotation, 500 * scene.app.ticker.deltaTime / 1000.0);
		smoke.sprite.x += v.x;
		smoke.sprite.y += v.y;
	}
}

class PlayerHelper {
}

class Vector2Helper {
	static isZero(v) {
		return v.x === 0 && v.y === 0;
	}
	static copyFrom(a, b) {
		a.x = b.x;
		a.y = b.y;
	}
}

const StateId = {
	S1I: 10,
	S1: 11,
	S2: 20,
	S3I: 30,
	S3: 40,
}

class Player {
	constructor() {
		const sprite = Sprite("ship");
		sprite.x = 120;
		sprite.y = DF.SC_H * 3 / 4;
		sprite.priority = 5;

		this.score = 0;
		this.sprite = sprite;
		this.fireInterval = 50;
		this.fireTime = 0;
		this.rotation = Rotation.UP;
		this.isInSafeArea = true;
	}
}

class Enemy {
	constructor(pos, moveData) {
		const sprite = Sprite("enemy");
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 3;
		this.moveWork = new MoveWork(pos, moveData);
		this.score = 0;
		this.sprite = sprite;
		this.fireInterval = 200;
		this.fireTime = 0;
		this.stateTime = 0;
		this.state = 0;
		this.rotation = Rotation.UP;
		this.isInSafeArea = true;
		this.isActive = true;
	}
}

class EnemyHelper {
	static update(scene, enemy) {
		MoveWorkHelper.evalaute(enemy.moveWork, enemy);
		MoveWorkHelper.update(enemy.moveWork, scene.app.ticker.deltaTime);
	}

	static createEnemy(scene, pos, moveData) {
		const enemy = new Enemy(pos, moveData);
		enemy.sprite.addChildTo(scene.layer1);
		scene.data.enemyArr.push(enemy);
		return enemy;
	}
}

class Explosion {
	constructor(pos) {
		const sprite = new Sprite("explosion_big");
		sprite.priority = 1;
		sprite.x = pos.x;
		sprite.y = pos.y;
		this.sprite = sprite;
		var anim = new FrameAnimation("explosion_big").attachTo(sprite);
		anim.gotoAndPlay("explosion_big");
		this.anim = anim;
		this.isActive = true;
	}
}

class ExplosionHelper {
	static update(scene, explosion) {
		if (explosion.anim.finished) {
			explosion.isActive = false;
		}
	}

	static createExplosion(scene, pos) {
		const pos2 = new Vector2(
			pos.x + Math.random() * 8 - 4,
			pos.y + Math.random() * 8 - 4
		);
		const explosion = new Explosion(pos2);
		explosion.sprite.addChildTo(scene.layer1);
		scene.data.explosionArr.push(explosion);
		return explosion;
	}
}

class WaveWork {
	constructor(waves) {
		this.waves = waves;
		this.waveIndex = 0;

		const wave = this.waves[this.waveIndex];
		const blocks = wave.blocks;
		this.blockWorks = [];
		this.blockIndex = 0;
		this.waveTime = 0;
		this.blockTime = 0;
		this.isEnd = false;
		WaveWorkHelper.resetBlock(this);
	}
}

class BlockWork {
	constructor(blockData) {
		this.blockTime = 0;
		this.blockData = blockData;
		this.enemyIndex = 0;
		this.isEnd = false;
	}
}

class BlockWorkHelper {
	static update(scene, waveWork, blockWork) {
		const blockData = blockWork.blockData;
		if (waveWork.waveTime < blockData.time) return;
		if (blockWork.isEnd) return;
		const enableCount = MathHelper.min(blockData.enemyCount, parseInt(blockWork.blockTime / blockData.delay));
		for (var i = blockWork.enemyIndex; i < enableCount; i++) {
			const moveData = moveDataDict[blockData.moveDataName];
			EnemyHelper.createEnemy(scene, blockData.pos, moveData);
		}
		blockWork.enemyIndex = enableCount;
		if (blockData.enemyCount <= blockWork.enemyIndex) {
			blockWork.isEnd = true;
		}
		blockWork.blockTime += scene.app.ticker.deltaTime;
	}
}

class WaveWorkHelper {

	static resetBlock(waveWork) {
		const wave = waveWork.waves[waveWork.waveIndex];
		const blocks = wave.blocks;
		waveWork.blockWorks = [];
		for (let i = 0; i < blocks.length; i++) {
			const blockData = blocks[i];
			const blockWork = new BlockWork(blockData);
			waveWork.blockWorks.push(blockWork);
		}
		waveWork.blockIndex = 0;
		waveWork.waveTime = 0;
		waveWork.blockTime = 0;
	}

	static update(scene, waveWork) {
		if (waveWork.isEnd) return;

		const blocks = waveWork.blockWorks;
		for (let i = 0; i < blocks.length; i++) {
			const blockWork = blocks[i];
			BlockWorkHelper.update(scene, waveWork, blockWork);
		}
		let endBlockCount = 0;
		for (let i = 0; i < blocks.length; i++) {
			const blockWork = blocks[i];
			if (blockWork.isEnd) {
				endBlockCount++;
			}
		}
		if (blocks.length <= endBlockCount) {
			const isEnemyZero = scene.data.enemyArr.length <= 0;
			if (isEnemyZero) {
				var nextWaveIndex = MathHelper.wrap(waveWork.waveIndex + 1, 0, waveWork.waves.length);
				waveWork.waveIndex = nextWaveIndex;
				WaveWorkHelper.resetBlock(waveWork);
				//waveWork.isEnd = true;
				return;
			}
		}

		waveWork.waveTime += scene.app.ticker.deltaTime;
	}
}

const waveData = [
	{
		'blocks': [
			{
				'time': 500,
				'type': '',
				'moveDataName': 'circle_l',
				'pos': { 'x': 180, 'y': 160 },
				'delay': 200,
				'enemyCount': 10,
			},
		],
	},
	{
		'blocks': [
			{
				'time': 0,
				'type': '',
				'moveDataName': 'circle_r',
				'pos': { 'x': 60, 'y': 160 },
				'delay': 200,
				'enemyCount': 10,
			},
		],
	},
	{
		'blocks': [
			{
				'time': 0,
				'type': '',
				'moveDataName': 'circle_r',
				'pos': { 'x': 100, 'y': 160 },
				'delay': 200,
				'enemyCount': 10,
			},
			{
				'time': 100,
				'type': '',
				'moveDataName': 'circle_r',
				'pos': { 'x': 140, 'y': 160 },
				'delay': 200,
				'enemyCount': 10,
			},
		],
	},
	{
		'blocks': [
			{
				'time': 0,
				'type': '',
				'moveDataName': 'circle_l',
				'pos': { 'x': 100, 'y': 160 },
				'delay': 200,
				'enemyCount': 10,
			},
			{
				'time': 100,
				'type': '',
				'moveDataName': 'circle_l',
				'pos': { 'x': 140, 'y': 160 },
				'delay': 200,
				'enemyCount': 10,
			},
		],
	},
	{
		'blocks': [
			{
				'time': 0,
				'type': '',
				'moveDataName': 'zigzag_down',
				'pos': { 'x': 40, 'y': 0 },
				'delay': 200,
				'enemyCount': 10,
			},
			{
				'time': 200,
				'type': '',
				'moveDataName': 'zigzag_down',
				'pos': { 'x': 80, 'y': 0 },
				'delay': 200,
				'enemyCount': 10,
			},
			{
				'time': 300,
				'type': '',
				'moveDataName': 'zigzag_down',
				'pos': { 'x': 120, 'y': 0 },
				'delay': 200,
				'enemyCount': 10,
			},
		],
	},
	{
		'blocks': [
			{
				'time': 0,
				'type': '',
				'moveDataName': 'zigzag_down',
				'pos': { 'x': 200, 'y': 0 },
				'delay': 200,
				'enemyCount': 10,
			},
			{
				'time': 200,
				'type': '',
				'moveDataName': 'zigzag_down',
				'pos': { 'x': 160, 'y': 0 },
				'delay': 200,
				'enemyCount': 10,
			},
			{
				'time': 300,
				'type': '',
				'moveDataName': 'zigzag_down',
				'pos': { 'x': 120, 'y': 0 },
				'delay': 200,
				'enemyCount': 10,
			},
		],
	},
];

const moveDataDict = {
	'circle_r': [
		{
			type: 'path',
			time: 500,
			samples: [
				{ t:  0.00, x: 100,  y:   0 },
			],
		},
		{
			type: 'path',
			time: 5000,
			samples: [
				{ t:  0.00, x: 100,  y:   0 },
				{ t:  0.10, x:  70,  y:  70 },
				{ t:  0.20, x:  0,  y:  100 },
				{ t:  0.35, x:  -70,  y: 70 },
				{ t:  0.40, x: -100, y:   0 },
				{ t:  0.50, x:  -70, y: -70 },
				{ t:  0.60, x:  0,  y: -100 },
				{ t:  0.70, x:  70,  y: -70 },
				{ t:  1.00, x: 100,  y:   0 },
			],
		},
		{
			type: 'path',
			time: 1000,
			samples: [
				{ t:  0.00, x: 100,  y:   0 },
				{ t:  1.00, x: 300,  y: 300 },
			],
		},
	],
	'circle_l': [
		{
			type: 'path',
			time: 500,
			samples: [
				{ t:  0.00, x: -100,  y:   0 },
			],
		},
		{
			type: 'path',
			time: 5000,
			samples: [
				{ t:  0.00, x: -100,  y:   0 },
				{ t:  0.10, x:  -70,  y:  -70 },
				{ t:  0.20, x:  0,  y:  -100 },
				{ t:  0.35, x:  70,  y: -70 },
				{ t:  0.40, x: 100, y:   0 },
				{ t:  0.50, x:  70, y: 70 },
				{ t:  0.60, x:  0,  y: 100 },
				{ t:  0.70, x:  -70,  y: 70 },
				{ t:  1.00, x: -100,  y:   0 },
			],
		},
		{
			type: 'path',
			time: 1000,
			samples: [
				{ t:  0.00, x: -100,  y:   0 },
				{ t:  1.00, x: -300,  y: -300 },
			],
		},
	],
	'zigzag_down': [
		{
			type: 'path',
			time: 500,
			samples: [
				{ t:  0.00, x: 0,  y:   0 },
			],
		},
		{
			type: 'path',
			time: 3000,
			samples: [
				{ t:  0.00, x: 0,  y:   0 },
				{ t:  0.10, x: -20,  y:   40 },
				{ t:  0.20, x: 20,  y:   80 },
				{ t:  0.30, x: -20,  y:   120 },
				{ t:  0.40, x: 20,  y:   160 },
				{ t:  0.50, x: -20,  y:   200 },
				{ t:  0.60, x: 20,  y:   240 },
				{ t:  1.00, x: 0,  y:   320 },
			],
		},
		{
			type: 'path',
			time: 4000,
			samples: [
				{ t:  0.00, x: 0,  y:   320 },
				{ t:  0.10, x: -20,  y: 280 },
				{ t:  0.20, x: 20,  y:   240 },
				{ t:  0.30, x: -20,  y:   200 },
				{ t:  0.40, x: 20,  y:   160 },
				{ t:  0.50, x: -20,  y:   120 },
				{ t:  0.60, x: 20,  y:   80 },
				{ t:  1.00, x: 0,  y:   0 },
			],
		},
	],
};

class MoveWork {
	constructor(pos, moveData) {
		this.pos = new Vector2(pos.x, pos.y);
		this.index = 0;
		this.time = 0;
		this.state = 0;
		this.moveData = moveData;
	}
}

class MoveWorkHelper {
	static getPosition(moveWork, curPos) {
		const moveData = moveWork.moveData;
		if (MoveWorkHelper.isEnd(moveWork)) return curPos;
		const curve = moveData[moveWork.index];
		const t1 = MathHelper.clamp01(moveWork.time / curve.time);
		const samples = curve.samples;
		let minSample = samples[0];
		let maxSample = minSample;
		for (let i = samples.length - 1; 0 <= i; i--) {
			const sample = samples[i];
			if (sample.t <= t1) {
				minSample = sample;
				maxSample = samples[Math.min(i + 1, samples.length - 1)];
				break;
			}
		}
		const t2 = MathHelper.progress01(t1 - minSample.t, maxSample.t - minSample.t);
		//console.log(`t1: ${t1.toFixed(2)}, t2: ${t2.toFixed(2)}`);
		const pos = Vector2.lerp(minSample, maxSample, t2);
		pos.add(moveWork.pos);
		return pos;
	}

	static evalaute(moveWork, enemy) {
		if (!enemy.isActive) return;
		const pos = enemy.sprite;
		const nextPos = MoveWorkHelper.getPosition(moveWork, enemy);
		const v = Vector2.sub(nextPos, pos);
		if (0 < v.lengthSquared()) {
			enemy.sprite.rotation = v.toDegree();
		}
		enemy.sprite.x = nextPos.x;
		enemy.sprite.y = nextPos.y;

		enemy.isActive &= !MoveWorkHelper.isEnd(enemy.moveWork);
	}

	static isEnd(moveWork) {
		return moveWork.moveData.length <= moveWork.index;
	}

	static update(moveWork, deltaTime) {
		if (MoveWorkHelper.isEnd(moveWork)) return; 
		const moveData = moveWork.moveData;
		const curve = moveData[moveWork.index];
		if (curve.time <= moveWork.time) {
			moveWork.index++;
			moveWork.time = 0;
			return;
		}
		moveWork.time += deltaTime;
	}
}

class ObjectArrayHelper {
	static removeInactive(objArr) {
		for (let i = objArr.length - 1; 0 <= i; i--) {
			const item = objArr[i];
			if (item.isActive) continue;
			item.sprite.remove();
			objArr.splice(i, 1);
		}
	}
}

// MainScene クラスを定義
phina.define('MainScene', {
  superClass: 'DisplayScene',
  init: function(options) {
    this.superInit(options);
		// 背景色を指定
		this.backgroundColor = '#8888ff';

		{
			const sprite = Sprite("bg_01");
			sprite.x = DF.SC_W * 0.5;
			sprite.y = DF.SC_H * 0.5;
			sprite.addChildTo(this);
			this.bg_01 = sprite;
		}

		{
			const layer = DisplayElement();
			layer.addChildTo(this);
			this.layer0 = layer;
		}

		{
			const layer = DisplayElement();
			layer.addChildTo(this);
			this.layer1 = layer;
		}


		const data = {
			smokeArr: [],
			fireArr: [],
			speedLineArr: [],
			enemyArr: [],
			explosionArr: [],
			waveWork: new WaveWork(waveData),
			config: {
				drawHeight: 8,
				playerSpeed: 45,
				playerRotationSpeed: 120,
				playerBulletSpeed: 400,
				playerBulletCount: 2,
			},
			progress: {
				state: StateId.S1I,
				stateTime: 0,
				elapsedTime: 0,
				limitTime: 1000 * 90,
				mapI: 0,
				blockI: 0,
			},
		};

		data.player = new Player();
		data.player.sprite.addChildTo(this.layer1);

		{
			const label = Label({
				originX: 0.5,
				originY: 0,
				fontSize: 8,
				lineHeight: 2,
				align: 'left',
				fill: '#ffffff',
				stroke: '#000000',
				strokeWidth: 4,
			}).addChildTo(this);
			label.text = "hoge";
			label.x = 8;
			label.y = 16;
			this.debugLabel = label;
			this.debugLabel.visible = false;
		}
		{
			const label = Label({
				originX: 0.5,
				originY: 0,
				fontSize: 8,
				lineHeight: 2,
				align: 'left',
				fill: '#ffffff',
				stroke: '#000000',
				strokeWidth: 4,
			}).addChildTo(this);
			label.x = 8;
			label.y = 0;
			this.label = label;
		}
		{
			const label = Label({
				originX: 0.5,
				originY: 0.5,
				fontSize: 8,
				lineHeight: 2,
				align: 'center',
				fill: '#ffffff',
				stroke: '#000000',
				strokeWidth: 4,
			}).addChildTo(this);
			label.x = DF.SC_W * 0.5;
			label.y = DF.SC_H * 0.5;
			label.text = "hkt6";
			this.centerLabel = label;
		}
		this.data = data;
  },

	createSmoke: function(pos) {
		const sprite = CircleShape({
			width: 32,
			height: 32,
			fill: '#ff0',
			strokeWidth: 0,
		});
		sprite.alpha = 0.2;
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 1;
		sprite.addChildTo(this.layer1);

		let forceX = Math.randfloat(-1, 1) * 10;
		let forceY = Math.randfloat(-1, 1) * 10;

		const smoke = {
			isActive: true,
			sprite: sprite,
			force: Vector2(forceX, forceY),
			startRadius: 16,
			endRadius: 48,
			startAlpha: 0.5,
			endAlpha: 0,
			elapsedTime: 0,
			endTime: 5000,
		};
		this.data.smokeArr.push(smoke);
		return smoke;
	},

	createFire: function(pos, rotation) {
		const sprite = Sprite('ship_shot');
		sprite.rotation = rotation;
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 2;
		sprite.addChildTo(this.layer1);
		const fire = {
			isActive: true,
			sprite: sprite,
			elapsedTime: 0,
			endTime: 1000,
			rotation: rotation,
		};
		this.data.fireArr.push(fire);
		return fire;
	},

	createSpeedLine: function(pos, rotation) {
		const sprite = Sprite('speed_line');
		sprite.rotation = rotation;
		sprite.x = pos.x;
		sprite.y = pos.y;
		sprite.priority = 2;
		sprite.addChildTo(this.layer1);
		const speedLine = {
			isActive: true,
			sprite: sprite,
			elapsedTime: 0,
			endTime: 1000,
			rotation: rotation,
		};
		this.data.speedLineArr.push(speedLine);
		return speedLine;
	},

	getAppInput: function() {
		const key = this.app.keyboard;
		const appInput = {};
		const speed = 1;
		const dir = phina.geom.Vector2(0, 0);
		if (key.getKey('left'))  { dir.x -= speed; }
		if (key.getKey('right')) { dir.x += speed; }
		if (key.getKey('down'))  { dir.y += speed; }
		if (key.getKey('up'))    { dir.y -= speed; }
		appInput.dir = dir.normalize();
		appInput.putFire = key.getKey('z');
		return appInput;
	},

	update: function() {
		const appInput = this.getAppInput();

		const player = this.data.player;
		const speed1 = appInput.putSmoke ? 100 : 200;
		const speed = speed1 * this.app.ticker.deltaTime / 1000;


		const progress = this.data.progress;
		switch (progress.state) {
			case StateId.S1I:
				this.centerLabel.text = "MISSION START";
				progress.elapsedTime = 0;
				player.score = 0;
				player.railX = 1;
				{
					var tx = (DF.SC_W / 3) * (player.railX + 0.5);
					player.sprite.y = DF.SC_H - 40;
					player.sprite.x = tx;
				}
				progress.blockI = 0;
				this.layer0.y = 0;
				progress.stateTime = 0;
				progress.state = StateId.S1;
				break;
			case StateId.S1:
				if (1000 < progress.stateTime) {
					this.centerLabel.text = "";
					progress.state = StateId.S2;
				}
				break;
			case StateId.S2:
				// 操作.
				{
					if (!Vector2Helper.isZero(appInput.dir)) {
						var rotation = 0;
						if (appInput.dir.x < 0) {
							rotation -= 1;
						} else if (0 < appInput.dir.x) {
							rotation += 1;
						}
						player.rotation += rotation * this.data.config.playerRotationSpeed * this.app.ticker.deltaTime / 1000.0;
					}
					if (appInput.putFire) {
						if (player.fireInterval <= player.fireTime && this.data.fireArr.length < this.data.config.playerBulletCount) {
							player.fireTime = 0;
							this.createFire(player.sprite, player.rotation);
						}
					}
				}
				player.fireTime += this.app.ticker.deltaTime;

				for (let i = 0; i < 4; i++) {
					const rot = (progress.stateTime % 360) + (i * 80);
					const vec = new Vector2().fromDegree(rot, 100);
					vec.x += DF.SC_W * 0.5;
					vec.y += DF.SC_H * 0.5;
					this.createSpeedLine(vec, rot);
				}


				{
					var safeArea = new Rect(0, 0, DF.SC_W, DF.SC_H);
					player.isInSafeArea = Collision.testRectRect(safeArea, player.sprite);
				}

				const vec = new Vector2().fromDegree(player.rotation, 1);
				vec.mul(this.data.config.playerSpeed * this.app.ticker.deltaTime / 1000.0);
				player.sprite.x += vec.x;
				player.sprite.y += vec.y;

				progress.elapsedTime = Math.min(progress.elapsedTime + this.app.ticker.deltaTime, progress.limitTime);
				const t = progress.elapsedTime / progress.limitTime;
				if (1 <= t) {
					progress.state = StateId.S3I;
				}
				if (!player.isInSafeArea) {
					progress.state = StateId.S3I;
				}
				if (this.app.keyboard.getKeyDown('r')) {
					progress.state = StateId.S1I;
				}
				if (this.app.keyboard.getKeyDown('t')) {
					progress.elapsedTime = progress.limitTime - 2000;
				}
				if (this.app.keyboard.getKeyDown('e')) {
					const moveData = moveDataDict['circle'];
					EnemyHelper.createEnemy(this, new Vector2(DF.SC_W * 0.5, DF.SC_H * 0.5), moveData);
				}

				WaveWorkHelper.update(this, this.data.waveWork);

				this.data.fireArr.forEach((_item) => FireHelper.update(this, _item));


				{
					var safeArea = new Rect(0, 0, DF.SC_W, DF.SC_H);
					this.data.fireArr.forEach((_item) => {
						if (Collision.testRectRect(safeArea, _item.sprite)) return;
						_item.isActive = false;
					});
				}

				this.data.speedLineArr.forEach((_item) => SpeedLineHelper.update(this, _item));
				this.data.enemyArr.forEach((_item) => EnemyHelper.update(this, _item));
				this.data.explosionArr.forEach((_item) => ExplosionHelper.update(this, _item));

				{
					const fireArr = this.data.fireArr;
					const enemyArr = this.data.enemyArr;
					for (var i1 = 0; i1 < fireArr.length; i1++) {
						const fire = fireArr[i1];
						for (var i2 = 0; i2 < enemyArr.length; i2++) {
							const enemy = enemyArr[i2];
							if (!enemy.sprite.hitTestElement(fire.sprite)) continue;
							enemy.isActive = false;
							fire.isActive = false;
							ExplosionHelper.createExplosion(this, enemy.sprite);
							player.score += 100;
						}
					}
				}

				ObjectArrayHelper.removeInactive(this.data.fireArr);
				ObjectArrayHelper.removeInactive(this.data.speedLineArr);
				ObjectArrayHelper.removeInactive(this.data.enemyArr);
				ObjectArrayHelper.removeInactive(this.data.explosionArr);

				break;
			case StateId.S3I:
				progress.state = StateId.S3;
				this.centerLabel.text = "GAME OVER\nPRESS Z KEY";
				progress.stateTime = 0;
				break;
			case StateId.S3:
				if (this.app.keyboard.getKeyDown('z')) {
					progress.state = StateId.S1I;
				}
				break;
		}
		progress.stateTime += this.app.ticker.deltaTime;

		player.sprite.rotation = player.rotation;

		this.debugLabel.text = `XY(${player.sprite.x.toFixed(1)}, ${player.sprite.y.toFixed(1)})` +
			` SAFE ${player.isInSafeArea}`;
		this.label.text = "";

		const restTime = Math.max(0, progress.limitTime - progress.elapsedTime);
		const height = restTime / 1000;
		let fuga = progress.elapsedTime / progress.limitTime;
		fuga *= fuga;
		// let scale = 1.0 + MathHelper.clamp(10 * progress.elapsedTime / progress.limitTime, 0.0, 10.0);
		let scale = (100 / Math.max(1, (100 * (1, restTime / progress.limitTime))));
		scale = MathHelper.clamp(scale, 0, 100);

		this.bg_01.scaleX = scale;
		this.bg_01.scaleY = scale;

		this.label.text +=
			'HEIGHT ' + (restTime / 1000).toFixed(2) + " M " +
			'SCORE ' + Math.floor(player.score) +
			'';

		// sort
		this.layer1.children.sort((a, b) => {
			return a.priority - b.priority;
		});
	},
});

// メイン処理
phina.main(function() {
  // アプリケーション生成
  let app = GameApp({
    startLabel: 'main', // メインシーンから開始する
		fps: 60,
		width: DF.SC_W,
		height: DF.SC_H,
    assets: ASSETS,
  });
  // アプリケーション実行
  app.run();
});

