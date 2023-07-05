# gptApiConverter

A proxy server to convert `/completions` API to `/chat/completions` API.

## purpose

Free GPT API services like `https://ai.fakeopen.com/` or ChatGPT-to-API don't support ~~legacy ~~ API like `/completions`, so you can't just replace the host of OpenAI and use GPT-based softwares without modifying other code. This project build a proxy server to convert `/completions` API to `/chat/completions` API so you can easily replace backend of those softwares and use them for free.

## usage

```sh
$ node main.js -h
```
```
Options:
  -h, --help     Show help                                             [boolean]
  -v, --version  Show version number                                   [boolean]
  -p, --port     Port to bind on                                [default: 23345]
  -t, --target   Destination server url for forwarding
                                   [string] [default: "https://ai.fakeopen.com"]
  -l, --log      Path of log file, blank for console      [string] [default: ""]
```

## Plan

* [ ] Https support: Currently using nginx.

* [ ] Fix randomly stuttering: Difficult to find out why or debug... I need your help.

* [ ] Custom model mapping: There's currently no such requirement.
