'use strict';

const SPromise = require('./promise');

const statusCodeMap = {
    surveyPublishedToDraftUpdate: 409,
    surveyDraftToRetiredUpdate: 403,
    surveyRetiredStatusUpdate: 409,
};

class RRError extends Error {
    constructor(code, ...params) {
        super(code);
        this.code = code;
        this.params = params;
        this.statusCode = statusCodeMap[code] || null;
    }

    getMessage(i18n) {
        const i18nParams = this.params.reduce((r, param, index) => {
            r[`$${index}`] = param;
            return r;
        }, {});
        return i18n.t([this.code, 'unknown'], i18nParams);
    }

    static reject(code, ...params) {
        const err = new RRError(code, ...params);
        return SPromise.reject(err);
    }
}

module.exports = RRError;
