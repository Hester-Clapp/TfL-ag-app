const pages = {
    "/": "./index.html",
    "/login": "./login.html",
    "/deposit": "./deposit.html",
    "/challenges": "./challenges.html",
    "/steal": "./steal.html",
    "/shop": "./stealshop.html",
    "/style": "./style.css",
    "/log.json": "./log.json",
    "/teams.json": "./teams.json",
    "/challenges.json": "./challenges.json",
    "/steals.json": "./steals.json",
};


// HTTP server setup
const server = Bun.serve({
    port: 8080,
    async fetch(req) {
        const url = new URL(req.url);

        if (req.method === "GET" && url.pathname in pages) {
            console.log(`Serving ${url.pathname}`);
            return new Response(Bun.file(pages[url.pathname]));
        }

        return new Response("Page not found", { status: 404 });
    },
});

// Create a WebSocket server
// const wss = new WebSocket.Server({ port: 8081 });
const wss = Bun.serve({
    fetch(req, server) {
        if (server.upgrade(req)) return
        return new Response("Could not establish websocket connection.")
    },
    websocket: {

        // WebSocket connection handling
        open(ws) {
            console.log("New WebSocket client connected");
        },

        async message(ws, message) {
            const data = JSON.parse(message);
            // Handle incoming messages based on the action type
            if (data.action === "login") {
                await handleLogin(data.team, ws);
            } else if (data.action === "deposit") {
                await handleDeposit(data, ws);
            } else if (data.action === "claim") {
                await handleClaim(data, ws);
            } else if (data.action === "purchase_token") {
                await handlePurchaseToken(data, ws);
            }
        },

        close(ws) {
            console.log("WebSocket client disconnected");
        }


    }
})


console.log(`HTTP server running on port ${server.port}`);
console.log(`WebSocket server running on port 8081`);

async function handleLogin(team, ws) {
    console.log(`Receiving login for team: ${team}`);
    const teams = await open("teams");

    if (!(team in teams)) {
        console.log(`Adding ${team} to database`);
        teams[team] = { coins: 1000, bank: 0 };
        await write("teams", teams);
        logEvent(`${team} has joined`);
        ws.send(JSON.stringify({ status: 201, team }));
    } else {
        ws.send(JSON.stringify({ status: 409, message: "Team already exists" }));
    }
}

async function handleDeposit(data, ws) {
    const teams = await open("teams");
    let status, teamData;

    if (data.team in teams) {
        teamData = teams[data.team];
        if (teamData.coins - data.amount >= 0 && teamData.bank + data.amount >= 0) {
            status = 200;
            teamData.coins -= data.amount;
            teamData.bank += data.amount;
        } else {
            status = 400;
        }
        teams[data.team] = teamData;
    } else {
        status = 401;
    }

    await write("teams", teams);
    logEvent(`${data.team} deposited money at the bank`);
    ws.send(JSON.stringify({ status, teamData }));
}

async function handleClaim(data, ws) {
    const teams = await open("teams");
    const challenges = await open("challenges");

    if (data.team in teams) {
        const challenge = challenges.local.concat(challenges.nonlocal).filter(v => v.title === data.challenge)[0];
        challenge.open = false;
        await write("challenges", challenges);
        teams[data.team].coins += challenge.reward;
        await write("teams", teams);
        logEvent(`${data.team} claimed the challenge '${data.challenge}'`);
        ws.send(JSON.stringify({ status: 200, message: "Claim successful!" }));
    } else {
        ws.send(JSON.stringify({ status: 401, message: "Team invalid, redirecting..." }));
    }
}

async function handlePurchaseToken(data, ws) {
    const teams = await open("teams");
    const steals = await open("steals");

    if (data.team in teams) {
        const steal = steals.find(v => v.title === data.steal);
        teams[data.team].coins -= steal.cost;
        await write("teams", teams);
        steal.owner = data.team;
        await write("steals", steals);
        logEvent(`${data.team} purchased the steal token '${data.steal}'`);
        ws.send(JSON.stringify({ status: 200, message: "Purchase successful!" }));
    } else {
        ws.send(JSON.stringify({ status: 401, message: "Team invalid, redirecting..." }));
    }
}

async function open(path) {
    return Bun.file(`./${path}.json`).json();
}

async function write(path, data) {
    await Bun.write(`./${path}.json`, JSON.stringify(data));
}

async function logEvent(event) {
    const log = await open("log");
    const newLog = [`${new Date().toTimeString().slice(0, 5)}: ${event}`].concat(log);
    await write("log", newLog);
}

