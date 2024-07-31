const pages = {
    "/": "./index.html",
    "/login": "./login.html",
    "/deposit": "./deposit.html",
    "/challenges": "./challenges.html",
    "/steal": "./steal.html",
    "/style": "./style.css",
    "/challenges.json": "./challenges.json",
    "/teams.json": "./teams.json",
}

const server = Bun.serve({
    port: 8080,
    async fetch(req) {
        const url = new URL(req.url)
        if (req.method === "POST") {
            console.log(`Receiving POST request to ${url.pathname}`)
            if (url.pathname === "/login") {
                const team = await req.text()
                console.log(`Adding ${team} to database`)
                editJSON("teams.json", teams => {
                    if (!(team in teams)) {
                        teams[team] = {
                            coins: 1000,
                            bank: 0,
                        }
                    }
                    console.log(teams)
                    return teams
                })
                return Response.json({ team }, { status: 201 });
            }
            if (url.pathname === "/deposit") {
                const data = await req.text().then(JSON.parse)
                let status, teamData
                const teams = await Bun.file("teams.json").json()
                if (data.team in teams) {
                    teamData = teams[data.team]
                    if (teamData.coins - data.amount >= 0 && teamData.bank + data.amount >= 0) {
                        status = 200
                        teamData.coins -= data.amount
                        teamData.bank += data.amount
                    } else status = 400
                    teams[data.team] = teamData
                } else status = 401
                Bun.write("teams.json", JSON.stringify(teams))
                return Response.json(teamData, { status });
            }
            if (url.pathname === "/claim") {
                const data = await req.text().then(JSON.parse)
                readJSON("teams.json", teams => {
                    if (data.team in teams) {
                        readJSON("challenges.json", challenges => {
                            // Close the challenge
                            const challenge = challenges.locational.concat(challenges.nonlocational)
                                .filter(v => v.title === data.challenge)[0]
                            challenge.open = false
                            Bun.write("challenges.json", JSON.stringify(challenges))

                            // Update team coins
                            editJSON("teams.json", teams => {
                                teams[data.team].coins += challenge.reward
                                return teams
                            })
                        })
                        return new Response("Claim succesful!", { status: 200 })
                    } else {
                        return new Response("Team invalid, redirecting...", { status: 401 })
                    }
                })
            }
        }

        if (req.method === "GET" && url.pathname in pages) {
            console.log(`Serving ${url.pathname}`)
            return new Response(Bun.file(pages[url.pathname]))
        }

        return new Response("Page not found", { status: 404 });
    }
})
console.log(`Server running on port ${server.port}`)

async function readJSON(path, then) { Bun.file(path).json().then(then) }
async function editJSON(path, edit) { Bun.file(path).json().then(json => { Bun.write(path, JSON.stringify(edit(json))) }) }