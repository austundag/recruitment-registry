'use strict';

const _ = require('lodash');

const models = require('../models');
const shared = require('./shared.js');

const profile = models.profile;

exports.createProfile = function (req, res) {
    const language = _.get(req, 'swagger.params.language.value');
    profile.createProfile(req.body, language)
        .then(tokenObj => res.status(201).json(tokenObj))
        .catch(shared.handleError(res));
};

exports.updateProfile = function (req, res) {
    const language = _.get(req, 'swagger.params.language.value');
    profile.updateProfile(req.user.id, req.body, language)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.getProfile = function (req, res) {
    profile.getProfile({ userId: req.user.id })
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};
