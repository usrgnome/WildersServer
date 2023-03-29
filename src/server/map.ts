import World from './world';
import map from '../map.json';
import { toMeters } from '../shared/config';

export default class GameMap {
    tilesX = map.width;
    tilesY = map.height;
    tiles: Uint16Array = new Uint16Array(this.tilesX * this.tilesY);
    tilesAsU8 = new Uint8Array(this.tiles.buffer);
    caveTiles: Uint16Array = new Uint16Array(this.tilesX * this.tilesY);
    caveTilesAsU8 = new Uint8Array(this.caveTiles.buffer);
    tileSize = 128;

    parseMap (world: World) {
        for (let i = 0; i < map.layers.length; i++) {
            const layer = map.layers[i];
            const objects = layer.objects;
            if (objects) {
                for (let s = 0; s < objects.length; s++) {
                    const object = objects[s];
                    switch (object.name) {
                        case 'rock':
                            world.entities.createRock(
                                toMeters(object.x),
                                toMeters(object.y),
                                Math.random() * Math.PI * 2
                            );
                            break;
                        case 'tree':
                            world.entities.createTree(
                                toMeters(object.x),
                                toMeters(object.y),
                                Math.random() * Math.PI * 2
                            );
                            break;
                        case 'spawn':
                            world.spawnPoints.push({
                                x: toMeters(object.x),
                                y: toMeters(object.y),
                            });
                            break;
                        case 'amethyst':
                            world.entities.createAmythest(
                                toMeters(object.x),
                                toMeters(object.y),
                                Math.random() * Math.PI * 2
                            );
                            break;
                        case 'diamond':
                            world.entities.createDiamond(
                                toMeters(object.x),
                                toMeters(object.y),
                                Math.random() * Math.PI * 2
                            );
                            break;
                        case 'emerald':
                            //world.createEmerald(toMeters(object.x), toMeters(object.y), Math.random() * Math.PI * 2);
                            break;
                        case 'gold':
                            world.entities.createGold(
                                toMeters(object.x),
                                toMeters(object.y),
                                Math.random() * Math.PI * 2
                            );
                            break;
                        case 'lake':
                            world.entities.createLake(
                                toMeters(object.x),
                                toMeters(object.y),
                                Math.random() * Math.PI * 2
                            );
                            break;
                        default:
                            throw 'unknown object type: ' + object.name;
                    }
                }
            }
        }

        const layer0 = map.layers[0];
        if (layer0) {
            const data = layer0.data;
            for (let i = 0; i < data.length; i++) {
                this.tiles[i] = data[i];
            }
        }

        const layer1 = map.layers[1];
        if (layer1) {
            const data = layer1.data;
            if (data) {
                for (let i = 0; i < data.length; i++) {
                    const tile = data[i];
                    this.caveTiles[i] = tile;
                    if (tile) {
                        //const x = toMeters((i % world.tilesX) * world.tileSize);
                        //const y = toMeters(Math.floor(i / world.tilesX) * world.tileSize);
                        //world.createCaveStone(x, y, 0);
                    }
                }
            }
        }

        //b2BodyDef groundBodyDef;
        //groundBodyDef.position.Set(0.0f, -10.0f);
        /*

    b2PolygonShape groundBox;
    groundBox.SetAsBox(50.0f, 10.0f);

    */

        let dirs = [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
        ];

        let toRemove: number[] = [];

        for (let i = 0; i < this.caveTiles.length; i++) {
            const tile = this.caveTiles[i];
            let surrounded = true;
            if (tile) {
                let x = i % this.tilesX;
                let y = Math.floor(i / this.tilesX);

                for (let u = 0; u < dirs.length; u++) {
                    const dir = dirs[u];
                    let _x = x + dir[0];
                    let _y = y + dir[1];

                    if (
                        _x >= 0 &&
                        _x < this.tilesX &&
                        _y >= 0 &&
                        _y < this.tilesY
                    ) {
                        const i = _x + _y * this.tilesX;
                        if (!this.caveTiles[i]) {
                            surrounded = false;
                            break;
                        }
                    }
                }

                if (!surrounded) {
                    toRemove.push(i);
                    let _x = toMeters(x * 128);
                    let _y = toMeters(y * 128);
                    let w = toMeters(128 * 0.5);
                    let h = toMeters(128 * 0.5);

                    world.entities.createCaveStone(_x + w, _y + h, 0);

                    /*
                let groundBodyDef: b2BodyDef = {
                    type: b2BodyType.b2_staticBody,
                    position: new b2Vec2(_x + w, _y + w)
                }
                let groundBox = new b2PolygonShape();
                groundBox.SetAsBox(w, h);

                let groundBody = world.b2world.CreateBody(groundBodyDef);

                groundBody.CreateFixture({
                    shape: groundBox,
                    filter: {
                        categoryBits: COLLISION_MASK.ENVRIONMENT,
                        maskBits: COLLISION_MASK.ALIVE,
                    }
                });*/
                }
            }
        }

        for (let i = 0; i < toRemove.length; i++) {
            this.caveTiles[toRemove[i]] = 0;
        }
    }
}
