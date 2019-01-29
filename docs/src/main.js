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
};

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
		if (max - 1 < v) return max - 1;
		return v;
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

	static isInRange(v, min, max) {
		return min <= v && v < max;
	}
}

function assertEq(a, b) {
	if (a === b) return;
	const n = 0;
//	throw "assert " + a + " vs " + b;
}

assertEq(0, MathHelper.wrap(3, 0, 3));
assertEq(2, MathHelper.wrap(2, 0, 3));
assertEq(1, MathHelper.wrap(1, 0, 3));
assertEq(2, MathHelper.wrap(-1, 0, 3));
assertEq(1, MathHelper.wrap(-2, 0, 3));
assertEq(0, MathHelper.wrap(-3, 0, 3));
assertEq(2, MathHelper.wrap(-4, 0, 3));
assertEq(1, MathHelper.wrap(-5, 0, 3));

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
		smoke.sprite.rotation = smoke.rotation + 90;
		smoke.isActive &= !MathHelper.isLerpEnd(t);
		smoke.elapsedTime += scene.app.ticker.deltaTime;
		const v = new Vector2().fromDegree(smoke.rotation, 200 * scene.app.ticker.deltaTime / 1000.0);
		smoke.sprite.x += v.x;
		smoke.sprite.y += v.y;
	}
}

class SpeedLineHelper {
	static update(scene, smoke) {
		const t = MathHelper.tForLerp(smoke.elapsedTime, smoke.endTime);
		smoke.sprite.rotation = smoke.rotation + 90;
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

// MainScene クラスを定義
phina.define('MainScene', {
  superClass: 'DisplayScene',
  init: function(options) {
    this.superInit(options);
		// 背景色を指定
		this.backgroundColor = '#8888ff';

		{
			const sprite = Sprite("bg_01");
			sprite.x = 240 * 0.5;
			sprite.y = 320 * 0.5;
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
			blastArr: [],
			config: {
				drawHeight: 8,
				playerSpeed: 45,
				playerRotationSpeed: 120,
			},
			progress: {
				state: StateId.S1I,
				stateTime: 0,
				elapsedTime: 0,
				limitTime: 1000 * 100,
				mapI: 0,
				blockI: 0,
			},
		};


		{
			const sprite = Sprite("ship");
			sprite.width = 48;
			sprite.height = 48;
			sprite.x = 120;
			sprite.y = 320 * 3 / 4;
			sprite.priority = 3;
			sprite.addChildTo(this.layer1);

			data.player = {
				score: 0,
				sprite: sprite,
				fireInterval: 200,
				fireTime: 0,
				rotation: -90,
				isInSafeArea: true,
			};
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
			label.text = "hoge";
			label.x = 8;
			label.y = 16;
			this.debugLabel = label;
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
			label.x = 240 * 0.5;
			label.y = 320 * 0.5;
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
		sprite.rotation = rotation + 90;
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
		sprite.rotation = rotation + 90;
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
				this.centerLabel.text = "READY";
				progress.elapsedTime = 0;
				player.score = 0;
				player.railX = 1;
				{
					var tx = (240 / 3) * (player.railX + 0.5);
					player.sprite.y = 320 - 40;
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
						if (player.fireInterval <= player.fireTime) {
							player.fireTime = 0;
							this.createFire(player.sprite, player.rotation);
						}
					}
				}
				player.fireTime += this.app.ticker.deltaTime;

				for (let i = 0; i < 4; i++) {
					const rot = (progress.stateTime % 360) + (i * 80);
					const vec = new Vector2().fromDegree(rot, 100);
					vec.x += 240 * 0.5;
					vec.y += 320 * 0.5;
					this.createSpeedLine(vec, rot);
				}


				{
					var safeArea = new Rect(0, 0, 240, 320);
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
				{
					// update
					const fireArr = this.data.fireArr;
					for (var i = 0; i < fireArr.length; i++) {
						FireHelper.update(this, fireArr[i]);
					}
				}
				{
					// remove
					const fireArr = this.data.fireArr;
					for (let i = fireArr.length - 1; 0 <= i; i--) {
						const fire = fireArr[i];
						if (fire.isActive) continue;
						fire.sprite.remove();
						fireArr.splice(i, 1);
					}
				}
				{
					// update
					const speedLineArr = this.data.speedLineArr;
					for (var i = 0; i < speedLineArr.length; i++) {
						SpeedLineHelper.update(this, speedLineArr[i]);
					}
				}
				{
					// remove
					const speedLineArr = this.data.speedLineArr;
					for (let i = speedLineArr.length - 1; 0 <= i; i--) {
						const speedLine = speedLineArr[i];
						if (speedLine.isActive) continue;
						speedLine.sprite.remove();
						speedLineArr.splice(i, 1);
					}
				}
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

		player.sprite.rotation = player.rotation + 90;

		this.debugLabel.text = `XY(${player.sprite.x.toFixed(1)}, ${player.sprite.y.toFixed(1)})` +
			` SAFE ${player.isInSafeArea}`;
		this.label.text = "";

		const height = (Math.max(0, progress.limitTime - progress.elapsedTime) / 1000);
		let fuga = progress.elapsedTime / progress.limitTime;
		fuga *= fuga;
		const scale = 1.0 + MathHelper.clamp(10 * progress.elapsedTime / progress.limitTime, 0.0, 10.0);
		this.bg_01.scaleX = scale;
		this.bg_01.scaleY = scale;

		this.label.text +=
			'HEIGHT ' + (Math.max(0, progress.limitTime - progress.elapsedTime) / 1000).toFixed(2) + " M " +
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
		width: 240,
		height: 320,
    assets: ASSETS,
  });
  // アプリケーション実行
  app.run();
});

