import { WebSocket } from 'uWebSockets.js';
import { Client } from './client';
import { bytes, hasMoreData, readF32, readFrom, readI32, readString, readU16, readU8, reset, size, skipPacket, StreamReader, StreamWriter, verify, verifyType, writeF32, writeI32, writeLEB128, writeString, writeU16, writeU8 } from '../shared/lib/StreamWriter';
import { CLIENT_HEADER, SERVER_HEADER } from '../shared/headers';
import { Inventory, Stack } from '../shared/inventory';
import { ENTITY } from '../shared/EntityTypes';
import { ITEM, Item, ITEMS } from '../shared/Item';
import { toPixels } from '../shared/config';
import { C_CLIENT, C_ENTITY, C_EQUIP, C_ITEM, C_PHYS_CONTROLLER } from './ecs';
import { deflateRaw } from 'pako';
import Server from './server';

export default class Protocol {
    socket: WebSocket;
    client: Client;
    outStream: StreamWriter = new StreamWriter();
    inStream: StreamReader = new StreamReader();

    constructor(client: Client, socket: WebSocket) {
        this.client = client;
        this.socket = socket;
    }

    flush() {
        if (size(this.outStream) > 0) {
            this.socket.send(bytes(this.outStream), true);
            reset(this.outStream);
        }
    }

    processMessage(m: ArrayBuffer) {
        const stream = this.inStream;
        readFrom(stream, m);
        while (hasMoreData(stream)) {
            const header = readU8(stream);
            switch (header) {
                case CLIENT_HEADER.REQUEST_RESPAWN_TOKEN:
                    this.readRequestRespawn(true);
                    break;
                case CLIENT_HEADER.REQUEST_RESPAWN:
                    this.readRequestRespawn(false);
                    break;
                case CLIENT_HEADER.INPUT:
                    this.readKeyState();
                    break;
                case CLIENT_HEADER.EQUIP:
                    this.readRequestEquipItem();
                    break;
                case CLIENT_HEADER.DROP_ITEM:
                    this.readDropItem();
                    break;
                case CLIENT_HEADER.MOUSE_DOWN:
                    this.readMouseDown();
                    break;
                case CLIENT_HEADER.MOUSE_UP:
                    this.readMouseUp();
                    break;
                case CLIENT_HEADER.CRAFT:
                    this.readCraft();
                    break;
                case CLIENT_HEADER.MOBILE_INPUT:
                    this.readMobileInput();
                    break;
                case CLIENT_HEADER.CHAT:
                    this.readChat();
                    break;
                case CLIENT_HEADER.PLACE:
                    this.readPlace();
                    break;
                default:
                    break;
            }
        }
    }

    writeIntroduce(gameInfo: null) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.INTRODUCE);
        writeU8(s, this.client.getCID());
        writeU8(s, Server.TICK_RATE);
        writeU8(s, +this.client.server.world.day());
        writeU16(s, this.client.server.world.secondsInDay);
        writeU16(s, this.client.server.world.dayTick);

        const world = this.client.server.world;
        writeU16(s, world.map.tilesX);
        writeU16(s, world.map.tilesY);
        writeU16(s, world.map.tileSize);

        // pack world tiles
        {
            let res = deflateRaw(world.map.tilesAsU8);
            writeU16(s, res.length);

            for (let i = 0; i < res.length; i++) {
                writeU16(s, res[i]);
            }
        }

        // pack cave tiles
        {
            let res = deflateRaw(world.map.caveTilesAsU8);
            writeU16(s, res.length);

            for (let i = 0; i < res.length; i++) {
                writeU16(s, res[i]);
            }
        }

        const clients = this.client.server.clients.clients;
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            this.writeAddClient(client);
        }
    }

    writeStartAttack(eid: number, item: Item) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.ACTION);
        writeLEB128(s, eid);
        writeU16(s, item.id);
    }

    writeLeaderboard(lb: [number, number][]) {
        const s = this.outStream;
        const len = lb.length;

        writeU8(s, SERVER_HEADER.LEADERBOARD);
        writeU16(s, len);
        for (let i = 0; i < len; i++) {
            const c = lb[i];
            writeU16(s, c[0]);
            writeI32(s, c[1]);
        }
    }

    writeSwapItem(eid: number, itemId: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.ENTITY_CHANGE_ITEM);
        writeLEB128(s, eid);
        writeU16(s, itemId);
    }

    writeHit(x: number, y: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.HIT);
        writeF32(s, x);
        writeF32(s, y);
    }

    writeBobAnimation(eid: number, angle: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.HIT_BOUNCE_EFFECT);
        writeLEB128(s, eid);
        writeF32(s, angle);
    }

    writeChangeTime(isDay: boolean) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.CHANGE_TIME);
        writeU8(s, +isDay);
    }

    writeEquipCooldown(item: Item) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.EQUIP_COOLDOWN);
        writeU16(s, item.id);
    }

    writeWrongTool() {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.WRONG_TOOL);
    }

    writeInventory(inventory: Inventory) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.INVENTORY);
        writeU8(s, inventory.size);

        for (let i = 0; i < inventory.size; i++) {
            writeU16(s, inventory.items[i].item.id);
            writeI32(s, inventory.items[i].quantity);
        }
    }

    writeChat(eid: number, message: string) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.CHAT);
        writeLEB128(s, eid);
        writeString(s, message);
    }

    writeAddItem(item: Item, quantity: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.ADD_ITEM);
        writeU16(s, item.id);
        writeI32(s, quantity);
    }

    writeRemoveItem(item: Item, quantity: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.REMOVE_ITEM);
        writeU16(s, item.id);
        writeI32(s, quantity);
    }

    writeSpectate(eid: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.SPECTATE);
        writeI32(s, eid);
    }

    writeRespawn(eid: number, cid: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.RESPAWN);
        writeI32(s, eid);
        writeI32(s, cid);
    }

    writeAddClient(client: Client) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.ADD_CLIENT);
        writeLEB128(s, client.getCID());
        writeString(s, client.getName());
    }

    writePlacedStructure() {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.PLACED_STRUCTURE);
    }

    writeAddEntity(eid: number) {
        const s = this.outStream;
        const controller = this.client.server.world.entities.bodies[C_PHYS_CONTROLLER.ptr[eid]];
        if (!controller) return;

        const type = C_ENTITY.type[eid];
        const angle = C_ENTITY.angle[eid];
        const info = C_ENTITY.info[eid];

        const position = controller.getPosition();
        writeU8(s, SERVER_HEADER.ADD_ENTITY);
        writeLEB128(s, eid);
        writeU8(s, type);
        writeU16(s, info);
        writeF32(s, toPixels(position.x));
        writeF32(s, toPixels(position.y));
        writeF32(s, angle);

        switch (type) {
            case ENTITY.PLAYER:
                writeU16(s, C_EQUIP.itemId[eid]);
                writeU16(s, C_CLIENT.cid[eid]);
                break;
            case ENTITY.ITEM:
                writeU16(s, C_ITEM.item[eid]);
                break;
        }
    }

    writeUpdateEntity(eid: number) {
        const s = this.outStream;
        const controller = this.client.server.world.entities.bodies[C_PHYS_CONTROLLER.ptr[eid]];
        if (!controller) return;


        const type = C_ENTITY.type[eid];
        const info = C_ENTITY.info[eid];
        const angle = C_ENTITY.angle[eid];

        const position = controller.getPosition();
        writeU8(s, SERVER_HEADER.UPDATE_ENTITY);
        writeLEB128(s, eid);
        writeU8(s, type);
        writeU16(s, info);
        writeF32(s, toPixels(position.x));
        writeF32(s, toPixels(position.y));
        writeF32(s, angle);
    }

    writeRemoveEntity(eid: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.REMOVE_ENTITY);
        writeLEB128(s, eid);
    }

    writeDied() {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.DIED);
    }

    writeStats(health: number, hunger: number, cold: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.STATS);
        writeU8(s, health);
        writeU8(s, hunger);
        writeU8(s, cold);
    }

    writeDepth(depth: number) {
        const s = this.outStream;
        writeU8(s, SERVER_HEADER.DEPTH);
        writeU8(s, depth);
    }

    private readPlace() {
        const s = this.inStream;
        const PLACE_STRUCT = [StreamReader.T_U16, StreamReader.T_F32];
        if (!verify(s, PLACE_STRUCT))
            return skipPacket(s);

        const itemId = readU16(s);
        const angle = readF32(s);
        this.client.onPlace(itemId, angle);
    }

    private readChat() {
        const s = this.inStream;
        const STRING_TYPE: verifyType = [StreamReader.T_STR, 30];
        const CHAT_STRUCT: verifyType[] = [STRING_TYPE]
        if (!verify(s, CHAT_STRUCT))
            return skipPacket(s);

        const message = readString(s);
        this.client.onChat(message);
    }

    private readMobileInput() {
        const s = this.inStream;
        const MOBILE_INPUT_STRUCT = [StreamReader.T_U8, StreamReader.T_U8, StreamReader.T_F32, StreamReader.T_F32];
        if (!verify(s, MOBILE_INPUT_STRUCT))
            return skipPacket(s);

        const cHeld = !!readU8(s);
        const aHeld = !!readU8(s);
        const cRot = readF32(s);
        const aRot = readF32(s);
        this.client.onMobileInput(cHeld, aHeld, cRot, aRot);
    }

    private readCraft() {
        const s = this.inStream;
        const CRAFT_STRUCT = [StreamReader.T_U16];
        if (!verify(s, CRAFT_STRUCT))
            return skipPacket(s);

        const itemId = readU16(s);
        this.client.onCraft(itemId);
    }

    private readMouseDown() {
        const s = this.inStream;
        const MOUSEDOWN_STRUCT = [StreamReader.T_F32];
        if (!verify(s, MOUSEDOWN_STRUCT))
            return skipPacket(s);

        const angle = readF32(s);
        this.client.onMouseChange(true, angle);
    }

    private readMouseUp() {
        const s = this.inStream;
        const MOUSEUP_STRUCT = [StreamReader.T_F32];
        if (!verify(s, MOUSEUP_STRUCT))
            return skipPacket(s);

        const angle = readF32(s);
        this.client.onMouseChange(false, angle);
    }

    private readDropItem() {
        const s = this.inStream;
        const DROP_STRUCT = [StreamReader.T_U16, StreamReader.T_U32];
        if (!verify(s, DROP_STRUCT))
            return skipPacket(s);

        const itemId = readU16(s);
        const quantity = readI32(s);

        this.client.dropItem(itemId, quantity);
    }

    private readRequestEquipItem() {
        const s = this.inStream;
        const EQUIP_STRUCT = [StreamReader.T_U16];
        if (!verify(s, EQUIP_STRUCT))
            return skipPacket(s);

        const itemId = readU16(s);
        this.client.onRequestEquipItem(itemId);
    }

    private readKeyState() {
        const s = this.inStream;
        const INPUT_STRUCT = [StreamReader.T_U8, StreamReader.T_F32];
        if (!verify(s, INPUT_STRUCT))
            return skipPacket(s);

        const keyState = readU8(s);
        const mouseRot = readF32(s);
        this.client.onKeyState(keyState, mouseRot);
    }

    private readRequestRespawn(useToken: boolean) {
        const s = this.inStream;

        let token: string | null = null;
        let name = "";
        if (useToken) {
            const STRING_TYPE: verifyType = [StreamReader.T_STR, 30];
            const TOKEN_TYPE: verifyType = [StreamReader.T_STR, 100];
            const RESPAWN_STRUCT: verifyType[] = [STRING_TYPE, TOKEN_TYPE];

            if (!verify(s, RESPAWN_STRUCT)) {
                return skipPacket(s);
            }

            name = readString(s);
            token = readString(s);

        } else {
            const STRING_TYPE: verifyType = [StreamReader.T_STR, 30];
            const RESPAWN_STRUCT: verifyType[] = [STRING_TYPE];
            if (!verify(s, RESPAWN_STRUCT)) {
                return skipPacket(s);
            }

            name = readString(s);
        }

        this.client.onRequestRespawn(name, token);
    }
}
