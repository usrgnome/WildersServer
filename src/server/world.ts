import {
    Attack,
    EntityManager,
} from './entity';
import Server, { hrtNow } from './server';
import {
    b2AABB,
    b2CircleShape,
    b2Contact,
    b2ContactImpulse,
    b2ContactListener,
    b2Fixture,
    b2Rot,
    b2Shape,
    b2TestOverlap,
    b2Transform,
    b2Vec2,
    b2World,
} from '@box2d/core';
import { toMeters, toPixels } from '../shared/config';
import { ITEM, ITEMS} from '../shared/Item';
import { PhysicsBodyController } from './controllers/controller';
import { hashInt } from '../shared/Utilts';
import {
    C_EFFECTED_BY_CAMPFIRE,
    C_EFFECTED_BY_WATER,
    C_EFFECTED_BY_WORKBENCH,
    S_Heal,
    S_TickStats,
} from './ecs';
import GameMap from './map';
import { IFixtureUserData, SpawnPoint } from './types';
import { COLLISION_TAG, ECS_NULL } from './Constants';

export default class World {
    entities = new EntityManager(this);
    map = new GameMap();
    server: Server;
    b2world: b2World = b2World.Create(new b2Vec2(0, 0));
    private _$isUpdating = false;
    private _$toRemoveQueue: number[] = [];
    private _$toAddQueue: PhysicsBodyController[] = [];
    attacks: Attack[] = [];
    tick: number = 0;
    private isDay: boolean = true;
    secondsInDay = 60 * 4;
    dayTick = 0;
    spawnPoints: SpawnPoint[] = [];

    day() {
        return this.isDay;
    }

    night() {
        return !this.isDay;
    }

    isUpdating() {
        return this._$isUpdating;
    }

    addEntityControllertoQueue(controller: PhysicsBodyController) {
        this._$toAddQueue.push(controller);
    }

    removeQueueAdd(eid: number) {
        this._$toRemoveQueue.push(eid);
    }

    getSpawn() {
        const point = new b2Vec2();

        if (this.spawnPoints.length > 0) {
            const spawn =
                this.spawnPoints[
                    Math.floor(Math.random() * this.spawnPoints.length)
                ];
            point.x = spawn.x;
            point.y = spawn.y;
        } else {
            point.x = Math.random() * 1000;
            point.y = Math.random() * 1000;
        }

        return point;
    }

    constructor(server: Server = null) {
        this.map.parseMap(this);
        this.server = server;
        const that = this;

        this.b2world.SetContactListener(
            new (class extends b2ContactListener {
                PostSolve(
                    _contact: b2Contact<b2Shape, b2Shape>,
                    _impulse: b2ContactImpulse
                ): void {
                    let fixtureA = _contact.GetFixtureA();
                    let fixtureB = _contact.GetFixtureB();
                    let dataA = fixtureA.GetUserData() as IFixtureUserData;
                    let dataB = fixtureB.GetUserData() as IFixtureUserData;

                    if (dataA && dataB) {
                        if (
                            dataA.tag === COLLISION_TAG.ATTACK ||
                            dataB.tag === COLLISION_TAG.ATTACK
                        ) {
                        }

                        const colPair = hashInt(dataA.tag, dataB.tag);
                        switch (colPair) {
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.ITEM
                            ): {
                                //if (eid !== ECS_NULL) {
                                //if (hasComponent(that.ecsWorld, C_EFFECTED_BY_CAMPFIRE, eid)) {
                                //}
                                //}
                            }
                        }
                    }
                }

                BeginContact(_contact: b2Contact<b2Shape, b2Shape>): void {
                    let fixtureA = _contact.GetFixtureA();
                    let fixtureB = _contact.GetFixtureB();
                    let dataA = fixtureA.GetUserData() as IFixtureUserData;
                    let dataB = fixtureB.GetUserData() as IFixtureUserData;

                    if (dataA && dataB) {
                        const colPair = hashInt(dataA.tag, dataB.tag);
                        switch (colPair) {
                            case hashInt(
                                COLLISION_TAG.FIRE_WARMTH,
                                COLLISION_TAG.BODY
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.FIRE_WARMTH
                                        ? dataB.eid
                                        : dataA.eid;
                                if (eid !== ECS_NULL) {
                                    if (
                                        that.entities.hasComponent(
                                            eid,
                                            C_EFFECTED_BY_CAMPFIRE,
                                        )
                                    ) {
                                        C_EFFECTED_BY_CAMPFIRE.count[eid]++;
                                    }
                                }
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.WATER
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.WATER
                                        ? dataB.eid
                                        : dataA.eid;
                                if (eid !== ECS_NULL) {
                                    if (
                                        that.entities.hasComponent(
                                            eid,
                                            C_EFFECTED_BY_WATER
                                        )
                                    ) {
                                        C_EFFECTED_BY_WATER.count[eid]++;
                                    }
                                }
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.FIRE_BURN,
                                COLLISION_TAG.BODY
                            ):
                                {
                                }
                                break;
                            case hashInt(
                                COLLISION_TAG.WORKBENCH,
                                COLLISION_TAG.BODY
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.WORKBENCH
                                        ? dataB.eid
                                        : dataA.eid;
                                if (eid !== ECS_NULL) {
                                    if (
                                        that.entities.hasComponent(
                                            eid,
                                            C_EFFECTED_BY_WORKBENCH,
                                        )
                                    ) {
                                        C_EFFECTED_BY_WORKBENCH.count[eid]++;
                                    }
                                }
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.ATTACK,
                                COLLISION_TAG.BODY
                            ):
                                {
                                    const eid =
                                        dataA.tag === COLLISION_TAG.ATTACK
                                            ? dataB.eid
                                            : dataA.eid;
                                    const attack = <Attack>(
                                        (dataA.tag === COLLISION_TAG.ATTACK
                                            ? dataA.attack
                                            : dataB.attack)
                                    );
                                    attack.addEffected(eid);
                                }
                                break;
                            case hashInt(
                                COLLISION_TAG.VIEW,
                                COLLISION_TAG.ITEM
                            ):
                            case hashInt(
                                COLLISION_TAG.VIEW,
                                COLLISION_TAG.BODY
                            ):
                                const controller =
                                    dataA.tag === COLLISION_TAG.VIEW
                                        ? dataA.controller
                                        : dataB.controller;
                                const eid =
                                    dataA.tag === COLLISION_TAG.VIEW
                                        ? dataB.eid
                                        : dataA.eid;
                                controller.visibleEntities.add(eid);
                                break;
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.BODY
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.ATTACK,
                                COLLISION_TAG.ATTACK
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.ITEM
                            ): {
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.WATER,
                                COLLISION_TAG.ATTACK
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.WATER,
                                COLLISION_TAG.WATER
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.ITEM,
                                COLLISION_TAG.ATTACK
                            ):
                                break;
                            default:
                                throw (
                                    'unknown pair type: ' +
                                    dataA.tag +
                                    ', ' +
                                    dataB.tag
                                );
                                break;
                        }
                    }

                    super.BeginContact(_contact);
                }

                EndContact(_contact: b2Contact<b2Shape, b2Shape>): void {
                    let fixtureA = _contact.GetFixtureA();
                    let fixtureB = _contact.GetFixtureB();

                    let dataA = fixtureA.GetUserData() as IFixtureUserData;
                    let dataB = fixtureB.GetUserData() as IFixtureUserData;

                    if (dataA && dataB) {
                        const colPair = hashInt(dataA.tag, dataB.tag);
                        switch (colPair) {
                            case hashInt(
                                COLLISION_TAG.FIRE_WARMTH,
                                COLLISION_TAG.BODY
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.FIRE_WARMTH
                                        ? dataB.eid
                                        : dataA.eid;
                                if (eid !== ECS_NULL) {
                                    if (
                                        that.entities.hasComponent(
                                            eid,
                                            C_EFFECTED_BY_CAMPFIRE,
                                        )
                                    ) {
                                        C_EFFECTED_BY_CAMPFIRE.count[eid]--;
                                    }
                                }
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.WATER
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.WATER
                                        ? dataB.eid
                                        : dataA.eid;
                                if (eid !== ECS_NULL) {
                                    if (
                                        that.entities.hasComponent(
                                            eid,
                                            C_EFFECTED_BY_WATER,
                                        )
                                    ) {
                                        C_EFFECTED_BY_WATER.count[eid]--;
                                    }
                                }
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.ITEM
                            ): {
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.FIRE_BURN,
                                COLLISION_TAG.BODY
                            ):
                                {
                                }
                                break;
                            case hashInt(
                                COLLISION_TAG.WORKBENCH,
                                COLLISION_TAG.BODY
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.WORKBENCH
                                        ? dataB.eid
                                        : dataA.eid;
                                if (eid !== ECS_NULL) {
                                    if (
                                        that.entities.hasComponent(
                                            eid,
                                            C_EFFECTED_BY_WORKBENCH,
                                        )
                                    ) {
                                        C_EFFECTED_BY_WORKBENCH.count[eid]--;
                                    }
                                }
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.ATTACK,
                                COLLISION_TAG.BODY
                            ): {
                                const eid =
                                    dataA.tag === COLLISION_TAG.ATTACK
                                        ? dataB.eid
                                        : dataA.eid;
                                const attack = <Attack>(
                                    (dataA.tag === COLLISION_TAG.ATTACK
                                        ? dataA.attack
                                        : dataB.attack)
                                );
                                attack.removeEffected(eid);
                                break;
                            }
                            case hashInt(
                                COLLISION_TAG.VIEW,
                                COLLISION_TAG.ITEM
                            ):
                            case hashInt(
                                COLLISION_TAG.VIEW,
                                COLLISION_TAG.BODY
                            ):
                                const controller =
                                    dataA.tag === COLLISION_TAG.VIEW
                                        ? dataA.controller
                                        : dataB.controller;
                                const eid =
                                    dataA.tag === COLLISION_TAG.VIEW
                                        ? dataB.eid
                                        : dataA.eid;
                                controller.visibleEntities.delete(eid);
                                break;
                            case hashInt(
                                COLLISION_TAG.BODY,
                                COLLISION_TAG.BODY
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.ATTACK,
                                COLLISION_TAG.ATTACK
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.WATER,
                                COLLISION_TAG.ATTACK
                            ):
                                break;

                            case hashInt(
                                COLLISION_TAG.WATER,
                                COLLISION_TAG.WATER
                            ):
                                break;
                            case hashInt(
                                COLLISION_TAG.ITEM,
                                COLLISION_TAG.ATTACK
                            ):
                                break;
                            default:
                                throw (
                                    'unknown pair type: ' +
                                    dataA.tag +
                                    ', ' +
                                    dataB.tag
                                );
                                break;
                        }
                    }

                    super.EndContact(_contact);
                }
            })()
        );

        const worldSize = 100 * 128;
        for (let i = 0; i < 100; i++) {
            this.entities.createBerry(
                toMeters(Math.random() * worldSize),
                toMeters(Math.random() * worldSize),
                i % 2 === 0 ? Math.PI / 2 : 0
            );
            this.entities.createItem(
                toMeters(Math.random() * worldSize),
                toMeters(Math.random() * worldSize),
                ITEMS[ITEM.STONE_PICK],
                10
            );
        }

        for (let i = 0; i < 100; i++) {
            //this.createWall(toMeters(Math.random() * worldSize), toMeters(Math.random() * worldSize), i % 2 === 0 ? Math.PI / 2 : 0, CID_NULL);
        }

        for (let i = 0; i < 50; i++) {
            //this.createLake(toMeters(Math.random() * worldSize), toMeters(Math.random() * worldSize), i % 2 === 0 ? Math.PI / 2 : 0);
        }

        for (let i = 0; i < 100; i++) {
            //this.createFire(toMeters(Math.random() * worldSize), toMeters(Math.random() * worldSize), Math.random());
        }

        for (let i = 0; i < 100; i++) {
            //this.createAmythest(toMeters(Math.random() * worldSize), toMeters(Math.random() * worldSize), Math.random());
        }

        for (let i = 0; i < 100; i++) {
            // this.createPlayer(CID_NULL, toMeters(Math.random() * worldSize), toMeters(Math.random() * worldSize));
            // this.createWolf(toMeters(Math.random() * worldSize + 100), toMeters(Math.random() * worldSize + 100));
        }

        /* this.createTree(toMeters(500), toMeters(500), Math.random() * Math.PI * 2);
         this.createFire(toMeters(100), toMeters(500), Math.random() * Math.PI * 2);
         this.createWall(toMeters(0), toMeters(100), 0, CID_NULL);
         this.createLake(0, 0, 0);*/
    }

    addAttack(attack: Attack) {
        this.attacks.push(attack);
        attack.onAdded(this);
    }

    getTile(x: number, y: number) {
        const tileX = Math.floor(toPixels(x) / this.map.tileSize);
        const tileY = Math.floor(toPixels(y) / this.map.tileSize);
        if (
            tileX < 0 ||
            tileY < 0 ||
            tileX >= this.map.tilesX ||
            tileY >= this.map.tilesY
        )
            return 0;
        const tileIndex = tileX + tileY * this.map.tilesX;
        return this.map.tiles[tileIndex];
    }

    query(minx: number, miny: number, maxx: number, maxy: number) {
        const aabb = new b2AABB();
        aabb.lowerBound.x = minx;
        aabb.lowerBound.y = miny;
        aabb.upperBound.x = maxx;
        aabb.upperBound.y = maxy;
        let ret: b2Fixture[] = [];

        this.b2world.QueryAABB(aabb, fixture => {
            const data = fixture.GetUserData() as IFixtureUserData;
            ret.push(fixture);
            return true;
        });

        return ret;
    }

    isAreaEmpty(placeEid: number, shape: b2Shape, x: number, y: number) {
        // generate the transform for the location we will be querying
        const transform = new b2Transform();
        transform.SetPosition(new b2Vec2(x, y));
        transform.SetRotation(new b2Rot(0));

        // compute the AABB and location for the shape we will use to query
        const aabb = new b2AABB();
        shape.ComputeAABB(aabb, transform, 0);

        // get all fixtures inside this query
        const query = this.query(
            aabb.lowerBound.x,
            aabb.lowerBound.y,
            aabb.upperBound.x,
            aabb.upperBound.y
        );

        for (let i = 0; i < query.length; i++) {
            const fixture = query[i];

            // make sure shape is a 'BODY' tag, we dont wanna be blocked by sensors and other invisible fixtures
            const userdata = fixture.GetUserData() as IFixtureUserData;
            if (userdata) {
                if (userdata.tag !== COLLISION_TAG.BODY) continue;

                if (placeEid !== ECS_NULL) {
                    if (userdata.eid === placeEid) continue;
                }
            }

            const testShape = fixture.GetShape();
            const testTransform = fixture.GetBody().GetTransform();

            // check overlap
            if (
                b2TestOverlap(shape, 0, testShape, 0, transform, testTransform)
            ) {
                return false;
            }
        }

        return true;
    }

    checkAreaFree(x: number, y: number, radius: number) {
        const shape = new b2CircleShape(radius);
        let res = this.isAreaEmpty(ECS_NULL, shape, x, y);
        return res;
    }

    update(delta: number) {
        if (delta == 0) return;
        this._$isUpdating = true;

        const systemStart = hrtNow();
        this.entities.update(delta);
        const systemEnd = hrtNow();
        //console.log('systems took: ' + (systemEnd - systemStart));

        const tickStart = hrtNow();

        this.tick++;
        if (this.tick % (Server.TICK_RATE * 5) === 0) {
            S_TickStats(this, this.entities.bitecs, delta);
        }

        if (this.tick % (Server.TICK_RATE * 10) === 0) {
            S_Heal(this, this.entities.bitecs, delta);
        }

        if (this.tick % (Server.TICK_RATE * this.secondsInDay) === 0) {
            this.isDay = !this.isDay;
            this.server.changeTime(this.isDay);
        }
        const tickEnd = hrtNow();
        //console.log('ticks took: ' + (tickEnd - tickStart));

        for (let i = 0; i < this.attacks.length; i++)
            this.attacks[i].update(delta);

        const physStart = hrtNow();
        const dt = delta;
        const substeps = 1;
        const subdt = dt / substeps;

        for (let i = 0; i < substeps; i++) {
            this.b2world.Step(subdt, {
                positionIterations: 8,
                velocityIterations: 3,
            });

            // do your physics-related stuff inside here but leave any sprites manipulation outside this loop
        }
        const physEnd = hrtNow();
        //console.log('phys took: ' + (physEnd - physStart));

        this._$isUpdating = false;

        while (this._$toRemoveQueue.length != 0)
            this.entities.destroy(this._$toRemoveQueue.pop());

        while (this._$toAddQueue.length != 0)
            this.entities.addController(this._$toAddQueue.pop());

        for (let i = 0; i < this.attacks.length; ) {
            const attack = this.attacks[i];
            if (attack.finished) {
                this.attacks.splice(i, 1);
                attack.onRemoved(this);
            } else i++;
        }
    }
}
