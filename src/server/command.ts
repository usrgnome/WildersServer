import { ITEM, ITEMS } from "../shared/Item";
import { Client } from "./client";
import Server from "./server";

export default class CommandManager {
	server: Server

	constructor(server: Server) {
		this.server = server;
	}

	isCommand(message: string) {
		return message.length && message[0] === "/";
	}

	processCommand(message: string, client: Client) {
		if (!this.isCommand(message)) return;
		const parts = message.slice(1).trim().split(' ')
		if (parts.length === 0) return;

		const command = parts[0];

		switch (command) {
			case 'die':
				this.onDie(client);
				break;
			case 'tp':
				this.onTp(client, parts.slice(1));
				break;
			case 'give':
				this.give(client, parts.slice(1))
				break;
		}
	}

	private onTp(client: Client, parts: string[]) {
		if (!client.hasEntity() || !client.inGame()) return;
		const target = parts[0];

		const controller = this.server.world.entities.getController(client.getEID());
		if (!controller) return;
		const position = controller.getPosition();

		if (target === "@p") {
			for (let i = 0; i < this.server.clients.clients.length; i++) {
				const sourceClient = this.server.clients.clients[i];
				if (sourceClient !== client) {
					if (sourceClient.hasEntity() && sourceClient.inGame()) {
						const sourceController = this.server.world.entities.getController(sourceClient.getEID())
						if (sourceController) {
							sourceController.setPosition(position.x, position.y);
						}
					}
				}
			}
		}
	}

	private onDie(client: Client) {
		if (client.hasEntity() && client.inGame()) {
			this.server.world.entities.die(client.getEID());
		}
	}

	private give(client: Client, parts: string[]) {
		if (client.hasEntity() && client.inGame()) {

			const inventory = this.server.world.entities.getInventory(client.getEID());

			if (inventory) {

				const item = ITEMS[parseInt(parts[0])];
				const quantity = Math.max(0, Math.min(999, parseInt(parts[1]) || 0));

				if (item && item.id !== ITEM.NONE && quantity > 0) {
					console.log(item, quantity, "WTF");
					inventory.addItem(item, quantity);
				}
			}
		}
	}
}