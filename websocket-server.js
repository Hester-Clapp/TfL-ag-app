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
}

const actions = {
    login: async (ws, data) => {
        const teams = await open("teams")
        if (!(data.team in teams)) {
            console.log(`Adding ${data.team} to database`)
            teams[data.team] = {
                coins: 1000,
                bank: 0,
            }
            write("teams", teams)
            ws.publish("log", `${data.team} has joined`)
        }
        ws.send(data.team)
        // return Response.json({ team }, { status: 201 });
    },
    deposit: async (ws, data) => {
        const teams = await open("teams")
        let status, teamData
        if (data.team in teams) {
            teamData = teams[data.team]
            if (teamData.coins - data.amount >= 0 && teamData.bank + data.amount >= 0) {
                status = 200
                teamData.coins -= data.amount
                teamData.bank += data.amount
            } else status = 400
            teams[data.team] = teamData
        } else status = 401
        write("teams", teams)
        ws.publish("log", `${data.team} deposited money at the bank`)
        ws.send(JSON.stringify(teamData))
        // return Response.json(teamData, { status })
    },
    claim: async (ws, data) => {
        const teams = await open("teams")
        const challenges = await open("challenges")
        if (data.team in teams) {

            // Close the challenge
            const challenge = challenges.locational.concat(challenges.nonlocational)
                .filter(v => v.title === data.challenge)[0]
            challenge.open = false
            write("challenges", challenges)

            // Update team coins
            teams[data.team].coins += challenge.reward
            write("teams", teams)
            ws.publish("log", `${data.team} claimed the challenge '${data.challenge}'`)
            return new Response("Claim succesful!", { status: 200 })
        } else {
            return new Response("Team invalid, redirecting...", { status: 401 })
        }
    },
    purchase_token: async (ws, data) => {
        const teams = await open("teams")
        const steals = await open("steals")
        if (data.team in teams) {
            const steal = steals.filter(v => v.title === data.steal)[0]

            // Update team coins
            teams[data.team].coins -= steal.cost
            write("teams", teams)

            // Change the owner of the steal token
            steal.owner = data.team
            write("steals", steals)
            ws.publish("log", `${data.team} purchased the steal token '${data.steal}'`)
            return new Response("Purchase succesful!", { status: 200 })
        } else {
            return new Response("Team invalid, redirecting...", { status: 401 })
        }
    }
}

const server = Bun.serve({
    port: 8080,
    fetch(req, server) {
        const url = new URL(req.url)
        // let cookies = (req.headers.get('cookie') || '').split(';')
        // let username = 'Unknown'
        // for (let pair of cookies) {
        //     let [key, value] = pair.split('=')
        //     if (key === 'username') username = value
        // }
        if (req.method === "GET" && url.pathname in pages) {
            console.log(`Serving ${url.pathname}`)
            return new Response(Bun.file(pages[url.pathname]))
        }
        if (server.upgrade(req)) return
        return new Response("404 - Page not found", { status: 404 })
    },
    websocket: {
        open(ws) {
            ws.subscribe('log')
            ws.subscribe('steals')
        },
        message(ws, data) {
            const json = JSON.parse(data)
            actions[json.actions](ws, json.data)
        },
        close(ws) {
            ws.unsubscribe('log')
            ws.unsubscribe('steals')
        }
    }

    /*
    return new Response("Page not found", { status: 404 });*/
})
console.log(`Server running on port ${server.port}`)

function open(path) { return Bun.file(`./${path}.json`).json() }
function write(path, data) { Bun.write(`./${path}.json`, JSON.stringify(data)) }
function logEvent(event) { open("log").then(log => [`${new Date().toTimeString().slice(0, 5)}: ${event}`].concat(log)).then(log => write("log", log)) }