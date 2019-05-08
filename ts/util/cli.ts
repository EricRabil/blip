import repl from "repl";

export function startCLI(context: {[key: string]: any}) {
    const instance = repl.start();
    for (let key in context) instance.context[key] = context[key];
}