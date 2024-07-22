const teams = {}
// const sessions = {}

const pages = {
    "/": "./index.html",
    "/login": "./login.html",
    "/deposit": "./deposit.html",
    "/challenges": "./challenges.html",
    "/steal": "./steal.html",
    "/style": "./style.css",
}

const server = Bun.serve({
    port: 8080,
    async fetch(req) {
        const url = new URL(req.url)
        if (req.method === "POST") {
            if (url.pathname === "/login") {
                const team = await req.text()
                if (!(team in teams)) teams[team] = {
                    coins: 1000,
                    bank: 0,
                }
                console.log(teams)

                return Response.json({ team });
            }
            if (url.pathname === "/data") {
                const team = await req.text()
                return Response.json(teams[team] || {})
            }
        }

        if (req.method === "GET" && url.pathname in pages) {
            return new Response(Bun.file(pages[url.pathname]))
        }

        return new Response("Page not found", { status: 404 });
    }
});
console.log(`Server running on port ${server.port}`)