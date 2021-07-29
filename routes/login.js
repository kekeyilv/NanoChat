const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const account = require(process.env.ACCOUNTPATH || '../account.json');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('login', {title: 'NanoChat 登录'});
});

router.post('/login', bodyParser.text(), function (req, res, next) {
    for (let i = 0; i < account.length; i++) {
        if (account[i]["id"] === req.body.trim()) {
            res.cookie("ID", JSON.stringify([account[i]["id"], account[i]["name"]]), {
                sameSite: "strict",
                httpOnly: true
            });
            res.end();
            return;
        }
    }
    res.end("failed");
});

module.exports = router;
