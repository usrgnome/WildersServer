import http from "http";
import https from "http";
import dotenv from "dotenv"
import { logger } from "./logger";

dotenv.config();

const API_HOST = process.env.API_HOST
const API_PORT = process.env.API_PORT
const API_SSL = process.env.API_SSL === "true" ? true : false;
const API_PASSWORD = process.env.API_PASSWORD;

if (!API_HOST) throw new Error("process.env.API_HOST not set!")
if (!API_PORT) throw new Error("process.env.PORT not set!")
if (!API_PASSWORD) throw new Error("process.env.API_PASSWORD not set!")

logger.info('> API_HOST: ' + API_HOST)
logger.info('> API_PORT: ' + API_PORT)
logger.info('> API_SSL: ' + API_SSL)
logger.info('> API_PASSWORD: ' + API_PASSWORD)

/*
{
	region: 'europe',
	subdomain: 'eu1',
	port: '8080'.
	players: 243,
	ssl: false,
}
*/

export interface ServerPayload {
	subdomain: string;
	region: string;
	port: string;
	players: number;
	ssl: boolean;
}

export default class GameApi {

	static checkToken(token: string): Promise<string | null> {
		return new Promise((resolve, reject) => {
			(API_SSL ? https : http).get({
				host: API_HOST,
				port: API_PORT,
				path: "/getServerToken",
				method: 'GET',
				headers: {
					'Authorization': `${token}`,
				},
			}, (resp) => {
				let data = '';

				// A chunk of data has been received.
				resp.on('data', (chunk) => {
					data += chunk;
				});

				// The whole response has been received. Print out the result.
				resp.on('end', () => {
					try {
						const json = JSON.parse(data);
						const { token } = json;
						resolve(token);
					} catch (e) {
						resolve(null)
					}
				});

			}).on("error", (err) => {
				console.log("Error: " + err.message);
			}).end();
		});
	}

	static updateAccount(token: string, score: number) {
		const req = (API_SSL ? https : http).request({
			host: API_HOST,
			port: API_PORT,
			path: "/updateAccount",
			method: 'POST',
			headers: {
				'Authorization': `${token}`,
				'Content-Type': 'application/json',
			},
		});


		req.on("error", (err) => {
			console.log("Error: " + err.message);
			logger.error('Error logging account: ' + err.message);
		});

		req.write(JSON.stringify({
			score,
		}))

		req.end();
	}

	static sendServerInfo(payload: ServerPayload) {
		return new Promise((resolve, reject) => {
			let req = (API_SSL ? https : http).request({
				host: API_HOST,
				port: API_PORT,
				path: "/updateServer",
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `${API_PASSWORD}`,
				}
			}, (resp) => {
				let data = '';

				// A chunk of data has been received.
				resp.on('data', (chunk) => {
					data += chunk;
				});

				// The whole response has been received. Print out the result.
				resp.on('end', () => {
					if (resp.statusCode !== 200) {
						logger.error("error updating api: " + data);
					}
				});

			})

			req.write(JSON.stringify(payload))

			req.on("error", (err) => {
				console.log("Error: " + err.message);
			});


			req.end();
		});
	}
}