import { WebSocket } from 'uWebSockets.js';
import { Item, ITEM, ITEMS, numIsValidItem } from '../shared/Item';
import Protocol from './Protocol';
import Server from './server';
import { toMeters, toPixels } from '../shared/config';
import {
    C_ATTACK_TIMER,
    C_Controller,
    C_ENTITY,
    C_Health,
    C_NETWORK,
    C_Stats,
} from './ecs';
import GameApi from './api';
import { ECS_NULL } from './Constants';

const DIRECTION = {
    NONE: 0,
    UP: 1,
    LEFT: 2,
    RIGHT: 4,
    DOWN: 8,
};

export class ClientManager {
    clients: Client[] = [];
    private _$clientIndexMap: Map<number, number> = new Map();
    private _$clientIdPool: number[] = [];
    private _$clientIdCtr = 1;
    server: Server;

    constructor (server: Server) {
        this.server = server;
    }

    update (delta: number) {
        for (let i = 0; i < this.clients.length; i++) {
            const client = this.clients[i];
            client.update(delta);
        }
    }

    sync () {
        for (let i = 0; i < this.clients.length; i++) {
            const client = this.clients[i];
            client.sync();
        }
    }

    nextCid (): number {
        let cid = (
            this._$clientIdPool.length != 0
                ? this._$clientIdPool.pop()
                : this._$clientIdCtr++
        ) as number;
        return cid;
    }

    disposeCid (cid: number) {
        this._$clientIdPool.push(cid);
    }

    canAddClient () {
        return true;
    }

    addClient (ws: WebSocket) {
        const cid = this.nextCid();
        const client = new Client(this.server, ws, cid);
        (ws as any).client = client;

        this._$clientIndexMap.set(cid, this.clients.length);
        this.clients.push(client);
        client.onReady();
    }

    removeClient (client: Client) {
        client.onDisconnect();

        const cid = client.getCID();
        const idx = this._$clientIndexMap.get(cid) as number;

        if (idx !== this.clients.length) {
            // do a swap and pop
            const tmp = this.clients[this.clients.length - 1];
            this.clients[this.clients.length - 1] = client;
            this.clients[idx] = tmp;
            this._$clientIndexMap.set(tmp.getCID(), idx);
        }

        this.clients.pop();
        this.disposeCid(cid);
    }

    getClient (cid: number) {
        return this.clients[this._$clientIndexMap.get(cid)];
    }
}

export class Client {
    protocol: Protocol;
    private cid: number;
    server: Server;
    private eid: number = ECS_NULL;
    private spectateEid: number = ECS_NULL;
    visibleEntities: Set<number> = new Set();
    private name = '';
    ready = false;
    private token: string | null = null;
    private mouse = {
        held: false,
        angle: 0,
    };
    private wrongToolFlag = false;
    private lastDepth = 0;
    private _lastInfo = 0;

    setWrongToolFlag () {
        this.wrongToolFlag = true;
    }
    unsetWrongToolFlag () {
        this.wrongToolFlag = false;
    }
    getCID () {
        return this.cid;
    }
    setCID (cid: number) {
        this.cid = cid;
    }
    getEID () {
        return this.eid;
    }
    setEID (eid: number) {
        this.eid = eid;
    }
    getSpectateEID () {
        return this.spectateEid;
    }
    setSpectateEID (eid: number) {

        if(eid !== ECS_NULL) {
            this.protocol.writeSpectate(eid);
        }

        this.spectateEid = eid;
    }
    hasEntity () {
        return this.eid !== ECS_NULL;
    }
    inGame () {
        return this.eid !== ECS_NULL;
    }
    setName (name: string) {
        this.name = name;
    }
    getName () {
        return this.name;
    }
    getToken () {
        return this.token;
    }
    setToken (token: string | null) {
        this.token = token;
    }

    constructor (server: Server, ws: WebSocket, cid: number) {
        this.protocol = new Protocol(this, ws);
        this.cid = cid;
        this.server = server;
    }

    destroyEntity () {
        if (this.eid !== ECS_NULL) {
            this.server.world.entities.destroy(this.eid);
            this.eid = ECS_NULL;
            this.visibleEntities.clear();
        }
    }

    onDisconnect () {
        this.destroyEntity();
    }

    processPacket (m) {
        this.protocol.processMessage(m);
    }

    onReady () {
        this.ready = true;
        this.protocol.writeIntroduce(null);
    }

    onRequestRespawn (name: string, token: string | null) {
        if (name == '') name = 'player' + this.cid;
        this.name = name;
        this.respawn();

        if (token) {
            GameApi.checkToken(token).then(token => {
                this.setToken(token);
            });
        } else {
            this.setToken(null);
        }
    }

    onSpawned () {
        this.server.onClientReady(this);
    }

    onChat (message: string) {
        if (!this.hasEntity()) return;
        if (this.server.commandManager.isCommand(message)) {
            this.server.commandManager.processCommand(message, this);
            return;
        }
        this.server.chat(this.eid, message);
    }

    onCraft (itemId) {
        if (!this.hasEntity()) return;
        const item = ITEMS[itemId];
        if (!item) return;

        const inventory = this.server.world.entities.getInventory(this.eid);
        if (!inventory) return;

        const quantity = 1;
        if (inventory.canCraft(item, quantity)) {
            inventory.craft(item, quantity);
        }
    }

    onMouseChange (held: boolean, angle: number) {
        if (!this.hasEntity()) return;
        this.mouse.held = held;
        this.mouse.angle = angle;
    }

    onMobileInput (cHeld: boolean, aHeld: boolean, cRot: number, aRot: number) {
        if (this.hasEntity()) {
            C_Controller.active[this.eid] = +cHeld;

            if (cHeld) {
                C_Controller.dirX[this.eid] = Math.cos(cRot);
                C_Controller.dirY[this.eid] = Math.sin(cRot);
            } else {
                C_Controller.dirX[this.eid] = 0;
                C_Controller.dirY[this.eid] = 0;
            }
            C_Controller.rotation[this.eid] = aRot;
        }
    }

    onKeyState (keyState: number, mouseRot: number) {
        if (this.hasEntity()) {
            let velX = 0;
            let velY = 0;
            if (keyState & DIRECTION.UP) velY -= 1;
            if (keyState & DIRECTION.DOWN) velY += 1;
            if (keyState & DIRECTION.LEFT) velX -= 1;
            if (keyState & DIRECTION.RIGHT) velX += 1;
            let magSqrd = velX * velX + velY * velY;
            let invMag = magSqrd !== 0 ? 1 / Math.sqrt(magSqrd) : 1;
            velX *= invMag;
            velY *= invMag;

            C_Controller.dirX[this.eid] = velX;
            C_Controller.dirY[this.eid] = velY;
            C_Controller.rotation[this.eid] = mouseRot;
            C_Controller.active[this.eid] = +(keyState !== 0);
        }
    }

    onRequestEquipItem (itemId: number) {
        if (this.eid === ECS_NULL) return;
        if (!this.server.world.entities.hasInventory(this.eid)) return;
        if (!numIsValidItem(itemId)) return;

        const item = ITEMS[itemId];
        const inventory = this.server.world.entities.getInventory(this.eid);
        if (!inventory.hasItem(item)) return;

        if (item.consumable) {
            this.server.world.entities.consume(this.eid, item);
        } else {
            this.server.world.entities.equipItem(this.eid, item);
        }
    }

    onPlace (itemId: number, angle: number) {
        if (this.eid === ECS_NULL) return;
        if (!this.server.world.entities.hasInventory(this.eid)) return;
        if (!numIsValidItem(itemId)) return;

        const item = ITEMS[itemId];
        const inventory = this.server.world.entities.getInventory(this.eid);
        if (!inventory.hasItem(item)) return;

        C_ENTITY.angle[this.eid] = angle;
        if (this.server.world.entities.placeEntity(this.eid, item)) {
            this.protocol.writePlacedStructure();
        }
    }

    addItem (item: Item, quantity: number) {
        if (this.eid === ECS_NULL) return;
        if (!this.server.world.entities.hasInventory(this.eid)) return;
        const inventory = this.server.world.entities.getInventory(this.eid);
        inventory.addItem(item, quantity);
    }

    respawn () {
        if (this.eid !== ECS_NULL) return; // we cant respawn if an entity already exists

        const spawnPoint = this.server.world.getSpawn();
        this.eid = this.server.world.entities.createPlayer(
            this.cid,
            spawnPoint.x,
            spawnPoint.y
        );

        this.setSpectateEID(this.getEID());

        this.protocol.writeRespawn(this.eid, this.cid);

        if (this.server.world.entities.hasInventory(this.eid)) {
            const inventory = this.server.world.entities.getInventory(this.eid);
            this.protocol.writeInventory(inventory);
        }

        this.addItem(ITEMS[ITEM.STONE_SWORD], 1);
        //this.addItem(ITEMS[ITEM.WOOD_WALL], 30);
        //this.addItem(ITEMS[ITEM.WORK_BENCH], 1);
        this.addItem(ITEMS[ITEM.TORCH], 1);
        //this.addItem(ITEMS[ITEM.APPLE], 25);
        this.addItem(ITEMS[ITEM.FIRE], 5);
        //this.addItem(ITEMS[ITEM.GOLD_PICK], 10);
        //this.addItem(ITEMS[ITEM.STONE_PICK], 10);
        //this.addItem(ITEMS[ITEM.WOOD_PICK], 10);
        //this.addItem(ITEMS[ITEM.DIAMOND_PICK], 10);
        //this.addItem(ITEMS[ITEM.AMY_PICK], 10);

        //this.addItem(ITEMS[ITEM.GOLD_SWORD], 5)
        //this.addItem(ITEMS[ITEM.DIAMOND_SWORD], 5)
        //this.addItem(ITEMS[ITEM.AMYTHYST_SWORD], 5)

        this.onSpawned();
    }

    update (delta: number) {
        if (this.eid === ECS_NULL) return;

        if (this.mouse.held) {
            C_Controller.mouseDown[this.eid] = +true;
            //C_ATTACK_TIMER.active[this.eid] = +true;
        } else {
            C_Controller.mouseDown[this.eid] = +false;
        }
    }

    dropItem (itemId: number, quantity: number) {
        if (this.eid === ECS_NULL) return;
        if (!numIsValidItem(itemId)) return;

        const item = ITEMS[itemId];
        this.server.world.entities.removeItem(this.eid, item, quantity);
    }

    onSpectatingEntityRemoved () {
        if (this.eid !== ECS_NULL && this.eid === this.spectateEid) {
            this.protocol.writeRemoveEntity(this.eid);
            this.onDied();
        }

        this.setSpectateEID(ECS_NULL);
    }

    private onDied () {
        if (this.getToken() && this.hasEntity()) {
            // has a token, so tell server to update the score of the player
            GameApi.updateAccount(
                this.getToken(),
                this.server.world.entities.getScore(this.getEID())
            );
        }

        this.protocol.writeDied();
        this.setEID(ECS_NULL);
    }

    sync () {
        if (this.eid !== ECS_NULL) {
            if (this.wrongToolFlag) {
                this.unsetWrongToolFlag();
                this.protocol.writeWrongTool();
            }

            this.protocol.writeStats(
                C_Health.value[this.eid],
                C_Stats.hunger[this.eid],
                C_Stats.cold[this.eid]
            );
        }

        if (this.getSpectateEID() !== ECS_NULL) {
            console.log('got spectate eid!', this.eid, this.getSpectateEID());
            const spectateEid = this.getSpectateEID();

            if (C_ENTITY.depth[spectateEid] !== this.lastDepth) {
                this.lastDepth = C_ENTITY.depth[spectateEid];
                this.protocol.writeDepth(C_ENTITY.depth[spectateEid]);
            }

            const controller =
                this.server.world.entities.getController(spectateEid);

            for (let eid of this.visibleEntities) {
                if (!controller.visibleEntities.has(eid)) {
                    this.visibleEntities.delete(eid);
                    if (C_NETWORK.remove[eid])
                        this.protocol.writeRemoveEntity(eid);
                }
            }

            for (let eid of controller.visibleEntities) {
                if (!this.visibleEntities.has(eid)) {
                    this.visibleEntities.add(eid);
                    if (C_NETWORK.add[eid]) this.protocol.writeAddEntity(eid);
                } else {
                    if (C_NETWORK.update[eid])
                        this.protocol.writeUpdateEntity(eid);
                }
            }
        } else {
            // try find a player to spectate
            const spectateEid = this.server.getSpectateEid();
            if (spectateEid !== ECS_NULL) {
                this.setSpectateEID(spectateEid);
            }
        }

        this.protocol.flush();
    }
}
