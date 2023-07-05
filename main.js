const http = require("http");
const https = require("https");
const { buffer } = require("stream/consumers");
const server = http.createServer();

server.on('request', (req, res) => {
    // request received
    let options = {
        "method": req.method,
        "hostname": "ai.fakeopen.com",
        "port": "443",
        "path": req.url,
        "headers": {
            "Authorization": req.headers.authorization,
            "Content-Type": req.headers["content-type"]
        }
    }
    let postbody = [];
    req.on("data", chunk => {
        postbody.push(chunk);
    })
    req.on('end', () => {
        let postbodyBuffer = Buffer.concat(postbody);
        let postbodyJson = JSON.parse(postbodyBuffer.toString());

        if (req.url == "/v1/completions") {
            let newPostbodyJson = {
                "model": "gpt-3.5-turbo"/*postbodyJson.model*/,
                "messages": [
                    {
                        "role": "user",
                        "content": postbodyJson.prompt
                    }
                ]
            };
            postbodyBuffer = Buffer.from(JSON.stringify(newPostbodyJson));
            options.path = "/v1/chat/completions";
        }

        let responsebody = []
        // send request
        let request = https.request(options, (response) => {
            // response received
            response.on('data', (chunk) => {
                responsebody.push(chunk)
            })
            // send response
            response.on("end", () => {
                responsebodyBuffer = Buffer.concat(responsebody)

                if (req.url == "/v1/completions") {
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
                    responsebodyBuffer = Buffer.from(JSON.stringify(newResponsebodyJson));
                }

                res.end(responsebodyBuffer);
            })
        })
        // send request
        request.write(postbodyBuffer)
        request.end();

    })
})
server.listen(3000, () => {
    console.log("running");
})