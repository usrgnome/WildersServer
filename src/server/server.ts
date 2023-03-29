import { WebSocket } from 'uWebSockets.js';
import { toPixels } from '../shared/config';
import { Item } from '../shared/Item';
import GameApi, { ServerPayload } from './api';
import { ClientManager, Client } from './client';
import CommandManager from './command';
import { ECS_NULL } from './constants';
import { C_CLIENT, C_PHYS_CONTROLLER, C_SCORE } from './ecs';
import World from './world';

export const hrtNow = function () {
    let time = process.hrtime();
    return time[0] * 1000 + time[1] / 1000000;
};

export default class Server {

    static TICK_RATE = 15;
    static TICK_LENGTH_MS = 1000 / Server.TICK_RATE;
    static TICK_DELTA = Server.TICK_LENGTH_MS / 1000;

    world: World = new World(this);
    clients = new ClientManager(this);
    curerntTick = 0;
    commandManager = new CommandManager(this);
    previousTick = hrtNow();

    constructor() {
        this.tick();
        setInterval(() => {
            this.syncState();
        }, 5000)
    }

    tick() {
        const now = hrtNow();
        if (this.previousTick + Server.TICK_LENGTH_MS <= now) {
            var delta = (now - this.previousTick) / 1000;
            this.previousTick = now;
            this.update(delta);
        }

        if (hrtNow() - this.previousTick < Server.TICK_LENGTH_MS - 16) {
            setTimeout(() => this.tick());
        } else {
            setImmediate(() => this.tick());
        }
    }

    syncState() {
        const payload: ServerPayload = {
            region: process.env.REGION_NAME,
            subdomain: process.env.CF_SUB_DOMAIN,
            port: process.env.LISTEN_PORT,
            players: this.clients.clients.length,
            ssl: process.env.USE_SSL !== 'nil',
        }

        GameApi.sendServerInfo(payload);
    }

    update(delta: number) {
        delta = Server.TICK_DELTA;
        this.clients.update(delta);

        const start = hrtNow();
        this.world.update(delta);
        const end = hrtNow();

        this.curerntTick++;

        if (this.curerntTick % (Server.TICK_RATE * 1) === 0) {
            const lb = [];
            const ents = this.world.entities.getScoreEntities();

            ents.sort((a, b) => {
                return C_SCORE.score[b] - C_SCORE.score[a];
            })

            ents.length = Math.min(10, ents.length);

            for (let i = 0; i < ents.length; i++) {
                const eid = ents[i];
                const cid = C_CLIENT.cid[eid];
                const score = C_SCORE.score[eid];
                lb.push([cid, score]);
            }

            this.sendLb(lb);
        }

        this.clients.sync();
    }

    getSpectateEid() {
        let eids: number[] = [];
        for(let i = 0; i < this.clients.clients.length; i++) {
            const client = this.clients.clients[i];
            if(client.inGame()) {
                eids.push(client.getEID());
            }
        }

        if(eids.length === 0) return ECS_NULL;
        return eids[Math.floor(Math.random() * eids.length)];
    }

    sendAttack(eid: number, item: Item) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.inGame()) continue;
            if (!client.visibleEntities.has(eid)) continue;
            client.protocol.writeStartAttack(eid, item);
        }
    }

    sendLb(lb: any[]) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.ready) continue;
            client.protocol.writeLeaderboard(lb);
        }
    }

    getTimeMs(): number {
        let time = process.hrtime();
        return time[0] * 1000 + time[1] / 1000000;
    }

    canAddClient() {
        return this.clients.canAddClient();
    }

    addClient(ws: WebSocket) {
        this.clients.addClient(ws);
    }

    removeClient(client: Client) {
        this.clients.removeClient(client);
    }

    onEntityAdded(eid: number) { }

    onEntityRemoved(eid: number) {
        if (this.world.entities.hasClient(eid)) {
            const client = this.world.entities.getClient(eid);
            client.onSpectatingEntityRemoved();
        }

        const clients = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.ready) continue;

            if(client.getSpectateEID() === eid) {
                client.onSpectatingEntityRemoved();
            }
        }
    }

    onEntitySwapItem(eid: number, item: Item) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.ready) continue;
            if (client.visibleEntities.has(eid)) {
                client.protocol.writeSwapItem(eid, item.id);
            }
        }
    }

    onObjectBobAnimation(eid: number, angle: number) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.ready) continue;
            if (client.visibleEntities.has(eid)) {
                client.protocol.writeBobAnimation(eid, angle);
            }
        }
    }

    onHit(eid: number) {
        const controller = this.world.entities.bodies[C_PHYS_CONTROLLER.ptr[eid]]
        if (controller) {
            const position = controller.getPosition();
            const clients: Array<Client> = this.clients.clients;
            for (let i = 0; i < clients.length; i++) {
                const client = clients[i];
                if (!client.ready) continue;
                if (client.visibleEntities.has(eid)) {
                    client.protocol.writeHit(toPixels(position.x), toPixels(position.y));
                }
            }
        }

    }

    changeTime(isDay: boolean) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.ready) continue;
            client.protocol.writeChangeTime(isDay);
        }
    }

    chat(eid: number, message: string) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client.ready) continue;
            if (client.visibleEntities.has(eid)) {
                client.protocol.writeChat(eid, message);
            }
        }
    }

    onClientReady(newClient: Client) {
        const clients: Array<Client> = this.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            // dont need to introruce to himself, because this will be handled by the client.protocol.introduce();
            if (!client.ready) continue;
            client.protocol.writeAddClient(newClient);
        }
    }
}
