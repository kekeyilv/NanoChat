const express = require('express');
const router = express.Router();
const account = require(process.env.ACCOUNTPATH || '../account.json');

/* GET home page. */
router.get('/', function (req, res, next) {
    if (req.cookies["ID"]) {
        let id = JSON.parse(req.cookies["ID"])
        if (account.find(value => {
            return value["id"] === id[0] && value["name"] === id[1];
        })) {
            res.render('index', {title: 'NanoChat'});
            return;
        }
    }
    res.redirect("/login");
});

module.exports = router;
