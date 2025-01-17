'use strict';

const shared = require('./shared.js');

exports.listDemographics = function listDemographics(req, res) {
    req.models.demographics.listDemographics()
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(req, res));
};
