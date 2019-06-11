import deepmerge from "deepmerge";
import fs from "fs-extra";
import meow from "meow";
import { BlipConfigurator, BlipConfig } from "./config";
import blip from ".";
import log from "./log";

const meowFlags = {
    configPath: {
        type: 'string',
        alias: 'c'
    },
    host: {
        type: 'string',
        alias: 'h'
    },
    port: {
        type: 'string',
        alias: 'p'
    },
    secure: {
        type: 'boolean',
        alias: 'c'
    },
    psk: {
        type: 'string',
        alias: 'k'
    },
    usePsk: {
        type: 'boolean',
        alias: 'j'
    },
    useTokens: {
        type: 'boolean',
        alias: 't'
    },
    sslCertPath: {
        type: 'string'
    },
    sslKeyPath: {
        type: 'string'
    },
    sslCaPath: {
        type: 'string'
    },
    write: {
        type: 'boolean',
        alias: 'w'
    }
}

type FlagType = {
    [x in keyof typeof meowFlags]: string | boolean | number | undefined;
}

const flags: FlagType = meow(`
Usage
  $ blip

Runs or configures a blip server.

Options
  --rainbow, -r     Include a rainbow
  --config-path, -c  blip.json path, optional
  --host, -h        Set the host
  --port, -p        Set the port
  --secure, -s      Enable crypto
  --psk, -k         Set the pre-shared key
  --use-psk, -j     Whether to use psk authentication
  --use-tokens, -t  Whether to use token authentication
  --ssl-cert-path   Path to cert file
  --ssl-key-path    Path to keyfile
  --ssl-ca-path     Path to CA file
  --write, -w       Whether to write this to the config file
  --server, -n      Whether to run a server

Examples
  $ blip --server
  info: server is listening on port 6208
`, {
        flags: {
            configPath: {
                type: 'string',
                alias: 'c'
            },
            host: {
                type: 'string',
                alias: 'h'
            },
            port: {
                type: 'string',
                alias: 'p'
            },
            secure: {
                type: 'boolean',
                alias: 's'
            },
            psk: {
                type: 'string',
                alias: 'k'
            },
            usePsk: {
                type: 'boolean',
                alias: 'j'
            },
            useTokens: {
                type: 'boolean',
                alias: 't'
            },
            sslCertPath: {
                type: 'string'
            },
            sslKeyPath: {
                type: 'string'
            },
            sslCaPath: {
                type: 'string'
            },
            write: {
                type: 'boolean',
                alias: 'w'
            },
            server: {
                type: 'boolean',
                alias: 'n'
            }
        },
        inferType: true
    }).flags as any;

let blipConfig: BlipConfig<boolean> = {
    mode: "server",
    host: flags.host as string,
    port: flags.port as number,
    secure: flags.secure as boolean,
    psk: flags.psk as string,
    server: {
        pskEnabled: flags.usePsk as boolean,
        tokenEnabled: flags.useTokens as boolean,
        secure: {
            certPath: flags.sslCertPath as string,
            keyPath: flags.sslKeyPath as string,
            caPath: flags.sslCaPath as string
        }
    }
}

if (flags.configPath) {
    BlipConfigurator.BLIP_CONFIG_PATH = flags.configPath as string;
}
if (fs.pathExistsSync(BlipConfigurator.BLIP_CONFIG_PATH)) {
    const existingConfig = fs.readJSONSync(BlipConfigurator.BLIP_CONFIG_PATH);
    console.log(existingConfig);

    const clean: <T extends {[key: string]: any}>(obj: T) => T = (obj) =>
        Object.keys(obj)
            .filter(k => obj[k] !== null && obj[k] !== undefined)  // Remove undef. and null.
            .reduce((newObj, k) =>
                typeof obj[k] === 'object' ?
                    Object.assign(newObj, { [k]: clean(obj[k]) }) :  // Recurse.
                    Object.assign(newObj, { [k]: obj[k] }),  // Copy value.
                {}) as any;

    blipConfig = deepmerge(clean(existingConfig), clean(blipConfig));
}
BlipConfigurator.readonly = !flags.write;

blip(blipConfig).then(() => {
    log.debug(`server running on ${blipConfig.host}:${blipConfig.port}`);
});