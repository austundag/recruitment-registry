'use strict';

const i18next = require('i18next');
const Backend = require('i18next-node-fs-backend');
const middleware = require('i18next-express-middleware');

const logger = require('./logger');

const loggerPlugin = {
    type: 'logger',
    log(args) {
        logger.log('debug', args);
    },
    warn(args) {
        logger.log('warn', args);
    },
    error(args) {
        logger.log('error', args);
    },
};

i18next.use(Backend).use(middleware.LanguageDetector).use(loggerPlugin).init({
    initImmediate: false,
    fallbackLng: 'en',
    backend: {
        loadPath: 'locales/{{lng}}_{{ns}}.json',
    },
    detection: {
        order: ['querystring', 'header'],
        lookupQuerystring: 'language',
        lookupHeader: 'accept-language',
        caches: false,
    },
});

module.exports = i18next;
