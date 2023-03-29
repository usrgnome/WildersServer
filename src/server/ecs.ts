import { b2Vec2 } from '@box2d/core';
import {
	Types,
	defineComponent,
	defineQuery,
	IWorld,
} from 'bitecs'
import { ENTITY_INFO, toMeters, toPixels } from '../shared/config';
import { ENTITY } from '../shared/EntityTypes';
import { ITEM, ITEMS, ITEM_CATEGORY } from '../shared/Item';
import { lerp, lerpAngle } from '../shared/Utilts';
import { ECS_NULL } from './constants';
import { Attack, MeeleAttack } from './entity';
import World from './world';

export const C_DESTROYED = defineComponent();
export const C_PHYS_CONTROLLER = defineComponent({ ptr: Types.ui32 });
export const C_CLIENT = defineComponent({ cid: Types.ui16 });
export const C_ENTITY = defineComponent({ type: Types.ui8, angle: Types.f32, x: Types.f32, y: Types.f32, info: Types.ui16, depth: Types.ui8, destroyed: Types.ui8 });
export const C_Controller = defineComponent({ active: Types.ui8, dirX: Types.f32, dirY: Types.f32, rotation: Types.f32, mouseDown: Types.ui8 });
export const C_ATTACK_TIMER = defineComponent({ elapsed: Types.f32, cooldown: Types.f32, active: Types.ui8 });
export const C_INVENTORY = defineComponent({ ptr: Types.ui32 });
export const C_EQUIP = defineComponent({ itemId: Types.ui16, cooldown: Types.f32 });
export const C_EFFECTED_BY_CAMPFIRE = defineComponent({ count: Types.ui16 });
export const C_EFFECTED_BY_WORKBENCH = defineComponent({ count: Types.ui16 });
export const C_EFFECTED_BY_WATER = defineComponent({ count: Types.ui16 });
export const C_Health = defineComponent({ value: Types.f32, max: Types.f32 });
export const C_Stats = defineComponent({ cold: Types.f32, hunger: Types.f32 });
export const C_NETWORK = defineComponent({ add: Types.ui8, update: Types.ui8, remove: Types.ui8 });
export const C_OWNED = defineComponent({ ownerEid: Types.i32 });
export const C_LIFE_DURATION = defineComponent({ ticks: Types.i32 });
export const C_MOB_AI = defineComponent({ nextMoveTick: Types.ui32, turnTimeElapsed: Types.f32, turnTimeDuration: Types.f32, turning: Types.ui8, targetAngle: Types.f32 });
export const C_OWNS = defineComponent()
export const C_BobAnimation = defineComponent();
export const C_HIT_REWARD = defineComponent({ item: Types.ui16, quantity: Types.ui16, score: Types.ui32 });
export const C_HIT_FILTER = defineComponent({ category: Types.ui16, level: Types.ui8 });
export const C_SCORE = defineComponent({ score: Types.ui32 });
export const C_ITEM = defineComponent({ item: Types.ui16, quantity: Types.ui32, tickToPickUp: Types.ui16 });

export const Q_Controller = defineQuery([C_Controller])
export const Q_AttackTimer = defineQuery([C_ATTACK_TIMER]);
export const Q_PlayerAttack = defineQuery([C_ATTACK_TIMER, C_Controller, C_EQUIP, C_PHYS_CONTROLLER]);
export const Q_EffectedByCampfire = defineQuery([C_EFFECTED_BY_CAMPFIRE]);
export const Q_EffectedByWorkbench = defineQuery([C_EFFECTED_BY_WORKBENCH]);
export const Q_EffectedByWater = defineQuery([C_EFFECTED_BY_WATER]);
export const Q_Stats = defineQuery([C_Stats, C_Health]);
export const Q_EQUIP = defineQuery([C_EQUIP]);
export const Q_MOB_AI = defineQuery([C_MOB_AI, C_PHYS_CONTROLLER]);
export const Q_LIFE_DURATION = defineQuery([C_LIFE_DURATION]);
export const Q_LEADERBOARD = defineQuery([C_CLIENT, C_SCORE]);
export const Q_ITEM = defineQuery([C_ITEM]);

export function S_ITEM_TICK(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_ITEM(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];
		if (C_ITEM.tickToPickUp[eid]) C_ITEM.tickToPickUp[eid]--
	}
}

export function S_LIFE_DURATION(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_LIFE_DURATION(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];
		const tick = C_LIFE_DURATION.ticks[eid];
		if (tick === 1 || tick === 0) {
			C_LIFE_DURATION.ticks[eid] = 0;
			world.entities.die(eid);
		} else {
			C_LIFE_DURATION.ticks[eid]--;
		}
	}
}

export function S_MOB(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_MOB_AI(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		const controller = world.entities.getController(eid);

		let targetEid = ECS_NULL;
		for (let _eid of controller.visibleEntities) {
			if (C_ENTITY.type[_eid] === ENTITY.PLAYER && eid !== _eid) {
				targetEid = _eid;
				break;
			}
		}

		let velX = 0;
		let velY = 0;
		let hasTarget = false;

		if (targetEid !== ECS_NULL) {

			const targetController = world.entities.getController(targetEid);
			if (!targetController) continue;

			velX = targetController.getPosition().x - controller.getPosition().x;
			velY = targetController.getPosition().y - controller.getPosition().y;



			const distSqr = Math.sqrt(velX * velX + velY * velY);

			if (distSqr < toMeters(200)) {
				const position = controller.getPosition();
				const attack = new MeeleAttack(eid, position, toMeters(500), 0, 1, 1, ITEM_CATEGORY.FIST, ITEM_CATEGORY.FIST);
				world.addAttack(attack);
			}

			const maxRange = 50;
			if (distSqr <= toMeters(maxRange)) {
				continue;
			}

			const angle = Math.atan2(velY, velX);
			C_ENTITY.angle[eid] = lerpAngle(C_ENTITY.angle[eid], angle, 0.5);

			const tAngle = C_ENTITY.angle[eid];
			//C_ENTITY.angle[eid] = angle;

			velX = Math.cos(tAngle);
			velY = Math.sin(tAngle);

			let magSqrd = velX * velX + velY * velY;
			let invMag = magSqrd !== 0 ? 1 / Math.sqrt(magSqrd) : 1;
			velX *= invMag;
			velY *= invMag;
			hasTarget = true;


		} else {
			// nothing in view, do idle movement

			C_MOB_AI.turnTimeDuration[eid] = 0.6;
			// if entity is in turning
			if (C_MOB_AI.turning[eid]) {

				const t = C_MOB_AI.turnTimeElapsed[eid] / C_MOB_AI.turnTimeDuration[eid];
				C_ENTITY.angle[eid] = lerpAngle(C_ENTITY.angle[eid], C_MOB_AI.targetAngle[eid], t);

				C_MOB_AI.turnTimeElapsed[eid] += delta;
				if (C_MOB_AI.turnTimeElapsed[eid] >= C_MOB_AI.turnTimeDuration[eid]) {
					C_MOB_AI.turnTimeElapsed[eid] = 0;
					C_MOB_AI.turning[eid] = +false;
				}
			} else {
				C_MOB_AI.nextMoveTick[eid] = Math.max(0, C_MOB_AI.nextMoveTick[eid] - 1);
				if (C_MOB_AI.nextMoveTick[eid] === 0) {
					C_MOB_AI.targetAngle[eid] = Math.random() * Math.PI * 2;
					C_MOB_AI.nextMoveTick[eid] = 15 * 3;
					C_MOB_AI.turning[eid] = +true;
				} else {
					const angle = C_ENTITY.angle[eid];
					velX = Math.cos(angle)
					velY = Math.sin(angle)
				}
			}

		}

		let speed = !world.entities.hasState(eid, ENTITY_INFO.WATER) ? toMeters(hasTarget ? 570 : 300) : toMeters(400);
		velX *= speed;
		velY *= speed;

		const velocity = controller.getVelocity();
		const mass = controller.getMass();

		let velChangeX = velX - velocity.x;
		let velChangeY = velY - velocity.y;
		let impulseX = (velChangeX * mass);
		let impulseY = (velChangeY * mass);

		controller.applyImpulse(impulseX, impulseY);
	}
}

export function S_TickEquipCooldown(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_EQUIP(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_EQUIP.cooldown[eid] > 0) {
			C_EQUIP.cooldown[eid] -= delta;
			if (C_EQUIP.cooldown[eid] < 0) {
				C_EQUIP.cooldown[eid] = 0;
			}
		}
	}
}

export function S_TickStats(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_Stats(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		const torchWarmth = world.entities.hasComponent(eid, C_EQUIP) && C_EQUIP.itemId[eid] === ITEM.TORCH ? 2 : 0;

		if (world.entities.hasState(eid, ENTITY_INFO.NEAR_FIRE)) {
			C_Stats.cold[eid] = Math.min(100, C_Stats.cold[eid] + 5);
		} else {
			const depth = C_ENTITY.depth[eid];
			const surfaceDepth = 0;
			if (depth === surfaceDepth) {
				if (world.night()) {
					C_Stats.cold[eid] = Math.max(0, C_Stats.cold[eid] - 2 + torchWarmth);
				} else {
					C_Stats.cold[eid] = Math.min(100, C_Stats.cold[eid] + 5);
				}
			} else {
				C_Stats.cold[eid] = Math.max(0, C_Stats.cold[eid] - 3 + torchWarmth);
			}
		}

		C_Stats.hunger[eid] = Math.max(0, C_Stats.hunger[eid] - 1);

		if (C_Stats.cold[eid] === 0) {
			world.entities.damage(eid, 10, ECS_NULL);
		}

		if (C_Stats.hunger[eid] === 0) {
			world.entities.damage(eid, 10, ECS_NULL);
		}
	}
}

export function S_Heal(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_Stats(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_Stats.cold[eid] >= 30 && C_Stats.hunger[eid] >= 30) {
			C_Health.value[eid] = Math.min(C_Health.max[eid], C_Health.value[eid] + 20);
		}
	}
}

export function S_EffectedByCampfire(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_EffectedByCampfire(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_EFFECTED_BY_CAMPFIRE.count[eid] > 0) {
			C_ENTITY.info[eid] |= ENTITY_INFO.NEAR_FIRE;
		} else {
			C_ENTITY.info[eid] &= ~ENTITY_INFO.NEAR_FIRE;
		}
	}
}

export function S_EffectedByWater(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_EffectedByWater(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_EFFECTED_BY_WATER.count[eid] > 0) {
			C_ENTITY.info[eid] |= ENTITY_INFO.WATER;
		} else {
			C_ENTITY.info[eid] &= ~ENTITY_INFO.WATER;
		}
	}
}

export function S_EffectedByWorkbench(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_EffectedByWorkbench(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_EFFECTED_BY_WORKBENCH.count[eid] > 0) {
			C_ENTITY.info[eid] |= ENTITY_INFO.NEAR_WORKBENCH;
		} else {
			C_ENTITY.info[eid] &= ~ENTITY_INFO.NEAR_WORKBENCH;
		}
	}
}

export function S_PlayerAttack(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_AttackTimer(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_Controller.mouseDown[eid]) {
			if (!C_ATTACK_TIMER.active[eid]) {
				C_Controller.mouseDown[eid] = +false;
				const controller = world.entities.getController(eid);
				const item = ITEMS[C_EQUIP.itemId[eid]];
				const position = controller.getPosition();
				let cooldown = 0;



				if (item.meelee) {
					const angle = C_ENTITY.angle[eid];
					const range = toMeters(120);
					const x = position.x + Math.cos(angle) * range;
					const y = position.y + Math.sin(angle) * range;
					let attack: Attack;

					attack = new MeeleAttack(eid, new b2Vec2(x, y), toMeters(40), item.castTime, item.effectTime, item.damage, item.category, item.level);
					cooldown = 2 * (item.cooldownTime + item.castTime) / 15;
					world.addAttack(attack);
					world.server.sendAttack(eid, item);
				}
				if (item.consumable) {
				}
				else if (item.placeable) {
					//cooldown = 1;
					//this
				} else {

				}

				if (cooldown) {
					C_ATTACK_TIMER.active[eid] = +true;
					C_ATTACK_TIMER.elapsed[eid] = 0;
					C_ATTACK_TIMER.cooldown[eid] = cooldown;
				}
			}
		}
	}
}

export function S_AttackTimer(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_AttackTimer(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		if (C_ATTACK_TIMER.active[eid]) {
			C_ATTACK_TIMER.elapsed[eid] += delta;

			if (C_ATTACK_TIMER.elapsed[eid] >= C_ATTACK_TIMER.cooldown[eid]) {
				C_ATTACK_TIMER.elapsed[eid] = 0;
				C_ATTACK_TIMER.active[eid] = +false;
			}
		}
	}
}

export function S_Controller(world: World, ecsWorld: IWorld, delta: number) {
	const ents = Q_Controller(ecsWorld);
	for (let i = 0; i < ents.length; i++) {
		const eid = ents[i];

		const controller = world.entities.getController(eid);
		if (!controller) continue;


		C_ENTITY.angle[eid] = C_Controller.rotation[eid];

		const position = controller.getPosition();
		const tile = world.getTile(position.x, position.y)

		switch (tile) {
			case 2:
				C_ENTITY.depth[eid] = 0;
				break;
			case 1:
				C_ENTITY.depth[eid] = 1;
				break;
			default:
				C_ENTITY.depth[eid] = 2;
				break;
		}

		if (tile !== 2) {
			C_ENTITY.info[eid] |= ENTITY_INFO.CAVE;
		} else {
			C_ENTITY.info[eid] &= ~ENTITY_INFO.CAVE;
		}

		if (C_Controller.active[eid]) {
			let velX = C_Controller.dirX[eid];
			let velY = C_Controller.dirY[eid];

			let speed = !world.entities.hasState(eid, ENTITY_INFO.WATER) ? toMeters(600) : toMeters(300);
			velX *= speed;
			velY *= speed;

			const velocity = controller.getVelocity();
			const mass = controller.getMass();

			let velChangeX = velX - velocity.x;
			let velChangeY = velY - velocity.y;
			let impulseX = (velChangeX * mass);
			let impulseY = (velChangeY * mass);

			controller.applyImpulse(impulseX, impulseY);
		}
	}
}