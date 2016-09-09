'use strict';

const express = require('express');
const passport = require('passport');

var router = express.Router();

const jwt = require('jsonwebtoken');
const config = require('../../config');

function createJWT(payload) {
    const options = {
        expiresIn: "30d"
    };
    // replace 'development' with process ENV.
    return jwt.sign(payload, config.jwt.secret, options);
}

function createUserJWT(user) {
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role
    };
    return createJWT(payload);
}

router.get('/', passport.authenticate('basic', {
    session: false
}), function (req, res) {
    const token = createUserJWT(req.user);
    if (token) {
        res.status(200).json({
            token
        }); // This is for development. We will probably want to return as a cookie.
    } else {
        console.log("Error producing JWT: ", token);
        res.status(400);
    }
});

module.exports = router;