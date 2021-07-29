const fs = require("fs");
const path = require("path");
const express = require('express');
const bodyParser = require("body-parser");
const multer = require("multer");
const account = require(process.env.ACCOUNTPATH || '../account.json');
const router = express.Router();
let dataDir = process.env.DATAPATH || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, (err) => {
        if (err) console.log(err);
    });
}
let dataPath = path.join(dataDir, "message.json");
let messages = {};
const maxRes = process.env.MAXCONN || 20;
let resArray = [];
let fileExpires = process.env.FILEEXPR || 7 * 24 * 60 * 60;
if (fs.existsSync(dataPath)) readMessage();
else writeMessage();

function notifyMessages(className) {
    resArray.filter(item => {
        return item["class"] === className;
    }).forEach((item) => {
        try {
            item["res"].write("data:" + JSON.stringify({"type": "msg", "content": messages[item["class"]]}) + "\n\n");
        } catch (error) {
            console.error(error);
        }
    });
}

function notifyList(className) {
    let list = [];
    resArray.filter(item => {
        return item["class"] === className;
    }).forEach((item) => {
        if (!list.find((i) => i === item["name"]))
            list.push(item["name"]);
    });
    resArray.filter(item => {
        return item["class"] === className;
    }).forEach((item) => {
        try {
            item["res"].write("data:" + JSON.stringify({"type": "list", "content": list}) + "\n\n");
        } catch (error) {
            console.error(error);
        }
    });
}

function readMessage() {
    try {
        let str = fs.readFileSync(dataPath, {encoding: "utf-8"});
        if (str) messages = JSON.parse(str);
    } catch (error) {
        console.log(error);
    }
}

function writeMessage() {
    fs.open(dataPath, "w+", (err, file) => {
        if (err) {
            console.error(err);
            return;
        }
        fs.write(file, JSON.stringify(messages), (err) => {
            if (err) console.error(err);
            fs.closeSync(file);
        });
    });
}

/* GET messages. */
router.get('/', function (req, res, next) {
    if (req.cookies["ID"]) {
        let id = JSON.parse(req.cookies["ID"])
        let item = account.find(value => {
            return value["id"] === id[0] && value["name"] === id[1];
        })
        if (item) {
            resArray.push({class: item["class"], name: item["name"], res: res});
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            });
            if (!messages[item["class"]]) messages[item["class"]] = [];
            res.write("data:" + JSON.stringify({"type": "msg", "content": messages[item["class"]]}) + "\n\n");
            res.socket.on("close", () => {
                resArray.splice(resArray.findIndex(item => item.res === res), 1);
                notifyList(item["class"]);
            });
            notifyList(item["class"]);
            if (resArray.length > maxRes) resArray.shift().end();
            return;
        }
    }
    res.status(403);
    res.end();
});

router.post('/', bodyParser.text(), function (req, res, next) {
    if (req.cookies["ID"]) {
        let id = JSON.parse(req.cookies["ID"])
        let item = account.find(value => {
            return value["id"] === id[0] && value["name"] === id[1];
        })
        if (item) {
            let content = JSON.parse(req.body);
            if (content["type"] === "text" || content["type"] === "image" || content["type"] === "file") {
                messages[item["class"]].push({
                    sender: item["name"],
                    content: content["content"],
                    time: new Date().getTime(),
                    address: req.ip.match(/\d+\.\d+\.\d+\.\d+/)[0],
                    type: content["type"]
                });
            } else if (content["type"] === "undo") {
                if (messages[item["class"]][content["content"]]["sender"] === id[1]) {
                    messages[item["class"]][content["content"]]["type"] = "undo";
                }
            }
            //res.end(JSON.stringify(messageArray));
            res.end();
            writeMessage();
            notifyMessages(item["class"]);
            return;
        }
    }
    res.status(403);
    res.end();
});

let upload = multer({
    dest: path.join(dataDir, "files"),
    limits: {fileSize: (process.env.MAXUPLOAD || 20) * 1024 * 1024}
});
router.post("/file", upload.single("file"), function (req, res) {
    let id = JSON.parse(req.cookies["ID"])
    let item = account.find(value => {
        return value["id"] === id[0] && value["name"] === id[1];
    })
    if (item) {
        res.end(path.basename(req.file.path));
        return;
    }
    res.status(403);
    res.end();
});

router.get("/file", function (req, res) {
    let id = JSON.parse(req.cookies["ID"])
    let item = account.find(value => {
        return value["id"] === id[0] && value["name"] === id[1];
    })
    if (item) {
        res.header("Cache-Control", "max-age=1800");
        res.download(path.join(dataDir, "files", req.query["url"]), req.query["name"]);
        return;
    }
    res.status(403);
    res.end();
});

setInterval(() => {
    //清理文件
    let filesPath = path.join(dataDir, "files");
    fs.readdir(filesPath, (err, files) => {
        if (err) {
            console.error(err);
            return;
        }
        files.forEach(file =>
            fs.stat(path.join(filesPath, file), (err, stat) => {
                if (err) {
                    console.error(err);
                    return;
                }
                if (stat.isFile())
                    if (new Date().getTime() - stat.mtime.getTime() > fileExpires * 1000) {
                        console.log(path.join(filesPath, file), "was removed");
                        fs.rm(path.join(filesPath, file), () => {
                        });
                    }
            })
        );
    })
}, fileExpires * 1000 / 60);

module.exports = router;