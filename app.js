'use strict';
const config = require('./config');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const expressWinston = require('express-winston');
const _ = require('lodash');

const logger = require('./logger');

const app = express();

const jsonParser = bodyParser.json();

const corsOptions = {
    credentials: true,
    origin: config.cors.origin,
    allowedheaders: [
        'Accept',
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-HTTP-Allow-Override'
    ]
};

expressWinston.requestWhitelist.push('body');
expressWinston.responseWhitelist.push('body');

app.use(expressWinston.logger({
    winstonInstance: logger,
    msg: 'HTTP {{req.method}} {{req.url}}',
    expressFormat: true,
    colorize: true
}));

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(jsonParser);
app.enable('trust proxy');
app.use(passport.initialize());

/* jshint unused:vars */
app.use(function (req, res, next) {
    const isAuth = req.url.indexOf('/auth/basic') >= 0;
    const token = _.get(req, 'cookies.rr-jwt-token');
    if (token && !isAuth) {
        _.set(req, 'headers.authorization', 'Bearer ' + token);
    }
    next();
});

module.exports = app;