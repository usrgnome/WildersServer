import { Client } from './client';
import { Inventory, Stack } from '../shared/inventory';
import World from './world';
import { C_CLIENT, C_HIT_FILTER } from './ecs';
import { ENTITY } from '../shared/EntityTypes';
import { Item, ITEM, ITEMS } from '../shared/Item';
import {
    b2Body,
    b2Vec2,
    b2BodyType,
    b2BodyDef,
    b2CircleShape,
    b2FixtureDef,
} from '@box2d/core';
import { toMeters } from '../shared/config';
import { PhysicsBodyController } from './controllers/controller';
import { createWorld, hasComponent } from 'bitecs';
import Server from './server';
import {
    addEntity,
    addComponent,
    removeEntity,
    removeComponent,
    IComponent,
} from 'bitecs';
import { ITEM_CATEGORY, ITEM_LEVEL } from '../shared/Item';
import { WallPhysicsController } from './controllers/wall_controller';
import { ResourcePhysicsController } from './controllers/resource_controller';
import { PlayerPhysicsController } from './controllers/player_controller';
import { FirePhysicsController } from './controllers/fire_controller';
import { WorkbenchPhysicsController } from './controllers/workbench_controller';
import { LakePhysicsController } from './controllers/lake_controller';
import { CaveWallPhysicsController } from './controllers/cave_wall_controller';
import { BushPhysicsController } from './controllers/bush_controller';
import { ItemPhysicsController } from './controllers/item_controller';
import {
    C_ATTACK_TIMER,
    C_BobAnimation,
    C_Controller,
    C_EFFECTED_BY_CAMPFIRE,
    C_EFFECTED_BY_WATER,
    C_EFFECTED_BY_WORKBENCH,
    C_ENTITY,
    C_EQUIP,
    C_Health,
    C_HIT_REWARD,
    C_INVENTORY,
    C_ITEM,
    C_LIFE_DURATION,
    C_MOB_AI,
    C_NETWORK,
    C_OWNED,
    C_OWNS,
    C_PHYS_CONTROLLER,
    C_SCORE,
    C_Stats,
    Q_LEADERBOARD,
    S_AttackTimer,
    S_Controller,
    S_EffectedByCampfire,
    S_EffectedByWater,
    S_EffectedByWorkbench,
    S_ITEM_TICK,
    S_LIFE_DURATION,
    S_MOB,
    S_PlayerAttack,
    S_TickEquipCooldown,
} from './ecs';
import { WolfPhysicsController } from './controllers/wolf_controller';
import { CID_NULL, COLLISION_MASK, COLLISION_TAG, ECS_NULL } from './Constants';
import { IFixtureUserData } from './types';
import { ServerInventory } from './inventory';

export class AttackTimer {
    active = false;
    elapsed = 0;
    duration = 0;

    start () {
        this.active = true;
    }

    stop () {
        this.active = false;
    }

    reset () {
        this.elapsed = 0;
    }

    setDuration (duration: number) {
        this.stop();
        this.duration = duration;
        this.reset();
    }

    update (delta: number) {
        if (this.active) {
            this.elapsed += delta;
            if (this.elapsed >= this.duration) {
                this.stop();
                this.reset();
            }
        }
    }
}

export class Attack {
    finished: boolean;
    castTime: number;
    effectTime: number;
    elapsed: number = 0;
    //elapsed: number = 0;
    radius: number;
    effected: Set<number> = new Set();
    damaged: Set<number> = new Set();
    castingEntity: number;
    body: b2Body = null;
    position: b2Vec2;
    continiousDamage: boolean;
    selfDamage: boolean;
    world: World = null;
    damage: number;
    category: number;
    level: number;

    constructor (
        castingEntity: number,
        position: b2Vec2,
        radius: number,
        castTime: number,
        effectTime: number,
        continiousDamage: boolean,
        selfDamage: boolean,
        damage: number,
        category: number,
        level: number
    ) {
        this.category = category;
        this.level = level;
        this.damage = damage;
        this.finished = false;
        this.castTime = castTime;
        this.effectTime = effectTime;
        this.castingEntity = castingEntity;
        this.radius = radius;
        this.position = new b2Vec2(position.x, position.y);
        this.continiousDamage = continiousDamage;
        this.selfDamage = false;
    }

    onAdded (world: World) {
        this.world = world;

        const bodyDef: b2BodyDef = {
            type: b2BodyType.b2_dynamicBody,
            position: new b2Vec2(this.position.x, this.position.y),
        };

        const body: b2Body = world.b2world.CreateBody(bodyDef);

        const staticCircle: b2CircleShape = new b2CircleShape(toMeters(100));

        const fixtureDef: b2FixtureDef = {
            shape: staticCircle,
            isSensor: true,
            filter: {
                categoryBits:
                    COLLISION_MASK.ALIVE | COLLISION_MASK.ENTITY_HITBOX,
                maskBits:
                    COLLISION_MASK.ENVRIONMENT |
                    COLLISION_MASK.ALIVE |
                    COLLISION_MASK.ENTITY_HITBOX,
            },
        };

        const fixture = body.CreateFixture(fixtureDef);

        let userData: IFixtureUserData = {
            eid: this.castingEntity,
            tag: COLLISION_TAG.ATTACK,
            attack: this,
        };

        fixture.SetUserData(userData);
        this.body = body;
    }

    onRemoved (world: World) {
        world.b2world.DestroyBody(this.body);
    }

    isActive () {
        return (
            this.elapsed > this.castTime &&
            this.elapsed - this.castTime <= this.effectTime
        );
    }

    update (delta: number) {
        if (!this.finished) {
            this.elapsed += 1;
            if (this.elapsed > this.castTime + this.effectTime) {
                this.finished = true;
                this.elapsed = 0;
                this.effected.clear();
            }
        }

        if (this.continiousDamage) {
            if (this.isActive()) {
                for (const eid of this.effected) {
                    this.effectEntity(eid);
                }
            }
        } else {
            if (this.isActive()) {
                for (const eid of this.effected) {
                    if (!this.damaged.has(eid)) {
                        this.effectEntity(eid);
                    }
                }
            }
        }
    }

    private effectEntity (eid: number) {
        if (!this.selfDamage && eid === this.castingEntity) {
            return;
        }

        const hitForce = toMeters(100);
        const controllerA = this.world.entities.getController(eid);
        const controllerB = this.world.entities.getController(
            this.castingEntity
        );

        if (controllerA && controllerB) {
            const posA = controllerA.getPosition(),
                posB = controllerB.getPosition();
            let dx = posA.x - posB.x;
            let dy = posA.y - posB.y;
            const mag = dx * dx + dy * dy;
            const invMag = 1 / (mag ? Math.sqrt(mag) : 0);
            dx *= invMag;
            dy *= invMag;
            controllerA.applyImpulse(dx * hitForce, dy * hitForce);
        }

        this.world.entities.damage(eid, this.damage, this.castingEntity);
        this.damaged.add(eid);
    }

    hasEffected (eid: number) {
        return this.effected.has(eid);
    }

    addEffected (eid: number) {
        if (this.world.entities.hasComponent(eid, C_HIT_FILTER)) {
            if (
                (C_HIT_FILTER.category[eid] & this.category) === 0 ||
                this.level < C_HIT_FILTER.level[eid]
            ) {
                if (
                    this.world.entities.hasComponent(
                        this.castingEntity,
                        C_CLIENT
                    )
                ) {
                    const client = this.world.entities.getClient(
                        this.castingEntity
                    );
                    if (client) {
                        client.setWrongToolFlag();
                    }
                }

                return;
            }
        }

        this.effected.add(eid);

        if (!this.continiousDamage && this.isActive()) {
            // do the damage on when entity first come in contact
            this.effectEntity(eid);
        }
    }

    removeEffected (eid: number) {
        this.effected.delete(eid);
        this.damaged.delete(eid);
    }
}

export class MeeleAttack extends Attack {
    startAngle: number;
    maxAngleDifference: number;

    constructor (
        castingEntity: number,
        position: b2Vec2,
        radius: number,
        castTime: number,
        effectTime: number,
        damage: number,
        category: number,
        level: number
    ) {
        super(
            castingEntity,
            position,
            radius,
            castTime,
            effectTime,
            false,
            false,
            damage,
            category,
            level
        );
    }
}

export class EntityManager {
    world: World;
    bitecs = createWorld();

    // store the controllers for the box2d bodies
    bodies: PhysicsBodyController[] = [];

    // store a hashmap of parentEID to childEID's
    ownedEntities: Map<number, Set<number>> = new Map();

    // store a listof entity inventories
    inventories: ServerInventory[] = [];

    constructor (world: World) {
        this.world = world;
    }

    update (delta: number) {
        const world = this.world;
        const bitecs = this.bitecs;
        S_ITEM_TICK(world, bitecs, delta);
        S_Controller(world, bitecs, delta);
        S_AttackTimer(world, bitecs, delta);
        S_PlayerAttack(world, bitecs, delta);
        S_EffectedByCampfire(world, bitecs, delta);
        S_EffectedByWorkbench(world, bitecs, delta);
        S_EffectedByWater(world, bitecs, delta);
        S_MOB(world, bitecs, delta);
        S_LIFE_DURATION(world, bitecs, delta);
        S_TickEquipCooldown(world, bitecs, delta);
    }

    placeEntity (eid: number, item: Item) {
        const position = this.getController(eid).getPosition();
        const angle = C_ENTITY.angle[eid];
        const range = toMeters(160);
        const x = position.x + Math.cos(angle) * range;
        const y = position.y + Math.sin(angle) * range;
        let placedEntity = false;

        switch (item.id) {
            case ITEM.WOOD_WALL:
                if (
                    this.world.isAreaEmpty(
                        eid,
                        WallPhysicsController.bodyShape,
                        x,
                        y
                    )
                ) {
                    this.createWall(x, y, angle, eid);
                    placedEntity = true;
                }
                break;
            case ITEM.WORK_BENCH:
                if (
                    this.world.isAreaEmpty(
                        eid,
                        WorkbenchPhysicsController.hitboxShape,
                        x,
                        y
                    )
                ) {
                    this.createWorkbench(x, y, angle, eid);
                    placedEntity = true;
                }
                break;
            case ITEM.FIRE:
                if (
                    this.world.isAreaEmpty(
                        eid,
                        FirePhysicsController.hitboxShape,
                        x,
                        y
                    )
                ) {
                    this.createFire(x, y, angle, eid);
                    placedEntity = true;
                }
                break;
            default:
                break;
        }

        if (placedEntity) {
            if (this.hasInventory(eid)) {
                const inventory = this.getInventory(eid);
                inventory.removeItem(item, 1);
            }
        }
        return placedEntity;
    }

    /*
     *   logic for entity consuming an consumable item
     */
    consume (eid: number, item: Item) {
        if (!item.consumable) return;
        const inventory = this.inventories[C_INVENTORY.ptr[eid]];
        if (inventory.hasQuantity(item.id, 1)) {
            C_Stats.hunger[eid] = Math.min(100, C_Stats.hunger[eid] + 1);
            inventory.removeItem(item, 1);
        }
    }

    // ******************
    //  ECS RELATED CODE
    // ******************

    private addComponent (eid: number, component: IComponent) {
        addComponent(this.bitecs, component, eid, true);
    }

    private removeComponent (eid: number, component: IComponent) {
        removeComponent(this.bitecs, component, eid, true);
    }

    hasComponent (eid: number, component: IComponent) {
        return hasComponent(this.bitecs, component, eid);
    }

    addController (controller: PhysicsBodyController) {
        // if world is inside update loop, we need to add the physics body after the loop has exited
        if (this.world.isUpdating()) {
            this.world.addEntityControllertoQueue(controller);
            return;
        }

        const index = this.bodies.length;
        this.bodies.push(controller);
        //addComponent(this.bitecs, C_PHYS_CONTROLLER, controller.eid);
        this.addComponent(controller.eid, C_PHYS_CONTROLLER);

        C_PHYS_CONTROLLER.ptr[controller.eid] = index;
        controller.onAdded(this.world);
    }

    private removeController (controller: PhysicsBodyController) {
        const index = C_PHYS_CONTROLLER.ptr[controller.eid];
        const lastIdx = this.bodies.length - 1;
        if (index !== lastIdx) {
            const tmp = this.bodies[lastIdx];
            this.bodies[lastIdx] = controller;
            C_PHYS_CONTROLLER.ptr[tmp.eid] = index;
            this.bodies[index] = tmp;
        }

        this.bodies.pop();
        controller.onRemoved(this.world);
        //removeComponent(this.bitecs, C_PHYS_CONTROLLER, controller.eid);
        this.removeComponent(controller.eid, C_PHYS_CONTROLLER);
    }

    /*
     *   Add Inventory and the inventory component to an entity
     */
    private addInventory (inventory: ServerInventory, eid: number) {
        this.addComponent(eid, C_INVENTORY);
        inventory.eid = eid;

        const index = this.inventories.length;
        C_INVENTORY.ptr[eid] = index;
        this.inventories.push(inventory);
    }

    private removeInventory (eid: number) {
        const index = C_INVENTORY.ptr[eid];

        const len = this.inventories.length - 1;

        if (index !== len) {
            const tmp = this.inventories[len];
            this.inventories[len] = this.inventories[index];
            this.inventories[index] = tmp;

            C_INVENTORY.ptr[tmp.eid] = index;
        }

        this.inventories.pop();

        //removeComponent(this.bit, C_INVENTORY, eid);
        this.removeComponent(eid, C_INVENTORY);
    }

    defNetworked (eid: number, add: boolean, update: boolean, remove: boolean) {
        //addComponent(this.ecsWorld, C_NETWORK, eid);
        this.addComponent(eid, C_NETWORK);
        C_NETWORK.add[eid] = +add;
        C_NETWORK.update[eid] = +update;
        C_NETWORK.remove[eid] = +remove;
    }

    defItem (eid: number, item: Item, quantity = 1, tickToPickUp = 1) {
        this.addComponent(eid, C_ITEM);
        C_ITEM.item[eid] = item.id;
        C_ITEM.quantity[eid] = quantity;
        C_ITEM.tickToPickUp[eid] = tickToPickUp;
    }

    defBobAniamtion (eid: number) {
        this.addComponent(eid, C_BobAnimation);
    }

    defHealth (eid: number, health: number, maxHealth: number) {
        health = Math.max(0, Math.min(health, maxHealth));
        this.addComponent(eid, C_Health);
        C_Health.value[eid] = health;
        C_Health.max[eid] = maxHealth;
    }

    defLifeDuration (eid: number, ticks: number) {
        this.addComponent(eid, C_LIFE_DURATION);
        C_LIFE_DURATION.ticks[eid] = ticks;
    }

    defOwnedEntities (eid: number) {
        this.addComponent(eid, C_OWNS);
        this.ownedEntities.set(eid, new Set());
    }

    defOwner (eid: number, ownerEid: number) {
        if (ownerEid === CID_NULL) return;
        if (!this.hasComponent(ownerEid, C_OWNS))
            throw 'cant set owner of entity who hasnt got owner component';
        if (!this.hasComponent(eid, C_OWNED)) this.addComponent(eid, C_OWNED);
        C_OWNED.ownerEid[eid] = ownerEid;
        this.ownedEntities.get(ownerEid).add(eid);
    }

    defHitLevel (eid: number, category: number, level: number) {
        this.addComponent(eid, C_HIT_FILTER);
        C_HIT_FILTER.category[eid] = category;
        C_HIT_FILTER.level[eid] = level;
    }

    defHitreward (eid: number, item: Item, quantity: number, score: number = 0) {
        this.addComponent(eid, C_HIT_FILTER);
        C_HIT_REWARD.item[eid] = item.id;
        C_HIT_REWARD.quantity[eid] = quantity;
        C_HIT_REWARD.score[eid] = score;
    }

    defCanEquip (eid: number) {
        this.addComponent(eid, C_EQUIP);
    }

    defEffectedByCampFire (eid: number) {
        this.addComponent(eid, C_EFFECTED_BY_CAMPFIRE);
    }

    defEffectedByWorkbench (eid: number) {
        this.addComponent(eid, C_EFFECTED_BY_WORKBENCH);
    }

    defEffectedByWater (eid: number) {
        this.addComponent(eid, C_EFFECTED_BY_WATER);
    }

    defStats (eid: number, cold: number = 100, hunger: number = 100) {
        this.addComponent(eid, C_Stats);
        C_Stats.cold[eid] = cold;
        C_Stats.hunger[eid] = hunger;
    }

    defScore (eid: number) {
        this.addComponent(eid, C_SCORE);
        C_SCORE.score[eid] = 0;
    }

    defMobAI (eid: number) {
        this.addComponent(eid, C_MOB_AI);
    }

    defAttackTimer (eid: number) {
        this.addComponent(eid, C_ATTACK_TIMER);
    }

    getScoreEntities () {
        return Q_LEADERBOARD(this.bitecs);
    }

    getScore (eid: number) {
        return Math.max(0, C_SCORE.score[eid]);
    }

    createEntity (type: number): number {
        const eid = addEntity(this.bitecs);
        this.addComponent(eid, C_ENTITY);
        C_ENTITY.type[eid] = type;
        C_ENTITY.destroyed[eid] = +false;
        return eid;
    }

    createTree (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.TREE);
        const controller = new ResourcePhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        this.defBobAniamtion(eid);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.STICKS], 10, 5);
        this.defHitLevel(
            eid,
            ITEM_CATEGORY.PICK | ITEM_CATEGORY.FIST,
            ITEM_LEVEL.FIST
        );
        return eid;
    }

    createBerry (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.BERRY);
        const controller = new BushPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        this.defBobAniamtion(eid);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.APPLE], 10, 5);
        return eid;
    }

    createWolf (x: number, y: number): number {
        const eid = this.createEntity(ENTITY.WOLF);
        const controller = new WolfPhysicsController(eid, null);
        this.addController(controller);
        this.defHealth(eid, 100, 100);
        this.defMobAI(eid);
        this.defAttackTimer(eid);
        this.defNetworked(eid, true, true, true);
        controller.setPosition(x, y);
        return eid;
    }

    createPlayer (cid: number, x: number, y: number): number {
        const eid = this.createEntity(ENTITY.PLAYER);

        if (cid !== CID_NULL) {
            this.addComponent(eid, C_CLIENT);
            C_CLIENT.cid[eid] = cid;
        }

        this.addComponent(eid, C_Controller);

        const controller = new PlayerPhysicsController(
            eid,
            cid !== CID_NULL ? this.world.server.clients.getClient(cid) : null
        );

        this.addController(controller);

        const inventory = new ServerInventory(
            10,
            cid !== CID_NULL ? this.world.server.clients.getClient(cid) : null
        );

        this.addInventory(inventory, eid);
        this.defOwnedEntities(eid);
        this.defHealth(eid, 100, 100);
        this.defCanEquip(eid);
        this.defEffectedByCampFire(eid);
        this.defEffectedByWorkbench(eid);
        this.defEffectedByWater(eid);
        this.defStats(eid, 100, 100);
        this.defScore(eid);
        this.defAttackTimer(eid);
        this.defNetworked(eid, true, true, true);
        controller.setPosition(x, y);
        return eid;
    }

    createFire (x: number, y: number, rotation: number, ownerEid: number) {
        const eid = this.createEntity(ENTITY.FIRE);
        const controller = new FirePhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defHealth(eid, 100, 100);
        this.defLifeDuration(eid, Server.TICK_RATE * 60 * 2);
        this.defNetworked(eid, true, false, true);
        this.defOwner(eid, ownerEid);
        this.defBobAniamtion(eid);
        return eid;
    }

    createWall (x: number, y: number, rotation: number, ownerEid: number) {
        const eid = this.createEntity(ENTITY.WALL);
        const controller = new WallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        this.defOwner(eid, ownerEid);
        C_ENTITY.angle[eid] = rotation;
        this.defHealth(eid, 1000, 1000);
        this.defBobAniamtion(eid);
        this.defNetworked(eid, true, false, true);
        return eid;
    }

    createLake (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.LAKE);
        const controller = new LakePhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        return eid;
    }

    createAmythest (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.AMYTHEST);
        const controller = new WallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.AMYTHYST], 1, 1);
        this.defHitLevel(eid, ITEM_CATEGORY.PICK, ITEM_LEVEL.DIAMOND);
        this.defBobAniamtion(eid);
        return eid;
    }

    createDiamond (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.DIAMOND);
        const controller = new WallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.DIAMOND], 1, 1);
        this.defHitLevel(eid, ITEM_CATEGORY.PICK, ITEM_LEVEL.GOLD);
        this.defBobAniamtion(eid);
        return eid;
    }

    createCaveStone (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.CAVE_STONE);
        const controller = new CaveWallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        return eid;
    }

    createEmerald (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.EMERALD);
        const controller = new WallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.EMERALD], 1, 5);
        this.defBobAniamtion(eid);
        return eid;
    }

    createRock (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.ROCK);
        const controller = new WallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.STONE_SHARD], 1, 5);
        this.defHitLevel(eid, ITEM_CATEGORY.PICK, ITEM_LEVEL.FIST);
        this.defBobAniamtion(eid);
        return eid;
    }

    createGold (x: number, y: number, rotation: number) {
        const eid = this.createEntity(ENTITY.GOLD);
        const controller = new WallPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defNetworked(eid, true, false, true);
        this.defHitreward(eid, ITEMS[ITEM.GOLD], 1);
        this.defHitLevel(eid, ITEM_CATEGORY.PICK, ITEM_LEVEL.STONE);
        this.defBobAniamtion(eid);
        return eid;
    }

    createItem (x: number, y: number, item: Item, quantity: number) {
        if (item.id === ITEM.NONE || quantity === 0) return;
        const eid = this.createEntity(ENTITY.ITEM);
        const controller = new ItemPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = 0;
        this.defItem(eid, item, quantity, Server.TICK_RATE * 2);
        this.defNetworked(eid, true, false, true);
        return eid;
    }

    createWorkbench (x: number, y: number, rotation: number, ownerEid: number) {
        const eid = this.createEntity(ENTITY.WORKBENCH);
        const controller = new WorkbenchPhysicsController(eid, null);
        this.addController(controller);
        controller.setPosition(x, y);
        C_ENTITY.angle[eid] = rotation;
        this.defOwner(eid, ownerEid);
        this.defHealth(eid, 100, 100);
        this.defBobAniamtion(eid);
        this.defNetworked(eid, true, false, true);
        return eid;
    }

    destroy (eid: number) {
        if (this.world.isUpdating()) {
            this.world.removeQueueAdd(eid);
            C_ENTITY.destroyed[eid] = +true;
            return;
        }

        if (this.world.server) this.world.server.onEntityRemoved(eid);

        if (this.hasComponent(eid, C_PHYS_CONTROLLER)) {
            const controller = this.bodies[C_PHYS_CONTROLLER.ptr[eid]];
            this.removeController(controller);
        }

        if (this.hasComponent(eid, C_INVENTORY)) {
            const inventory = this.inventories[C_INVENTORY.ptr[eid]];
            this.removeInventory(eid);
        }

        if (this.hasComponent(eid, C_OWNED)) {
            const owner = C_OWNED.ownerEid[eid];
            this.ownedEntities.get(owner).delete(eid);
        }

        if (this.hasComponent(eid, C_OWNS)) {
            const children = this.ownedEntities.get(eid);

            for (let owned of children) {
                this.removeComponent(owned, C_OWNED);
                this.destroy(owned);
            }

            this.ownedEntities.delete(eid);
        }

        removeEntity(this.bitecs, eid);
    }

    getInventory (eid: number) {
        if (!this.hasComponent(eid, C_INVENTORY)) return null;
        return this.inventories[C_INVENTORY.ptr[eid]];
    }

    getController (eid: number): PhysicsBodyController {
        return this.bodies[C_PHYS_CONTROLLER.ptr[eid]];
    }

    hasInventory (eid: number) {
        return this.hasComponent(eid, C_INVENTORY);
    }

    hasClient (eid: number) {
        return this.hasComponent(eid, C_CLIENT);
    }

    getClient (eid: number) {
        if (!this.hasClient(eid)) return null;
        return this.world.server.clients.getClient(C_CLIENT.cid[eid]);
    }

    equipItem (eid: number, item: Item, force: boolean = false): boolean {
        if (eid === ECS_NULL) return false;
        if (!this.hasComponent(eid, C_EQUIP)) return false;
        if (C_EQUIP.cooldown[eid] > 0 && !force) return false;
        if (item.id !== ITEM.NONE && !item.equipable) return false;

        // if player equip item he already holding, swap to hand
        if (C_EQUIP.itemId[eid] === item.id && item.id !== ITEM.NONE) {
            this.equipItem(eid, ITEMS[ITEM.NONE], true);
            return;
        }

        C_EQUIP.itemId[eid] = item.id;
        this.world.server.onEntitySwapItem(eid, item);

        if (item.swapCooldown) {
            C_EQUIP.cooldown[eid] = Math.max(
                item.swapCooldown,
                C_EQUIP.cooldown[eid]
            );
            if (this.hasComponent(eid, C_CLIENT)) {
                const client = this.getClient(eid);
                if (client) {
                    client.protocol.writeEquipCooldown(item);
                }
            }
        }
    }

    removeItem (eid: number, item: Item, quantity: number) {
        if (!this.hasInventory(eid)) return;
        const inventory = this.getInventory(eid);
        if (inventory.hasQuantity(item.id, quantity)) {
            inventory.removeItem(item, quantity);

            {
                const controller = this.getController(eid);
                if (controller) {
                    const position = controller.getPosition();
                    const angle = C_ENTITY.angle[eid];
                    const offx = Math.cos(angle) * toMeters(100);
                    const offy = Math.sin(angle) * toMeters(100);
                    this.createItem(
                        position.x + offx,
                        position.y + offy,
                        item,
                        quantity
                    );
                }
            }

            if (
                this.hasComponent(eid, C_EQUIP) &&
                !inventory.hasItem(item) &&
                C_EQUIP.itemId[eid] === item.id
            ) {
                this.equipItem(eid, ITEMS[ITEM.NONE], true);
            }
        }
    }

    // dies an entity
    die (eid: number) {
        if (this.hasInventory(eid)) {
            const inventory = this.getInventory(eid);

            const controller = this.getController(eid);
            if (controller) {
                const pos = controller.getPosition();

                for (let i = 0; i < inventory.items.length; i++) {
                    const item = inventory.items[i];
                    if (item.quantity > 0 && item.item.id !== ITEM.NONE) {
                        const angle = Math.random() * Math.PI * 2;
                        const offx =
                            pos.x +
                            toMeters(Math.cos(angle) + Math.random() * 120);
                        const offy =
                            pos.y +
                            toMeters(Math.sin(angle) + Math.random() * 120);
                        this.createItem(
                            offx,
                            offy,
                            ITEMS[item.item.id],
                            item.quantity
                        );
                    }
                }
            }
        }

        this.world.server.onEntityRemoved(eid);
        this.destroy(eid);
    }

    hasState (eid: number, state: number) {
        return (C_ENTITY.info[eid] & state) !== 0;
    }

    damage (eid: number, damage: number, sourceEntity: number) {
        if (this.hasComponent(eid, C_Health)) {
            C_Health.value[eid] = Math.max(0, C_Health.value[eid] - damage);
            if (C_Health.value[eid] === 0) {
                // die
                this.die(eid);
                return;
            } else {
                this.world.server.onHit(eid);
            }
        }

        if (sourceEntity !== ECS_NULL && this.hasComponent(eid, C_HIT_REWARD)) {
            if (this.hasComponent(sourceEntity, C_SCORE)) {
                C_SCORE.score[sourceEntity] += C_HIT_REWARD.score[eid];
            }

            if (this.hasComponent(sourceEntity, C_INVENTORY)) {
                const item = ITEMS[C_HIT_REWARD.item[eid]];
                const quantity = C_HIT_REWARD.quantity[eid];
                const inventory =
                    this.inventories[C_INVENTORY.ptr[sourceEntity]];
                inventory.addItem(item, quantity);
            }
        }

        if (this.hasComponent(eid, C_BobAnimation)) {
            const sourceController = this.getController(sourceEntity);
            const entityController = this.getController(eid);
            if (sourceController && entityController) {
                const srcPos = entityController.getPosition();
                const currentPosition = sourceController.getPosition();
                const angle = Math.atan2(
                    srcPos.y - currentPosition.y,
                    srcPos.x - currentPosition.x
                );
                this.world.server.onObjectBobAnimation(eid, angle);
            }
        }
    }
}
