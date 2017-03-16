'use strict';

const passport = require('passport');
const passportHttp = require('passport-http');

const tokener = require('../lib/tokener');
const jsutil = require('../lib/jsutil');

const basicStrategy = function (req, username, password, done) {
    req.models.auth.authenticateUser(username, password)
        .then(user => done(null, user))
        .catch(err => done(err));
};

passport.use(new passportHttp.BasicStrategy({ passReqToCallback: true }, basicStrategy));

const authenticate = passport.authenticate('basic', {
    session: false,
    failWithError: true,
});

exports.authenticateBasic = function (req, res) {
    authenticate(req, res, (err) => {
        if (err) {
            err = jsutil.errToJSON(err);
            return res.status(401).json(err);
        }
        const token = tokener.createJWT(req.user);
        res.cookie('rr-jwt-token', token);
        return res.status(200).json({});
    });
};
