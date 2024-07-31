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
                return Response.json({ team });
            }
            // if (url.pathname === "/teamdata") {
            //     const team = await req.text()
            //     console.log(`from team ${team}`)
            //     readJSON("teams.json", teams => {
            //         return Response.json(teams[team] || {})
            //     })
            // }
            if (url.pathname === "/claim") {
                const data = await req.text().then(text => JSON.parse(text))
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