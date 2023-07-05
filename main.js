const http = require("http");
const https = require("https");
const fs = require("fs");
const yargs = require("yargs/yargs")
const { hideBin } = require("yargs/helpers")
const { Mutex } = require("async-mutex");

function handleRequest(req, res) {
    writeLog(`Received a request to ${req.url}.`);
    let parsedUrl = new URL(argv.target);
    let requestModule = parsedUrl.protocol == "http:" ? http : https
    let options = {
        "method": req.method,
        "hostname": parsedUrl.hostname,
        "port": parsedUrl.port == "" ? (parsedUrl.protocol == "http:" ? "80" : "443") : parsedUrl.port,
        "path": req.url,
        "headers": {
            "Authorization": req.headers.authorization, // fuck you lower case
            "Content-Type": req.headers["content-type"]
        }
    }

    // get post data
    let postbody = [];
    req.on("data", chunk => {
        postbody.push(chunk);
    })
    req.on("end", () => {
        let postbodyBuffer = Buffer.concat(postbody);
        let postbodyJson = JSON.parse(postbodyBuffer.toString());

        // convert
        if (req.url == "/v1/completions") {
            postbodyJson = convertPostbody(postbodyJson);
            postbodyBuffer = Buffer.from(JSON.stringify(postbodyJson));
            options.path = "/v1/chat/completions";
            writeLog("Converted the request.");
        }

        // send request
        let request = requestModule.request(options, (response) => {
            // response received
            let responsebody = [];
            response.on("data", (chunk) => {
                responsebody.push(chunk);
            });

            // handle response
            response.on("end", () => {
                writeLog("Received a response.");

                let responsebodyBuffer = Buffer.concat(responsebody);
                // convert
                if (req.url == "/v1/completions") {
                    let responsebodyJson = convertResponsebody(responsebodyBuffer);
                    responsebodyBuffer = Buffer.from(JSON.stringify(responsebodyJson));
                    writeLog(`Converted the response.`);
                }
                // send response
                res.end(responsebodyBuffer);
                writeLog(`Sent the response as ${req.url}.`);
            });
        });
        writeLog(`Sent the request to ${argv.target}.`);

        request.write(postbodyBuffer);
        request.end();
    });
}

function convertPostbody(postbodyJson) {
    let newPostbodyJson = {
        "model": "gpt-3.5-turbo"/*postbodyJson.model*/,
        "messages": [
            {
                "role": "user",
                "content": postbodyJson.prompt
            }
        ]
    };
    return newPostbodyJson;
}

function convertResponsebody(responsebodyBuffer) {
    let responsebodyJson = JSON.parse(responsebodyBuffer.toString());
    let newResponsebodyJson = {
        "id": responsebodyJson.id,
        "object": "text_completion",
        "created": responsebodyJson.created,
        "model": responsebodyJson.model,
        "choices": [
            {
                "text": responsebodyJson.choices[0].message.content,
                "index": 0,
                "logprobs": null,
                "finish_reason": responsebodyJson.choices[0].finish_reason
            }
        ],
        "usage": {
            "prompt_tokens": responsebodyJson.usage.prompt_tokens,
            "completion_tokens": responsebodyJson.usage.completion_tokens,
            "total_tokens": responsebodyJson.usage.total_tokens
        }
    };
    return newResponsebodyJson;
}

function writeLog(message) {
    let date = (new Date()).toISOString();
    let logStr = `[${date}] ${message}`;
    if (argv.log == "") {
        console.log(logStr);
    }
    else {
        logMutex.acquire().then((release) => {
            try {
                fs.appendFileSync(argv.log, logStr + '\n', "utf8");
            } catch (error) {
                writeLog(`Error adding line to file: ${error}`);
            } finally {
                release();
            }
        });
    }
}

const logMutex = new Mutex();
const server = http.createServer();
const argv = yargs(hideBin(process.argv))
    .option("port", {
        alias: "p",
        type: "int",
        default: 23345,
        description: "Port to bind on"
    })
    .option("target", {
        alias: "t",
        type: "string",
        default: "https://ai.fakeopen.com",
        description: "Destination server url for forwarding"
    })
    .option("log", {
        alias: "l",
        type: "string",
        default: "",
        description: "Path of log file, blank for console"
    })
    .parse();

server.on("request", handleRequest);
server.listen(argv.port, () => {
    writeLog(`server running on port ${argv.port}.`);
});
