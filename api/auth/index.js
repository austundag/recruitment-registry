'use strict';

const passport = require('passport');

const BasicStrategy = require('passport-http').BasicStrategy;
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

const config = require('../config');
const db = require('../db');

const User = db.User;

const basicStrategy = function(username, password, done) {
    User.findOne({
        where: {
            username
        }
    }).then(user => {
        if (user) {
            user.authenticate(password, function(err, result) {
                if (err) {
                    return done(err)
                }
                if (result) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        } else {
            return done(null, false);
        }
    });
};

const jwtStrategy = function(jwt_payload, done) {
    User.findOne({
        where: {
            id: jwt_payload.id,
            username: jwt_payload.username
        }
    }).then(user => {
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    });
};

exports.init = function() {
    const JWTOptions = {
        jwtFromRequest: ExtractJWT.fromAuthHeaderWithScheme('Bearer'),
        secretOrKey: config.jwt.secret
    };
    passport.use(new BasicStrategy(basicStrategy));
    passport.use(new JWTStrategy(JWTOptions, jwtStrategy));
};