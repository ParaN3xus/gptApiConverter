const http = require("http");
const https = require("https");
const { buffer } = require("stream/consumers");

function handleRequest(req, res) {
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

    // get post data
    let postbody = [];
    req.on("data", chunk => {
        postbody.push(chunk);
    })
    req.on('end', () => {
        let postbodyBuffer = Buffer.concat(postbody);
        let postbodyJson = JSON.parse(postbodyBuffer.toString());

        // convert
        if (req.url == "/v1/completions") {
            postbodyJson = convertPostbody(postbodyJson);
            postbodyBuffer = Buffer.from(JSON.stringify(postbodyJson));
            options.path = "/v1/chat/completions";
        }

        // send request
        let request = https.request(options, (response) => {
            // response received
            let responsebody = [];
            response.on('data', (chunk) => {
                responsebody.push(chunk);
            });
            
            response.on("end", () => {
                let responsebodyBuffer = Buffer.concat(responsebody);
                // convert
                if (req.url == "/v1/completions") {
                    let responsebodyJson = convertResponsebody(responsebodyBuffer);
                    responsebodyBuffer = Buffer.from(JSON.stringify(responsebodyJson));
                }
                // send response
                res.end(responsebodyBuffer);
            });
        });
        
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

const server = http.createServer();
server.on('request', handleRequest);
server.listen(3000, () => {
    console.log("running");
});
