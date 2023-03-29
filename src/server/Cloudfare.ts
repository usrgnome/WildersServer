/*


*/
const http = require("https");

const thisIp = 'nil';

export type CloudFareReqType = {
	CF_ZONE: string,
	CF_EMAIL: string,
	CF_TOKEN: string,
	CF_IDENTIFIER: string,
	CF_PROXIED: boolean;
	SERVER_IP: string;
}

export default class CloudfareAPI {
	static getApi() {
		console.log('getting ip')
		return new Promise((resolve, reject) => {
			const options = {
				"method": "GET",
				"hostname": "ipinfo.io",
			};

			const req = http.request(options, function (res) {
				const chunks = [];

				res.on("data", function (chunk) {
					chunks.push(chunk);
				});

				res.on("end", function () {
					const body = Buffer.concat(chunks);
					resolve(JSON.parse(body.toString()).ip);
				});

				req.on("error", function () {
					reject();
				})
			});

			req.end();
		});
	}
	static createSubdomain(config: CloudFareReqType) {
		return new Promise((resolve, reject) => {
			const options = {
				"method": "POST",
				"hostname": "api.cloudflare.com",
				"port": null,
				"path": `/client/v4/zones/${config.CF_ZONE}/dns_records`,
				"headers": {
					"Content-Type": "application/json",
					"X-Auth-Email": config.CF_EMAIL,
					"Authorization": `Bearer ${config.CF_TOKEN}`
				}
			};

			const req = http.request(options, function (res) {
				const chunks = [];

				res.on("data", function (chunk) {
					chunks.push(chunk);
				});

				res.on("end", function () {
					const body = Buffer.concat(chunks);
					resolve(body.toString());
				});

				req.on("error", function () {
					reject();
				})

			});

			req.write(JSON.stringify({
				content: `${config.SERVER_IP}`,
				name: config.CF_IDENTIFIER,
				proxied: config.CF_PROXIED,
				type: 'A',
				comment: 'Domain verification record',
				tags: [],
				ttl: 3600
			}));
			req.end();
		});
	}
}