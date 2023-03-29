import { App } from 'uWebSockets.js';
import { Client } from './client';
import CloudfareAPI, { CloudFareReqType } from './Cloudfare';
import Server from './server';
import dotenv from "dotenv"

dotenv.config();

/*
    Module for getting the ipv6 of the hosting server, and using it to create a cloudfare DNS route
    ie
    [identifier].domain.io
*/

function assert_envVarIsDefined(name: string) {
    if (!Object.prototype.hasOwnProperty.call(process.env, name)) throw name + ' was not found on process.env!';
}

//process.env.NODE_ENV = 'production';

if (process.env.NODE_ENV === 'production') {

    assert_envVarIsDefined('CF_EMAIL');
    assert_envVarIsDefined('CF_SUB_DOMAIN');
    assert_envVarIsDefined('CF_PROXIED');
    assert_envVarIsDefined('CF_TOKEN');
    assert_envVarIsDefined('CF_ZONE');


    CloudfareAPI.getApi().then(ip6 => {
        console.log("[INFO] Got Server IP: " + ip6);

        console.log(process.env.CF_ZONE, process.env.CF_SUB_DOMAIN)
        const config: CloudFareReqType = {
            CF_EMAIL: process.env.CF_EMAIL,
            CF_IDENTIFIER: process.env.CF_SUB_DOMAIN,
            CF_PROXIED: process.env.CF_PROXIED !== 'nil',
            CF_TOKEN: process.env.CF_TOKEN,
            CF_ZONE: process.env.CF_ZONE,
            SERVER_IP: ip6 + ''
        }

        CloudfareAPI.createSubdomain(config).then(msg => {
            console.log(msg);
        }).catch(err => {
            console.log('Unable to create cloudfare subdomain!');
        })
    }).catch(err => {
        console.log("[WARNING], unable to get server ip!")
    })
}

const server = new Server();

const port = process.env.LISTEN_PORT;
if (!port) throw new Error("process.env.GAME_SERVER_PORT is not set!")
const WS_PORT = parseInt(port);

App()
    .ws('/*', {
        /* There are many common helper features */
        idleTimeout: 32,
        maxBackpressure: 1024,
        maxPayloadLength: 512,

        /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
        message: (ws, message, isBinary) => {
            /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */

            /* Here we echo the message back, using compression if available */
            if (isBinary && (ws as any).client) {
                ((ws as any).client as Client).processPacket(message);
            }
        },
        open(ws) {
            if (!server.canAddClient()) {
                ws.close();
                return;
            }

            server.addClient(ws);
        },
        close(ws, code, message) {
            if ((ws as any).client) {
                server.removeClient((ws as any).client);
                (ws as any).client = null;
            }
        },
    })
    .listen(WS_PORT, (listenSocket) => {
        if (listenSocket) {
            console.log(`Listening to port ${WS_PORT}`);
        }
    });
